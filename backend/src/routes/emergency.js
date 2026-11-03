import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import EmergencyAlert from "../models/EmergencyAlert.js";
import Student from "../models/Student.js";
import Room from "../models/Room.js";
import HostelBlock from "../models/HostelBlock.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "warden") {
    const blocks = await HostelBlock.find({ warden: req.auth.sub, isActive: true }).select("_id").lean();
    filter.block = { $in: blocks.map((b) => b._id) };
  }

  const alerts = await EmergencyAlert.find(filter)
    .populate({
      path: "student",
      populate: [
        { path: "user", select: "name email phone" },
        { path: "room", populate: { path: "block", select: "name code" } },
      ],
    })
    .populate("block", "name code")
    .populate("room", "roomNumber floor")
    .populate("acknowledgedBy", "name")
    .populate("resolvedBy", "name")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ data: alerts });
}));

router.post("/sos", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub }).populate("room");
  if (!student) throw new HttpError(404, "Student profile not found.");

  const { reason, locationDescription } = req.body || {};

  const room = student.room;
  const block = room ? room.block : undefined;

  const alert = await EmergencyAlert.create({
    student: student._id,
    block,
    room: room ? room._id : undefined,
    reason: reason ? String(reason).trim() : "Emergency SOS activated by resident",
    locationDescription: locationDescription ? String(locationDescription).trim() : (room ? `Room ${room.roomNumber}` : "Hostel Campus"),
    status: "active",
  });

  // Notify all admins and assigned warden
  const notifyUsers = await User.find({
    $or: [
      { role: "admin", isActive: true },
      { role: "warden", isActive: true },
    ],
  }).select("_id");

  const notifPromises = notifyUsers.map((u) =>
    Notification.create({
      user: u._id,
      title: "EMERGENCY SOS ALERT",
      message: `Emergency SOS triggered by ${req.user?.name || "a student"} (${room ? `Room ${room.roomNumber}` : "Campus"}). Urgent response required!`,
      type: "emergency",
      relatedModel: "EmergencyAlert",
      relatedId: alert._id,
    }).catch(() => null)
  );

  await Promise.all(notifPromises);

  res.status(201).json({
    message: "EMERGENCY SOS ALERT TRIGGERED. Staff and wardens have been notified immediately.",
    alert,
  });
}));

router.patch("/:id/acknowledge", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const alert = await EmergencyAlert.findById(req.params.id);
  if (!alert) throw new HttpError(404, "Emergency alert not found.");

  alert.status = "acknowledged";
  alert.acknowledgedBy = req.auth.sub;
  alert.acknowledgedAt = new Date();
  await alert.save();

  res.json({ message: "Alert acknowledged.", alert });
}));

router.patch("/:id/resolve", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const alert = await EmergencyAlert.findById(req.params.id);
  if (!alert) throw new HttpError(404, "Emergency alert not found.");

  const { resolutionNotes } = req.body || {};
  alert.status = "resolved";
  alert.resolvedBy = req.auth.sub;
  alert.resolvedAt = new Date();
  alert.resolutionNotes = resolutionNotes ? String(resolutionNotes).trim() : "Resolved on-site by staff";
  await alert.save();

  res.json({ message: "Emergency alert marked resolved.", alert });
}));

export default router;

