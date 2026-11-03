import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import GateMovement from "../models/GateMovement.js";
import QRPass from "../models/QRPass.js";
import Student from "../models/Student.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import Notification from "../models/Notification.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

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

  const now = new Date();
  if (pass.status === "revoked") {
    return res.status(400).json({ valid: false, message: "This pass has been revoked." });
  }
  if (pass.status === "used") {
    return res.status(400).json({ valid: false, message: "This single-use pass has already been used." });
  }
  if (now > new Date(pass.expiresAt)) {
    pass.status = "expired";
    await pass.save();
    return res.status(400).json({ valid: false, message: "This QR Pass has expired." });
  }
  if (now < new Date(pass.validFrom)) {
    return res.status(400).json({ valid: false, message: `This pass is not valid yet (starts at ${new Date(pass.validFrom).toLocaleString()}).` });
  }

  // Find last movement to determine recommended direction
  const lastMovement = await GateMovement.findOne({ student: pass.student._id }).sort({ occurredAt: -1 }).lean();
  const recommendedDirection = lastMovement?.direction === "exit" ? "entry" : "exit";

  res.json({
    valid: true,
    pass,
    student: pass.student,
    recommendedDirection,
    message: "QR Pass verified successfully.",
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
      if (direction === "entry" && passDoc.purpose === "leave") {
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

  // Notify student
  await Notification.create({
    user: student.user,
    title: `Campus ${direction === "entry" ? "Entry" : "Exit"} Recorded`,
    message: `A gate movement of type "${direction.toUpperCase()}" was recorded at ${new Date().toLocaleTimeString()}.`,
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

  const now = new Date();
  const activePass = await QRPass.findOne({
    student: student._id,
    status: "active",
    expiresAt: { $gte: now },
  })
    .select("+token")
    .populate("leaveRequest")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ pass: activePass || null });
}));

export default router;

