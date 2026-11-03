import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import MaintenanceTask from "../models/MaintenanceTask.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();

async function assignedBlockIds(wardenId) {
  const blocks = await HostelBlock.find({ warden: wardenId, isActive: true }).select("_id").lean();
  return blocks.map((b) => b._id);
}

router.use(authenticate, authorize("admin", "warden"));

router.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "warden") {
    filter.block = { $in: await assignedBlockIds(req.auth.sub) };
  } else if (req.query.block) {
    requireObjectId(req.query.block);
    filter.block = req.query.block;
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.category) filter.category = req.query.category;

  const tasks = await MaintenanceTask.find(filter)
    .populate("block", "name code")
    .populate("room", "roomNumber floor")
    .populate("assignedTo", "name email phone")
    .populate("reportedBy", "name role")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ data: tasks });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { title, description, category, priority, deadline, block, room, assignedTo } = req.body || {};
  if (!title || !description || !block) {
    throw new HttpError(400, "Title, description, and hostel block are required.");
  }
  requireObjectId(block);
  if (room) requireObjectId(room);
  if (assignedTo) requireObjectId(assignedTo);

  if (req.auth.role === "warden") {
    const blocks = await assignedBlockIds(req.auth.sub);
    if (!blocks.some((b) => b.equals(block))) {
      throw new HttpError(403, "You can only create maintenance tasks for your assigned blocks.");
    }
  }

  const task = await MaintenanceTask.create({
    title: String(title).trim(),
    description: String(description).trim(),
    category: category || "other",
    priority: priority || "medium",
    deadline: deadline ? new Date(deadline) : undefined,
    block,
    room: room || undefined,
    assignedTo: assignedTo || undefined,
    reportedBy: req.auth.sub,
    status: assignedTo ? "assigned" : "pending",
    history: [{ status: "pending", remark: "Maintenance task created", actor: req.auth.sub, changedAt: new Date() }],
  });

  const saved = await MaintenanceTask.findById(task._id)
    .populate("block", "name code")
    .populate("room", "roomNumber floor")
    .populate("assignedTo", "name email phone")
    .lean();

  res.status(201).json({ message: "Maintenance task created successfully.", task: saved });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const task = await MaintenanceTask.findById(req.params.id);
  if (!task) throw new HttpError(404, "Maintenance task not found.");

  const { status, remarks, completionRemarks, priority, deadline, assignedTo } = req.body || {};

  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (deadline) task.deadline = new Date(deadline);
  if (assignedTo !== undefined) {
    if (assignedTo) requireObjectId(assignedTo);
    task.assignedTo = assignedTo || undefined;
  }
  if (completionRemarks) task.completionRemarks = completionRemarks;

  if (status === "completed") {
    task.completedAt = new Date();
  }

  task.history.push({
    status: task.status,
    remark: remarks || completionRemarks || `Status updated to ${task.status}`,
    actor: req.auth.sub,
    changedAt: new Date(),
  });

  await task.save();

  const updated = await MaintenanceTask.findById(task._id)
    .populate("block", "name code")
    .populate("room", "roomNumber floor")
    .populate("assignedTo", "name email phone")
    .lean();

  res.json({ message: "Maintenance task updated successfully.", task: updated });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const task = await MaintenanceTask.findById(req.params.id);
  if (!task) throw new HttpError(404, "Maintenance task not found.");
  await task.deleteOne();
  res.json({ message: "Maintenance task deleted successfully." });
}));

export default router;

