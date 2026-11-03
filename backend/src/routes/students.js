import { randomBytes } from "crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import HostelBlock from "../models/HostelBlock.js";
import Payment from "../models/Payment.js";
import Complaint from "../models/Complaint.js";
import LeaveRequest from "../models/LeaveRequest.js";
import GateMovement from "../models/GateMovement.js";
import { deactivateStudent } from "../services/allocation.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();
const publicUserFields = "name email phone isActive role";

function stringValue(value, field, max, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${field} is required.`);
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    throw new HttpError(400, `${field} must be a valid value of at most ${max} characters.`);
  }
  return value.trim();
}

function validateEmail(value) {
  const email = String(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  return email;
}

function validatePhone(value, field) {
  if (!value) return undefined;
  const digits = String(value).replace(/\D/g, "");
  if (!/^[+\d][\d\s().-]{6,29}$/.test(value) || digits.length < 7 || digits.length > 15) {
    throw new HttpError(400, `${field} must contain 7–15 digits.`);
  }
  return String(value);
}

async function createStudentId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `STU-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    if (!(await Student.exists({ studentId: candidate }))) return candidate;
  }
  throw new HttpError(503, "Could not generate a unique student ID. Please retry.");
}

function normalizeGender(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !["male", "female", "other"].includes(value.toLowerCase())) {
    throw new HttpError(400, "Gender must be male, female, or other.");
  }
  return value.toLowerCase();
}

function normalizeYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1 || year > 10) throw new HttpError(400, "Academic year must be a number from 1 to 10.");
  return year;
}

async function populateStudent(studentId) {
  return Student.findById(studentId)
    .populate("user", publicUserFields)
    .populate({ path: "room", populate: { path: "block", select: "name code gender isActive warden" } });
}

async function assignedBlockIds(wardenId) {
  const blocks = await HostelBlock.find({ warden: wardenId, isActive: true }).select("_id").lean();
  return blocks.map((b) => b._id);
}

async function ensureStudentScope(student, role, userId) {
  if (role === "admin") return;
  if (role === "student") {
    if (String(student.user?._id || student.user) !== userId) {
      throw new HttpError(403, "You can only view your own student record.");
    }
    return;
  }
  if (role === "warden") {
    const blocks = await assignedBlockIds(userId);
    if (!student.room) {
      throw new HttpError(403, "Unassigned students can only be managed by administrators.");
    }
    const room = await Room.findById(student.room).select("block").lean();
    if (!room || !blocks.some((b) => b.equals(room.block))) {
      throw new HttpError(403, "This student is outside your assigned hostel blocks.");
    }
  }
}

router.use(authenticate);

router.get("/me", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub })
    .populate("user", publicUserFields)
    .populate({ path: "room", populate: { path: "block", select: "name code gender isActive warden" } });
  if (!student) throw new HttpError(404, "Student record not found.");

  const [lastMovement, feeTotals, pendingRequests] = await Promise.all([
    GateMovement.findOne({ student: student._id }).sort({ occurredAt: -1 }).lean(),
    Payment.find({ student: student._id }).select("amount amountPaid status").lean(),
    LeaveRequest.countDocuments({ student: student._id, status: "pending" }),
  ]);

  const summary = feeTotals.reduce((acc, f) => {
    const paid = f.status === "paid" && f.amountPaid == null ? f.amount : f.amountPaid || 0;
    acc.paid += paid;
    acc.pending += Math.max(0, f.amount - paid);
    return acc;
  }, { paid: 0, pending: 0 });

  res.json({
    student,
    movement: {
      status: lastMovement?.direction === "exit" ? "outside" : "inside",
      occurredAt: lastMovement?.occurredAt || null,
    },
    feeSummary: summary,
    pendingRequests,
  });
}));

