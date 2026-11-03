import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Complaint from "../models/Complaint.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();
const categories = ["electrical", "plumbing", "cleaning", "room_maintenance", "wifi", "water_supply", "food", "other", "maintenance", "cleanliness", "safety"];
const statuses = ["pending", "assigned", "in_progress", "resolved", "rejected"];

async function studentFor(req) {
  const student = await Student.findOne({ user: req.auth.sub }).select("_id room user");
  if (!student) throw new HttpError(404, "Student profile not found.");
  return student;
}

async function wardenStudentIds(userId) {
  const blocks = await HostelBlock.find({ warden: userId, isActive: true }).select("_id").lean();
  const rooms = await Room.find({ block: { $in: blocks.map((b) => b._id) } }).select("_id").lean();
  const students = await Student.find({ room: { $in: rooms.map((r) => r._id) } }).select("_id").lean();
  return students.map((s) => s._id);
}

async function scopeComplaint(id, role, userId) {
  const complaint = await Complaint.findById(id);
  if (!complaint) throw new HttpError(404, "Complaint not found.");
  if (role === "student") {
    const student = await Student.findOne({ user: userId }).select("_id");
    if (!student || !complaint.student.equals(student._id)) throw new HttpError(404, "Complaint not found.");
  }
  if (role === "warden") {
    const ids = await wardenStudentIds(userId);
    if (!ids.some((studentId) => studentId.equals(complaint.student))) throw new HttpError(404, "Complaint not found.");
  }
  return complaint;
}

router.use(authenticate);

router.get("/stats", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const ids = req.auth.role === "admin" ? null : await wardenStudentIds(req.auth.sub);
  const filter = ids ? { student: { $in: ids } } : {};
  const [total, pending, assigned, inProgress, resolved, rejected] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.countDocuments({ ...filter, status: { $in: ["pending", "open"] } }),
    Complaint.countDocuments({ ...filter, status: "assigned" }),
    Complaint.countDocuments({ ...filter, status: "in_progress" }),
    Complaint.countDocuments({ ...filter, status: { $in: ["resolved", "closed"] } }),
    Complaint.countDocuments({ ...filter, status: "rejected" }),
  ]);
  res.json({ stats: { total, pending, assigned, inProgress, resolved, rejected } });
}));

router.get("/assignees", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const data = await User.find({ role: "warden", isActive: true, ...(req.auth.role === "warden" ? { _id: req.auth.sub } : {}) })
    .select("name email role")
    .sort({ name: 1 })
    .lean();
  res.json({ data });
}));

router.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "student") {
    filter.student = (await studentFor(req))._id;
  } else if (req.auth.role === "warden") {
    filter.student = { $in: await wardenStudentIds(req.auth.sub) };
  }

  if (typeof req.query.category === "string") {
    filter.category = req.query.category;
  }
  if (typeof req.query.status === "string") {
    filter.status = req.query.status;
  }

  const complaints = await Complaint.find(filter)
    .populate({ path: "student", populate: [{ path: "user", select: "name email phone" }, { path: "room", populate: { path: "block", select: "name code" } }] })
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ data: complaints });
}));

router.post("/", authorize("student"), asyncHandler(async (req, res) => {
  const student = await studentFor(req);
  const { title, description, category, priority } = req.body || {};

  if (!title || !description || !category) {
    throw new HttpError(400, "Title, description, and category are required.");
  }

  const complaint = await Complaint.create({
    student: student._id,
    room: student.room,
    title: String(title).trim(),
    description: String(description).trim(),
    category: String(category).toLowerCase(),
    priority: priority || "normal",
    status: "pending",
    history: [{ status: "pending", remark: "Complaint registered by student", actor: req.auth.sub, changedAt: new Date() }],
  });

  res.status(201).json({ complaint });
}));

router.patch("/:id/status", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const complaint = await scopeComplaint(req.params.id, req.auth.role, req.auth.sub);
  const { status, remarks, assignedTo } = req.body || {};

  if (status && !statuses.includes(status)) throw new HttpError(400, "Invalid complaint status.");

  if (status) complaint.status = status;
  if (remarks) complaint.remarks = remarks;
  if (assignedTo) {
    requireObjectId(assignedTo);
    complaint.assignedTo = assignedTo;
  }
  if (status === "resolved") {
    complaint.resolvedAt = new Date();
    complaint.resolution = remarks || "Resolved";
  }

  complaint.history.push({
    status: complaint.status,
    remark: remarks || `Status changed to ${status}`,
    actor: req.auth.sub,
    changedAt: new Date(),
  });

  await complaint.save();

  // Notify student
  const student = await Student.findById(complaint.student).select("user");
  if (student) {
    await Notification.create({
      user: student.user,
      title: "Complaint Status Update",
      message: `Your complaint "${complaint.title}" is now ${complaint.status}. Remarks: ${remarks || "No remarks"}`,
      type: "complaint",
      relatedModel: "Complaint",
      relatedId: complaint._id,
    }).catch(() => null);
  }

  res.json({ complaint });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new HttpError(404, "Complaint not found.");
  await complaint.deleteOne();
  res.json({ message: "Complaint deleted." });
}));

export default router;

