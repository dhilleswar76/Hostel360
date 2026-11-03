import { Router } from "express";
import bcrypt from "bcryptjs";
import { authenticate, authorize } from "../middleware/authenticate.js";
import User from "../models/User.js";
import HostelBlock from "../models/HostelBlock.js";
import Student from "../models/Student.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", asyncHandler(async (req, res) => {
  const { role, status, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  if (q) {
    const regex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).lean();
  const blocks = await HostelBlock.find({ isActive: true }).select("_id name code warden").lean();

  const wardenBlockMap = {};
  for (const b of blocks) {
    if (b.warden) {
      wardenBlockMap[String(b.warden)] = { id: b._id, name: b.name, code: b.code };
    }
  }

  const data = users.map((u) => ({
    ...u,
    assignedBlock: wardenBlockMap[String(u._id)] || null,
  }));

  res.json({ data });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, assignedBlock } = req.body || {};
  if (!name || !email || !password || !role) {
    throw new HttpError(400, "Name, email, password, and role are required.");
  }
  if (!["admin", "warden"].includes(role)) {
    throw new HttpError(400, "Staff role must be admin or warden.");
  }
  if (password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role,
    phone: phone ? String(phone).trim() : undefined,
    isActive: true,
  });

  if (role === "warden" && assignedBlock) {
    requireObjectId(assignedBlock);
    await HostelBlock.updateOne({ _id: assignedBlock }, { $set: { warden: user._id } });
  }

  const savedUser = await User.findById(user._id).select("-password").lean();
  res.status(201).json({ message: "Staff account created successfully.", user: savedUser });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "Account not found.");

  const { name, email, phone, role, assignedBlock, isActive } = req.body || {};

  if (name) user.name = String(name).trim();
  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (existing) throw new HttpError(409, "Email is already in use.");
    user.email = normalizedEmail;
  }
  if (phone !== undefined) user.phone = phone ? String(phone).trim() : undefined;
  if (isActive !== undefined) user.isActive = Boolean(isActive);

  await user.save();

  if (user.role === "warden" && assignedBlock !== undefined) {
    // Unassign previous block if any
    await HostelBlock.updateMany({ warden: user._id }, { $unset: { warden: 1 } });
    if (assignedBlock) {
      requireObjectId(assignedBlock);
      await HostelBlock.updateOne({ _id: assignedBlock }, { $set: { warden: user._id } });
    }
  }

  const updated = await User.findById(user._id).select("-password").lean();
  res.json({ message: "Account updated successfully.", user: updated });
}));

router.post("/:id/reset-password", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "Account not found.");

  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    throw new HttpError(400, "New password must be at least 8 characters.");
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ message: `Password for ${user.name} reset successfully.` });
}));

router.patch("/:id/status", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "Account not found.");

  const { isActive } = req.body || {};
  user.isActive = Boolean(isActive);
  if (!user.isActive) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }
  await user.save();

  res.json({ message: `Account ${user.isActive ? "activated" : "deactivated"} successfully.`, user });
}));

export default router;

