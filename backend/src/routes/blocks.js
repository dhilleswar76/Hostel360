import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();
const genders = ["male", "female", "mixed"];

function text(value, label, max, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${label} is required.`);
    return undefined;
  }
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${label} must be at most ${max} characters.`);
  }
  return value.trim();
}

async function serializeBlock(blockId) {
  const block = await HostelBlock.findById(blockId).populate("warden", "name email phone");
  if (!block) return null;
  const [roomStats, totalRooms] = await Promise.all([
    Room.aggregate([
      { $match: { block: block._id } },
      { $group: { _id: null, totalCapacity: { $sum: "$capacity" }, occupiedBeds: { $sum: "$occupiedBeds" } } },
    ]),
    Room.countDocuments({ block: block._id }),
  ]);
  const stats = roomStats[0] || { totalCapacity: 0, occupiedBeds: 0 };
  return {
    ...block.toJSON(),
    totalRooms,
    totalCapacity: stats.totalCapacity,
    occupiedBeds: stats.occupiedBeds,
    availableBeds: Math.max(0, stats.totalCapacity - stats.occupiedBeds),
  };
}

function validateCapacity(value) {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000) {
    throw new HttpError(400, "Block capacity must be a positive whole number.");
  }
  return capacity;
}

function validateGender(value) {
  if (typeof value !== "string" || !genders.includes(value.toLowerCase())) {
    throw new HttpError(400, "Gender category must be male, female, or mixed.");
  }
  return value.toLowerCase();
}

async function validateWarden(wardenId) {
  if (!wardenId) return undefined;
  requireObjectId(String(wardenId));
  const warden = await User.findOne({ _id: wardenId, role: "warden", isActive: true }).select("name email");
  if (!warden) throw new HttpError(400, "Choose an active warden account.");
  return warden._id;
}

router.use(authenticate, authorize("admin", "warden"));

router.get("/", asyncHandler(async (req, res) => {
  const filter = req.auth?.role === "warden" ? { warden: req.auth.sub } : {};
  const blocks = await HostelBlock.find(filter).sort({ name: 1 }).select("_id");
  const data = await Promise.all(blocks.map((block) => serializeBlock(String(block._id))));
  res.json({ data: data.filter(Boolean) });
}));

router.get("/wardens", authorize("admin"), asyncHandler(async (_req, res) => {
  const data = await User.find({ role: "warden", isActive: true }).select("name email phone").sort({ name: 1 }).lean();
  res.json({ data });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const data = await serializeBlock(req.params.id);
  if (!data) throw new HttpError(404, "Hostel block not found.");
  if (req.auth.role === "warden" && String(data.warden?._id || data.warden || "") !== req.auth.sub) {
    throw new HttpError(403, "You can only view your assigned hostel block.");
  }
  const rooms = await Room.find({ block: req.params.id }).sort({ roomNumber: 1 }).lean();
  res.json({ block: data, rooms });
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  const name = text(req.body?.name, "Block name", 120, true);
  const code = text(req.body?.code, "Block code", 30, true).toUpperCase();
  const capacity = validateCapacity(req.body?.capacity);
  const gender = validateGender(req.body?.gender ?? "mixed");
  const description = text(req.body?.description, "Description", 1000);
  const address = text(req.body?.address, "Address", 500);
  const warden = await validateWarden(req.body?.warden);

  if (await HostelBlock.exists({ code })) throw new HttpError(409, "A block with that code already exists.");

  const block = await HostelBlock.create({ name, code, capacity, gender, description, address, warden, isActive: true });
  res.status(201).json({ block: await serializeBlock(String(block._id)) });
}));

router.put("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const block = await HostelBlock.findById(req.params.id);
  if (!block) throw new HttpError(404, "Hostel block not found.");

  if (req.body?.name !== undefined) block.name = text(req.body.name, "Block name", 120, true);
  if (req.body?.capacity !== undefined) {
    const capacity = validateCapacity(req.body.capacity);
    const roomCapacityStats = await Room.aggregate([
      { $match: { block: block._id } },
      { $group: { _id: null, totalCapacity: { $sum: "$capacity" } } },
    ]);
    const currentRoomCapacity = roomCapacityStats[0]?.totalCapacity || 0;
    if (capacity < currentRoomCapacity) {
      throw new HttpError(409, `Capacity cannot be lower than existing room capacity (${currentRoomCapacity}).`);
    }
    block.capacity = capacity;
  }
  if (req.body?.gender !== undefined) block.gender = validateGender(req.body.gender);
  if (req.body?.description !== undefined) block.description = text(req.body.description, "Description", 1000);
  if (req.body?.address !== undefined) block.address = text(req.body.address, "Address", 500);
  if (req.body?.isActive !== undefined) block.isActive = Boolean(req.body.isActive);
  if (req.body?.warden !== undefined) {
    block.warden = req.body.warden ? await validateWarden(req.body.warden) : undefined;
  }

  await block.save();
  res.json({ block: await serializeBlock(String(block._id)) });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const block = await HostelBlock.findById(req.params.id);
  if (!block) throw new HttpError(404, "Hostel block not found.");

  const roomCount = await Room.countDocuments({ block: block._id });
  if (roomCount > 0) {
    throw new HttpError(409, "Cannot delete block containing rooms. Please remove rooms first.");
  }

  await block.deleteOne();
  res.json({ message: "Hostel block deleted successfully." });
}));

export default router;

