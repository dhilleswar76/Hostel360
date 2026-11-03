import { randomUUID } from "crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/authenticate.js";
import HostelBlock from "../models/HostelBlock.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();
const feeTypes = ["tuition", "accommodation", "mess", "deposit", "fine", "other"];
const purposes = { tuition: "other", accommodation: "rent", mess: "mess", deposit: "deposit", fine: "fine", other: "other" };
const safeFields = "student amount amountPaid currency purpose feeType academicYear dueDate paidAt status method transactionId notes transactions createdAt updatedAt";
const cents = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const startOfToday = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const isOverdue = (date) => new Date(date).getTime() < startOfToday().getTime();

async function refreshOverdue() {
  await Payment.updateMany(
    { status: { $in: ["pending", "partially_paid"] }, dueDate: { $lt: startOfToday() }, $expr: { $lt: [{ $ifNull: ["$amountPaid", 0] }, "$amount"] } },
    { $set: { status: "overdue" } }
  );
}

function serialized(payment) {
  const amount = cents(payment.amount || 0);
  const amountPaid = cents(payment.status === "paid" && payment.amountPaid == null ? amount : payment.amountPaid || 0);
  const balance = cents(Math.max(0, amount - amountPaid));
  const status = balance <= 0 ? "paid" : payment.dueDate && isOverdue(payment.dueDate) ? "overdue" : amountPaid > 0 ? "partially_paid" : "pending";
  return { ...payment, amountPaid, balance, status };
}

async function getScopedStudentIds(role, userId) {
  if (role === "admin") return null;
  if (role === "student") {
    const student = await Student.findOne({ user: userId }).select("_id");
    if (!student) throw new HttpError(404, "Student profile not found.");
    return [student._id];
  }
  const blocks = await HostelBlock.find({ warden: userId, isActive: true }).select("_id").lean();
  const rooms = await Room.find({ block: { $in: blocks.map((b) => b._id) } }).select("_id").lean();
  const students = await Student.find({ room: { $in: rooms.map((r) => r._id) } }).select("_id").lean();
  return students.map((s) => s._id);
}

function parseFee(body) {
  const amount = Number(body?.amount);
  const dueDate = new Date(body?.dueDate);
  const feeType = body?.feeType;
  const academicYear = typeof body?.academicYear === "string" ? body.academicYear.trim() : "";
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    throw new HttpError(400, "Fee amount must be a valid positive number.");
  }
  if (Number.isNaN(dueDate.getTime())) throw new HttpError(400, "A valid due date is required.");
  if (!feeTypes.includes(feeType)) throw new HttpError(400, "Choose a valid fee type.");
  if (!academicYear || academicYear.length > 20) throw new HttpError(400, "Academic year is required (up to 20 characters).");
  return {
    amount: cents(amount),
    dueDate,
    feeType,
    academicYear,
    purpose: purposes[feeType] || "other",
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : undefined,
  };
}

router.use(authenticate);

router.get("/summary", asyncHandler(async (req, res) => {
  const ids = await getScopedStudentIds(req.auth.role, req.auth.sub);
  const match = ids ? { student: { $in: ids } } : {};
  const [rows, count] = await Promise.all([
    Payment.find(match).select("amount amountPaid status dueDate paidAt").lean(),
    Payment.countDocuments(match),
  ]);
  const summary = rows.reduce((acc, item) => {
    const total = cents(item.amount || 0);
    const paid = cents(item.status === "paid" && item.amountPaid == null ? total : item.amountPaid || 0);
    const balance = cents(Math.max(0, total - paid));
    acc.totalFees += total;
    acc.collectedFees += paid;
    acc.pendingFees += balance;
    if (balance > 0 && isOverdue(item.dueDate)) acc.overdueFees += balance;
    return acc;
  }, { totalFees: 0, collectedFees: 0, pendingFees: 0, overdueFees: 0 });

  res.json({
    summary: {
      totalFees: cents(summary.totalFees),
      collectedFees: cents(summary.collectedFees),
      pendingFees: cents(summary.pendingFees),
      overdueFees: cents(summary.overdueFees),
      recordCount: count,
    },
  });
}));