router.get("/", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "warden") {
    const blocks = await assignedBlockIds(req.auth.sub);
    const rooms = await Room.find({ block: { $in: blocks } }).select("_id").lean();
    filter.room = { $in: rooms.map((r) => r._id) };
  }

  if (typeof req.query.status === "string" && ["active", "inactive", "graduated"].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (typeof req.query.year === "string") {
    filter.year = Number(req.query.year);
  }

  const querySearch = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (querySearch) {
    const regex = new RegExp(querySearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select("_id").lean();
    filter.$or = [
      { studentId: regex },
      { course: regex },
      { department: regex },
      { user: { $in: matchingUsers.map((u) => u._id) } },
    ];
  }

  const students = await Student.find(filter)
    .populate("user", publicUserFields)
    .populate({ path: "room", populate: { path: "block", select: "name code" } })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ data: students });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  if (req.params.id === "me") {
    if (req.auth.role !== "student") throw new HttpError(400, "Use a specific student ID.");
    const student = await Student.findOne({ user: req.auth.sub })
      .populate("user", publicUserFields)
      .populate({ path: "room", populate: { path: "block", select: "name code gender isActive warden" } });
    if (!student) throw new HttpError(404, "Student record not found.");
    return res.json({ student });
  }

  requireObjectId(req.params.id);
  const student = await populateStudent(req.params.id);
  if (!student) throw new HttpError(404, "Student not found.");
  await ensureStudentScope(student, req.auth.role, req.auth.sub);

  const [payments, complaints, leaves, movements] = await Promise.all([
    Payment.find({ student: student._id }).sort({ dueDate: -1 }).lean(),
    Complaint.find({ student: student._id }).sort({ createdAt: -1 }).lean(),
    LeaveRequest.find({ student: student._id }).sort({ createdAt: -1 }).lean(),
    GateMovement.find({ student: student._id }).sort({ occurredAt: -1 }).limit(10).lean(),
  ]);

  res.json({ student, payments, complaints, leaves, movements });
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  const name = stringValue(req.body.name, "Name", 120, true);
  const email = validateEmail(req.body.email);
  const course = stringValue(req.body.course, "Course", 120, true);
  const year = normalizeYear(req.body.year);
  const department = stringValue(req.body.department, "Department", 120);
  const gender = normalizeGender(req.body.gender);
  const phone = validatePhone(req.body.phone, "Phone");
  const guardianName = stringValue(req.body.guardianName, "Guardian name", 120);
  const guardianPhone = validatePhone(req.body.guardianPhone, "Guardian phone");

  if (await User.exists({ email })) throw new HttpError(409, "An account with that email already exists.");

  const studentId = req.body.studentId ? String(req.body.studentId).trim().toUpperCase() : await createStudentId();
  if (await Student.exists({ studentId })) throw new HttpError(409, "A student with that ID already exists.");

  const defaultPassword = req.body.password || "Student@Hostel360";
  const user = await User.create({ name, email, password: defaultPassword, role: "student", phone });
  try {
    const student = await Student.create({
      user: user._id,
      studentId,
      course,
      department,
      year,
      gender,
      guardianName,
      guardianPhone,
      status: "active",
    });
    res.status(201).json({ student: await populateStudent(student._id) });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
}));

router.put("/:id", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const student = await Student.findById(req.params.id);
  if (!student) throw new HttpError(404, "Student not found.");
  await ensureStudentScope(student, req.auth.role, req.auth.sub);

  if (req.auth.role === "admin") {
    if (req.body.email) {
      const email = validateEmail(req.body.email);
      const duplicate = await User.findOne({ email, _id: { $ne: student.user } });
      if (duplicate) throw new HttpError(409, "Email is already taken.");
      await User.updateOne({ _id: student.user }, { $set: { email } });
    }
    if (req.body.name) {
      const name = stringValue(req.body.name, "Name", 120, true);
      await User.updateOne({ _id: student.user }, { $set: { name } });
    }
  }

  if (req.body.phone !== undefined) {
    const phone = validatePhone(req.body.phone, "Phone");
    await User.updateOne({ _id: student.user }, { $set: { phone } });
  }

  if (req.body.course) student.course = stringValue(req.body.course, "Course", 120, true);
  if (req.body.department !== undefined) student.department = stringValue(req.body.department, "Department", 120);
  if (req.body.year) student.year = normalizeYear(req.body.year);
  if (req.body.gender) student.gender = normalizeGender(req.body.gender);
  if (req.body.guardianName !== undefined) student.guardianName = stringValue(req.body.guardianName, "Guardian name", 120);
  if (req.body.guardianPhone !== undefined) student.guardianPhone = validatePhone(req.body.guardianPhone, "Guardian phone");

  await student.save();
  res.json({ student: await populateStudent(student._id) });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  await deactivateStudent(req.params.id);
  res.json({ message: "Student account deactivated and room assignment released." });
}));

export default router;

