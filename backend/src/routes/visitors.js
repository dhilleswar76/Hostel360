import { randomBytes } from "crypto";
import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Visitor from "../models/Visitor.js";
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

  const visitors = await Visitor.find(filter)
    .populate({
      path: "student",
      populate: [
        { path: "user", select: "name email phone" },
        { path: "room", populate: { path: "block", select: "name code" } },
      ],
    })
    .populate("recordedBy", "name role")
    .sort({ expectedAt: -1, createdAt: -1 })
    .lean();

  res.json({ data: visitors });
}));

router.post("/", asyncHandler(async (req, res) => {
  let studentId = req.body?.student;
  if (req.auth.role === "student") {
    const student = await Student.findOne({ user: req.auth.sub }).select("_id");
    if (!student) throw new HttpError(404, "Student profile not found.");
    studentId = student._id;
  } else {
    if (!studentId) throw new HttpError(400, "Student identifier is required.");
    requireObjectId(studentId);
  }

  const { name, phone, purpose, expectedAt, identityType, identityLast4 } = req.body || {};
  if (!name || !phone || !purpose || !expectedAt) {
    throw new HttpError(400, "Name, phone, purpose, and expected arrival date/time are required.");
  }

  const passToken = `VIS-${Date.now()}-${randomBytes(8).toString("hex").toUpperCase()}`;

  const visitor = await Visitor.create({
    student: studentId,
    name: String(name).trim(),
    phone: String(phone).trim(),
    purpose: String(purpose).trim(),
    expectedAt: new Date(expectedAt),
    identityType: identityType || "national_id",
    identityLast4: identityLast4 ? String(identityLast4).trim() : undefined,
    status: "expected",
    recordedBy: req.auth.sub,
    passToken,
  });

  res.status(201).json({ message: "Visitor registered successfully.", visitor, passToken });
}));

router.patch("/:id/check-in", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new HttpError(404, "Visitor record not found.");

  visitor.status = "checked_in";
  visitor.checkedInAt = new Date();
  visitor.recordedBy = req.auth.sub;
  await visitor.save();

  // Notify student
  const student = await Student.findById(visitor.student).select("user");
  if (student) {
    await Notification.create({
      user: student.user,
      title: "Visitor Checked In",
      message: `${visitor.name} has arrived and checked in at the hostel gate.`,
      type: "visitor",
      relatedModel: "Visitor",
      relatedId: visitor._id,
    }).catch(() => null);
  }

  res.json({ message: "Visitor checked in successfully.", visitor });
}));

router.patch("/:id/check-out", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new HttpError(404, "Visitor record not found.");

  visitor.status = "checked_out";
  visitor.checkedOutAt = new Date();
  await visitor.save();

  res.json({ message: "Visitor checked out successfully.", visitor });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) throw new HttpError(404, "Visitor record not found.");
  await visitor.deleteOne();
  res.json({ message: "Visitor record deleted." });
}));

export default router;