router.get("/", asyncHandler(async (req, res) => {
  await refreshOverdue();
  const ids = await getScopedStudentIds(req.auth.role, req.auth.sub);
  const filter = ids ? { student: { $in: ids } } : {};

  if (typeof req.query.student === "string") {
    requireObjectId(req.query.student);
    if (ids && !ids.some((id) => id.equals(new Types.ObjectId(req.query.student)))) {
      throw new HttpError(404, "Fee records not found.");
    }
    filter.student = req.query.student;
  }
  if (typeof req.query.feeType === "string") {
    if (!feeTypes.includes(req.query.feeType)) throw new HttpError(400, "Invalid fee type filter.");
    filter.feeType = req.query.feeType;
  }
  if (typeof req.query.status === "string") {
    if (!["pending", "partially_paid", "paid", "overdue"].includes(req.query.status)) throw new HttpError(400, "Invalid fee status filter.");
    filter.status = req.query.status;
  }

  const records = await Payment.find(filter)
    .select(safeFields)
    .populate({ path: "student", populate: [{ path: "user", select: "name email" }, { path: "room", populate: { path: "block", select: "name code" } }] })
    .sort({ dueDate: -1, createdAt: -1 })
    .lean();

  res.json({ data: records.map(serialized) });
}));

router.get("/:id/history", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const ids = await getScopedStudentIds(req.auth.role, req.auth.sub);
  const payment = await Payment.findById(req.params.id)
    .select(safeFields)
    .populate({ path: "student", populate: [{ path: "user", select: "name email" }, { path: "room", populate: { path: "block", select: "name code" } }] })
    .lean();
  if (!payment || (ids && !ids.some((id) => id.equals(payment.student?._id)))) {
    throw new HttpError(404, "Fee record not found.");
  }
  const transactions = (payment.transactions || []).slice().sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
  if (!transactions.length && payment.status === "paid") {
    transactions.push({
      _id: payment._id,
      amount: payment.amountPaid ?? payment.amount,
      method: payment.method || "simulated",
      transactionId: payment.transactionId || `SIM-${payment._id}`,
      status: "succeeded",
      paidAt: payment.paidAt || payment.createdAt,
    });
  }
  res.json({ data: transactions, fee: serialized(payment) });
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  const studentId = String(req.body?.student || "");
  requireObjectId(studentId);
  const student = await Student.findById(studentId);
  if (!student) throw new HttpError(404, "Student not found.");
  const fields = parseFee(req.body);

  const payment = await Payment.create({
    student: student._id,
    ...fields,
    amountPaid: 0,
    status: isOverdue(fields.dueDate) ? "overdue" : "pending",
  });

  // Notify student
  await Notification.create({
    user: student.user,
    title: "New Fee Assigned",
    message: `A new fee of ₹${fields.amount} (${fields.feeType}) has been issued. Due date: ${new Date(fields.dueDate).toLocaleDateString()}.`,
    type: "payment",
    relatedModel: "Payment",
    relatedId: payment._id,
  }).catch(() => null);

  res.status(201).json({
    payment: serialized(await Payment.findById(payment._id).select(safeFields).populate({ path: "student", populate: { path: "user", select: "name email" } }).lean()),
  });
}));

router.post("/:id/simulate", authorize("student"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const student = await Student.findOne({ user: req.auth.sub }).select("_id user");
  if (!student) throw new HttpError(404, "Student profile not found.");

  const idempotencyKey = typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey.trim() : `PAY-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const method = req.body?.method || "upi";
  const fee = await Payment.findOne({ _id: req.params.id, student: student._id });
  if (!fee) throw new HttpError(404, "Fee record not found.");

  const currentPaid = fee.status === "paid" && fee.amountPaid == null ? fee.amount : fee.amountPaid || 0;
  const remaining = Math.max(0, fee.amount - currentPaid);
  const amount = req.body?.amount === undefined ? remaining : Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > remaining + 0.01) {
    throw new HttpError(400, `Payment amount must be between 1 and ${remaining}.`);
  }

  const tx = {
    idempotencyKey,
    amount,
    method,
    transactionId: `SIM-${randomUUID().slice(0, 12).toUpperCase()}`,
    status: "succeeded",
    paidAt: new Date(),
  };

  const newPaidTotal = cents(currentPaid + amount);
  const newStatus = newPaidTotal >= fee.amount ? "paid" : "partially_paid";

  fee.amountPaid = newPaidTotal;
  fee.status = newStatus;
  fee.paidAt = new Date();
  fee.method = method;
  fee.transactionId = tx.transactionId;
  fee.transactions.push(tx);
  await fee.save();

  // Create notification
  await Notification.create({
    user: student.user,
    title: "Simulated Payment Successful",
    message: `Your payment of ₹${amount} for ${fee.purpose} was successful. Transaction ID: ${tx.transactionId}`,
    type: "payment",
    relatedModel: "Payment",
    relatedId: fee._id,
  }).catch(() => null);

  const updated = await Payment.findById(fee._id).select(safeFields).populate({ path: "student", populate: { path: "user", select: "name email" } }).lean();
  res.json({ message: "Simulated payment completed successfully.", payment: serialized(updated), receipt: tx });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new HttpError(404, "Fee record not found.");
  await payment.deleteOne();
  res.json({ message: "Fee record deleted." });
}));

export default router;

