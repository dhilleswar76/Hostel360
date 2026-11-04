import { randomBytes } from "crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/authenticate.js";
import LeaveRequest from "../models/LeaveRequest.js";
import QRPass from "../models/QRPass.js";
import Student from "../models/Student.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import Notification from "../models/Notification.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

async function wardenStudentIds(userId) {
  const blocks = await HostelBlock.find({ warden: userId, isActive: true }).select("_id").lean();
  const rooms = await Room.find({ block: { $in: blocks.map((b) => b._id) } }).select("_id").lean();
  const students = await Student.find({ room: { $in: rooms.map((r) => r._id) } }).select("_id").lean();
  return students.map((s) => s._id);
}

router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "student") {
    const student = await Student.findOne({ user: req.auth.sub }).select("_id");
    if (!student) throw new HttpError(404, "Student profile not found.");
    filter.student = student._id;
  } else if (req.auth.role === "warden") {
    const ids = await wardenStudentIds(req.auth.sub);
    filter.student = { $in: ids };
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.type) {
    filter.leaveType = req.query.type;
  }

  const leaves = await LeaveRequest.find(filter)
    .populate({
      path: "student",
      populate: [
        { path: "user", select: "name email phone" },
        { path: "room", populate: { path: "block", select: "name code" } },
      ],
    })
    .populate("reviewedBy", "name role")
    .sort({ createdAt: -1 })
    .lean();

  const leaveIds = leaves.map((l) => l._id);
  const passes = await QRPass.find({ leaveRequest: { $in: leaveIds } }).select("token status expiresAt validFrom leaveRequest purpose").lean();
  const passMap = {};
  for (const p of passes) {
    passMap[String(p.leaveRequest)] = p;
  }

  const data = leaves.map((l) => ({
    ...l,
    qrPass: passMap[String(l._id)] || null,
  }));

  res.json({ data });
}));

router.post("/", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub });
  if (!student) throw new HttpError(404, "Student profile not found.");

  const { startDate, endDate, reason, leaveType, destination, emergencyContact } = req.body || {};
  if (!startDate || !endDate || !reason) {
    throw new HttpError(400, "Start date, end date, and reason are required.");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpError(400, "Invalid start or end date.");
  }
  if (end < start) {
    throw new HttpError(400, "End date must be on or after start date.");
  }

  const isEmergency = leaveType === "emergency_leave" || /emergency/i.test(reason);

  const leave = await LeaveRequest.create({
    student: student._id,
    startDate: start,
    endDate: end,
    reason: String(reason).trim(),
    leaveType: leaveType || (isEmergency ? "emergency_leave" : "local_outing"),
    destination: destination ? String(destination).trim() : undefined,
    emergencyContact: emergencyContact ? String(emergencyContact).trim() : student.guardianPhone,
    status: "pending",
  });

  res.status(201).json({ message: "Leave application submitted successfully.", leave });
}));

router.patch("/:id/cancel", authorize("student"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const student = await Student.findOne({ user: req.auth.sub }).select("_id");
  if (!student) throw new HttpError(404, "Student not found.");

  const leave = await LeaveRequest.findOne({ _id: req.params.id, student: student._id });
  if (!leave) throw new HttpError(404, "Leave application not found.");
  if (leave.status !== "pending") {
    throw new HttpError(400, "Only pending leave requests can be cancelled.");
  }

  leave.status = "cancelled";
  await leave.save();

  res.json({ message: "Leave application cancelled.", leave });
}));

router.patch("/:id/review", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const leave = await LeaveRequest.findById(req.params.id).populate("student");
  if (!leave) throw new HttpError(404, "Leave application not found.");

  if (req.auth.role === "warden") {
    const ids = await wardenStudentIds(req.auth.sub);
    if (!ids.some((id) => id.equals(leave.student._id))) {
      throw new HttpError(403, "This student is outside your assigned blocks.");
    }
  }

  const { status, reviewNote } = req.body || {};
  if (!["approved", "rejected"].includes(status)) {
    throw new HttpError(400, "Status must be approved or rejected.");
  }

  leave.status = status;
  leave.reviewedBy = req.auth.sub;
  leave.reviewedAt = new Date();
  leave.reviewNote = reviewNote ? String(reviewNote).trim() : undefined;
  await leave.save();

  let qrPass = null;
  if (status === "approved") {
    // Generate secure unpredictable token
    const token = `PASS-${Date.now()}-${randomBytes(16).toString("hex").toUpperCase()}`;
    // Pass is immediately valid upon approval or from start date, whichever is earlier
    const passStartTime = new Date(Math.min(Date.now(), new Date(leave.startDate).getTime()));
    qrPass = await QRPass.create({
      student: leave.student._id,
      token,
      purpose: leave.leaveType === "local_outing" ? "temporary_exit" : "leave",
      validFrom: passStartTime,
      expiresAt: leave.endDate,
      status: "active",
      leaveRequest: leave._id,
      issuedBy: req.auth.sub,
    });
  }

  // Send notification to student
  const studentUser = await Student.findById(leave.student._id).select("user");
  if (studentUser) {
    await Notification.create({
      user: studentUser.user,
      title: `Leave Application ${status === "approved" ? "Approved" : "Rejected"}`,
      message: `Your ${leave.leaveType.replace("_", " ")} request has been ${status}. Remarks: ${reviewNote || "None"}.`,
      type: "leave",
      relatedModel: "LeaveRequest",
      relatedId: leave._id,
    }).catch(() => null);
  }

  res.json({
    message: `Leave application ${status}.`,
    leave,
    qrPass,
  });
}));

export default router;

