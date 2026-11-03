import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Announcement from "../models/Announcement.js";
import HostelBlock from "../models/HostelBlock.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
  };

  if (req.auth.role === "student") {
    filter.targetRole = { $in: ["all", "student"] };
  } else if (req.auth.role === "warden") {
    filter.targetRole = { $in: ["all", "warden"] };
  }

  const announcements = await Announcement.find(filter)
    .populate("author", "name role")
    .populate("block", "name code")
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  const data = announcements.map((a) => ({
    ...a,
    isRead: a.readBy?.some((uid) => String(uid) === req.auth.sub) || false,
  }));

  res.json({ data });
}));

router.post("/", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const { title, content, targetRole, block, priority, expiresAt } = req.body || {};
  if (!title || !content) {
    throw new HttpError(400, "Title and content are required.");
  }

  if (block) requireObjectId(block);

  const announcement = await Announcement.create({
    title: String(title).trim(),
    content: String(content).trim(),
    targetRole: targetRole || "all",
    block: block || undefined,
    priority: priority || "normal",
    author: req.auth.sub,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });

  const saved = await Announcement.findById(announcement._id)
    .populate("author", "name role")
    .populate("block", "name code")
    .lean();

  res.status(201).json({ message: "Announcement published successfully.", announcement: saved });
}));

router.patch("/:id/read", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  await Announcement.updateOne(
    { _id: req.params.id },
    { $addToSet: { readBy: req.auth.sub } }
  );
  res.json({ success: true });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const a = await Announcement.findById(req.params.id);
  if (!a) throw new HttpError(404, "Announcement not found.");
  await a.deleteOne();
  res.json({ message: "Announcement deleted." });
}));

export default router;

