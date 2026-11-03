import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

router.use(authenticate);

router.get("/contacts", asyncHandler(async (req, res) => {
  if (req.auth.role === "student") {
    // Find assigned warden
    const student = await Student.findOne({ user: req.auth.sub }).populate({
      path: "room",
      populate: { path: "block", populate: { path: "warden", select: "name email phone role" } },
    });

    const warden = student?.room?.block?.warden;
    if (warden) {
      return res.json({ contacts: [warden] });
    }
    // Fallback: any active warden
    const anyWarden = await User.find({ role: "warden", isActive: true }).select("name email phone role").limit(2);
    return res.json({ contacts: anyWarden });
  }

  if (req.auth.role === "warden") {
    // Find students in assigned block
    const blocks = await HostelBlock.find({ warden: req.auth.sub, isActive: true }).select("_id").lean();
    const rooms = await Room.find({ block: { $in: blocks.map((b) => b._id) } }).select("_id").lean();
    const students = await Student.find({ room: { $in: rooms.map((r) => r._id) } })
      .populate("user", "name email phone role")
      .lean();

    const contacts = students.map((s) => ({
      ...s.user,
      studentId: s.studentId,
    }));
    return res.json({ contacts });
  }

  // Admin sees all wardens
  const wardens = await User.find({ role: "warden", isActive: true }).select("name email phone role").lean();
  res.json({ contacts: wardens });
}));

router.get("/conversations/:partnerId", asyncHandler(async (req, res) => {
  requireObjectId(req.params.partnerId);
  const myId = req.auth.sub;
  const partnerId = req.params.partnerId;

  // Mark incoming unread messages as read
  await Message.updateMany(
    { sender: partnerId, recipient: myId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  const messages = await Message.find({
    $or: [
      { sender: myId, recipient: partnerId },
      { sender: partnerId, recipient: myId },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ messages });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { recipient, content } = req.body || {};
  if (!recipient || !content) {
    throw new HttpError(400, "Recipient and message content are required.");
  }
  requireObjectId(recipient);

  const message = await Message.create({
    sender: req.auth.sub,
    recipient,
    content: String(content).trim(),
    isRead: false,
  });

  res.status(201).json({ message });
}));

router.get("/unread-count", asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({ recipient: req.auth.sub, isRead: false });
  res.json({ count });
}));

export default router;

