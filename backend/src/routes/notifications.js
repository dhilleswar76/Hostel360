import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import Notification from "../models/Notification.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  res.json({
    data: notifications.map((n) => ({
      ...n,
      isRead: Boolean(n.readAt),
    })),
    unreadCount,
  });
}));

router.patch("/:id/read", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.auth.sub },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notif) throw new HttpError(404, "Notification not found.");
  res.json({ notification: notif });
}));

router.post("/mark-all-read", asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.auth.sub, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
  res.json({ message: "All notifications marked as read." });
}));

export default router;

