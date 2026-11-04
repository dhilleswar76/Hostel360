import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import GateMovement from "../models/GateMovement.js";
import QRPass from "../models/QRPass.js";
import Student from "../models/Student.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import Notification from "../models/Notification.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";
import { format12Hour, format12HourTimeOnly } from "../utils/dateTime.js";

const router = Router();

router.use(authenticate);

router.get("/status", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  let blockIds = null;
  if (req.auth.role === "warden") {
    const blocks = await HostelBlock.find({ warden: req.auth.sub, isActive: true }).select("_id").lean();
    blockIds = blocks.map((b) => b._id);
  }

  const roomFilter = blockIds ? { block: { $in: blockIds } } : {};
  const rooms = await Room.find(roomFilter).select("_id").lean();
  const roomIds = rooms.map((r) => r._id);

  const studentFilter = { status: "active", ...(blockIds ? { room: { $in: roomIds } } : {}) };
  const allStudents = await Student.find(studentFilter)
    .populate("user", "name email phone")
    .populate({ path: "room", populate: { path: "block", select: "name code" } })
    .lean();

  const studentIds = allStudents.map((s) => s._id);

  const latestMovements = await GateMovement.aggregate([
    { $match: { student: { $in: studentIds } } },
    { $sort: { occurredAt: -1 } },
    { $group: { _id: "$student", lastDirection: { $first: "$direction" }, occurredAt: { $first: "$occurredAt" }, recordedBy: { $first: "$recordedBy" } } },
  ]);

  const movementMap = {};
  for (const m of latestMovements) {
    movementMap[String(m._id)] = m;
  }

  const insideStudents = [];
  const outsideStudents = [];

  for (const s of allStudents) {
    const m = movementMap[String(s._id)];
    const isOutside = m?.lastDirection === "exit";
    const studentInfo = {
      ...s,
      lastMovement: m ? { direction: m.lastDirection, time: m.occurredAt } : null,
    };
    if (isOutside) {
      outsideStudents.push(studentInfo);
    } else {
      insideStudents.push(studentInfo);
    }
  }

  res.json({
    totalStudents: allStudents.length,
    insideCount: insideStudents.length,
    outsideCount: outsideStudents.length,
    insideStudents,
    outsideStudents,
  });
}));

router.get("/movements", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "student") {
    const student = await Student.findOne({ user: req.auth.sub }).select("_id");
    if (!student) throw new HttpError(404, "Student profile not found.");
    filter.student = student._id;
  }

  const movements = await GateMovement.find(filter)
    .populate({ path: "student", populate: [{ path: "user", select: "name email phone" }, { path: "room", populate: { path: "block", select: "name code" } }] })
    .populate("recordedBy", "name role")
    .sort({ occurredAt: -1 })
    .limit(100)
    .lean();

  res.json({ data: movements });
}));

router.post("/verify-pass", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) throw new HttpError(400, "QR Pass token is required.");

  const pass = await QRPass.findOne({ token })
    .select("+token")
    .populate({
      path: "student",
      populate: [
        { path: "user", select: "name email phone" },
        { path: "room", populate: { path: "block", select: "name code" } },
      ],
    })
    .populate("leaveRequest");

  if (!pass) {
    return res.status(404).json({ valid: false, message: "Invalid QR Pass token. Not found in system." });
  }

  // Find last movement to determine recommended direction
  const lastMovement = await GateMovement.findOne({ student: pass.student._id }).sort({ occurredAt: -1 }).lean();
  const recommendedDirection = lastMovement?.direction === "exit" ? "entry" : "exit";

  const now = new Date();
  if (pass.status === "revoked") {
    return res.status(400).json({ valid: false, message: "This pass has been revoked by the hostel administration." });
  }

  if (pass.status === "used" && recommendedDirection !== "entry") {
    return res.status(400).json({
      valid: false,
      message: `This single-use pass was already completed on ${format12Hour(pass.usedAt || pass.updatedAt)}.`,
    });
  }

  // Verification for ENTRY (returning student):
  // Never lock a returning resident out of campus. If late, allow entry with late notice.
  let isDelayed = false;
  if (recommendedDirection === "entry") {
    if (now > new Date(pass.expiresAt)) {
      isDelayed = true;
    }
  } else {
    // Verification for EXIT (student departing campus):
    // Allow departure up to 12 hours before scheduled departure on the approved day
    const earlyDepartureBufferMs = 12 * 60 * 60 * 1000;
    const startThreshold = new Date(new Date(pass.validFrom).getTime() - earlyDepartureBufferMs);

    if (now.getTime() < startThreshold.getTime()) {
      return res.status(400).json({
        valid: false,
        message: `This pass is scheduled for ${format12Hour(pass.validFrom)}. Early departure is allowed on the scheduled day.`,
      });
    }

    // Check if expired for departure
    const departureGraceMs = 4 * 60 * 60 * 1000; // 4 hour grace window past scheduled exit
    if (now.getTime() > new Date(pass.expiresAt).getTime() + departureGraceMs) {
      pass.status = "expired";
      await pass.save();
      return res.status(400).json({
        valid: false,
        message: `This pass expired on ${format12Hour(pass.expiresAt)}. Please apply for a fresh leave pass.`,
      });
    }
  }

  res.json({
    valid: true,
    pass,
    student: pass.student,
    recommendedDirection,
    isDelayed,
    message: isDelayed
      ? `QR Pass verified. Resident is returning past scheduled curfew (${format12Hour(pass.expiresAt)}).`
      : "QR Pass verified successfully.",
  });
}));

router.post("/record-movement", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const { studentId, direction, passToken, notes } = req.body || {};
  if (!studentId || !direction) {
    throw new HttpError(400, "Student ID and direction (entry or exit) are required.");
  }
  if (!["entry", "exit"].includes(direction)) {
    throw new HttpError(400, "Direction must be entry or exit.");
  }
  requireObjectId(studentId);

  const student = await Student.findById(studentId);
  if (!student) throw new HttpError(404, "Student not found.");

  let passDoc = null;
  if (passToken) {
    passDoc = await QRPass.findOne({ token: passToken }).select("+token");
    if (passDoc) {
      if (direction === "entry") {
        passDoc.status = "used";
        passDoc.usedAt = new Date();
        await passDoc.save();
      }
    }
  }

  const movement = await GateMovement.create({
    student: student._id,
    qrPass: passDoc ? passDoc._id : undefined,
    direction,
    recordedBy: req.auth.sub,
    occurredAt: new Date(),
    notes: notes ? String(notes).trim() : undefined,
  });

  // Notify student with 12-hour timestamp
  await Notification.create({
    user: student.user,
    title: `Campus ${direction === "entry" ? "Entry" : "Exit"} Recorded`,
    message: `A gate movement of type "${direction.toUpperCase()}" was recorded at ${format12HourTimeOnly(new Date())}.`,
    type: "system",
  }).catch(() => null);

  res.status(201).json({
    message: `Gate ${direction} recorded successfully.`,
    movement,
  });
}));

router.get("/my-pass", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub });
  if (!student) throw new HttpError(404, "Student not found.");

  // Keep pass available for 24 hours past scheduled expiry so returning students can always present it
  const graceWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activePass = await QRPass.findOne({
    student: student._id,
    status: { $in: ["active", "expired"] },
    expiresAt: { $gte: graceWindow },
  })
    .select("+token")
    .populate("leaveRequest")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ pass: activePass || null });
}));

export default router;

