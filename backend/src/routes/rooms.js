import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/authenticate.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import Student from "../models/Student.js";
import AllocationHistory from "../models/AllocationHistory.js";
import { allocateStudent, releaseStudent, transferStudent } from "../services/allocation.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();
const roomTypes = ["standard", "deluxe", "single", "double", "triple", "dormitory"];

function roomNumber(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 30) {
    throw new HttpError(400, "Room number is required and must be at most 30 characters.");
  }
  return value.trim().toUpperCase();
}

function integer(value, label, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function fee(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new HttpError(400, "Monthly fee must be between 0 and 1,000,000.");
  }
  return amount;
}

function type(value) {
  if (typeof value !== "string" || !roomTypes.includes(value)) {
    throw new HttpError(400, "Choose a supported room type.");
  }
  return value;
}

async function assignedBlockIds(wardenId) {
  const blocks = await HostelBlock.find({ warden: wardenId, isActive: true }).select("_id").lean();
  return blocks.map((block) => block._id);
}

async function ensureRoomScope(room, role, userId) {
  if (role === "admin") return;
  if (role !== "warden" || !(await HostelBlock.exists({ _id: room.block, warden: userId, isActive: true }))) {
    throw new HttpError(403, "This room is outside your assigned hostel blocks.");
  }
}

async function ensureBlockScope(blockId, role, userId) {
  const block = await HostelBlock.findById(blockId);
  if (!block || !block.isActive) throw new HttpError(404, "Active hostel block not found.");
  if (role === "warden" && String(block.warden || "") !== userId) {
    throw new HttpError(403, "This block is outside your assigned scope.");
  }
  return block;
}

async function checkBlockCapacity(blockId, nextCapacity, currentRoomId) {
  const block = await HostelBlock.findById(blockId);
  if (!block || !block.isActive) throw new HttpError(404, "Active hostel block not found.");
  const rooms = await Room.find({ block: blockId, ...(currentRoomId ? { _id: { $ne: currentRoomId } } : {}) }).select("capacity").lean();
  const used = rooms.reduce((total, room) => total + room.capacity, 0);
  if (used + nextCapacity > block.capacity) {
    throw new HttpError(409, `This room would exceed the block's configured capacity of ${block.capacity} beds.`);
  }
  return block;
}

async function populateRoom(id) {
  const room = await Room.findById(id).populate("block", "name code gender isActive");
  if (!room) return null;
  return { ...room.toJSON(), availableBeds: Math.max(0, room.capacity - room.occupiedBeds) };
}

router.use(authenticate);

router.get("/my-room", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub }).lean();
  if (!student || !student.room) {
    return res.json({ room: null, roommates: [] });
  }
  const room = await Room.findById(student.room).populate("block").lean();
  const roommates = await Student.find({ room: student.room, _id: { $ne: student._id }, status: "active" })
    .populate("user", "name email phone")
    .lean();
  res.json({
    room: { ...room, availableBeds: Math.max(0, (room?.capacity || 0) - (room?.occupiedBeds || 0)) },
    roommates: roommates.map((r) => ({
      name: r.user?.name,
      course: r.course,
      year: r.year,
      email: r.user?.email,
      phone: r.user?.phone,
    })),
  });
}));

router.get("/history", authorize("admin", "warden"), asyncHandler(async (_req, res) => {
  const history = await AllocationHistory.find()
    .sort({ timestamp: -1 })
    .limit(50)
    .populate({ path: "student", populate: { path: "user", select: "name email" } })
    .populate("fromRoom", "roomNumber")
    .populate("toRoom", "roomNumber")
    .populate("performedBy", "name")
    .lean();
  res.json({ history });
}));

router.get("/", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.auth.role === "warden") {
    filter.block = { $in: await assignedBlockIds(req.auth.sub) };
  } else if (typeof req.query.block === "string") {
    requireObjectId(req.query.block);
    filter.block = req.query.block;
  }
  if (typeof req.query.status === "string" && ["available", "full", "maintenance"].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (typeof req.query.type === "string" && roomTypes.includes(req.query.type)) {
    filter.type = req.query.type;
  }

  const querySearch = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (querySearch) {
    filter.roomNumber = new RegExp(querySearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const rooms = await Room.find(filter).populate("block", "name code gender isActive").sort({ block: 1, roomNumber: 1 });
  const data = rooms.map((room) => ({
    ...room.toJSON(),
    availableBeds: Math.max(0, room.capacity - room.occupiedBeds),
  }));
  res.json({ data });
}));

router.get("/:id", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const room = await populateRoom(req.params.id);
  if (!room) throw new HttpError(404, "Room not found.");
  await ensureRoomScope(room, req.auth.role, req.auth.sub);
  const students = await Student.find({ room: req.params.id, status: "active" }).populate("user", "name email phone");
  res.json({ room, students });
}));

router.post("/", authorize("admin"), asyncHandler(async (req, res) => {
  const blockId = String(req.body?.block || "");
  requireObjectId(blockId);
  const block = await checkBlockCapacity(blockId, integer(req.body?.capacity, "Capacity", 1, 100));
  const num = roomNumber(req.body?.roomNumber);

  if (await Room.exists({ block: block._id, roomNumber: num })) {
    throw new HttpError(409, `Room ${num} already exists in ${block.name}.`);
  }

  const room = await Room.create({
    block: block._id,
    roomNumber: num,
    floor: integer(req.body?.floor, "Floor", 0, 100),
    capacity: integer(req.body?.capacity, "Capacity", 1, 100),
    type: type(req.body?.type ?? "standard"),
    monthlyFee: fee(req.body?.monthlyFee),
    status: req.body?.status === "maintenance" ? "maintenance" : "available",
  });
  res.status(201).json({ room: await populateRoom(String(room._id)) });
}));

router.put("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const room = await Room.findById(req.params.id);
  if (!room) throw new HttpError(404, "Room not found.");

  if (req.body?.block && String(room.block) !== req.body.block) {
    throw new HttpError(400, "Moving rooms between hostel blocks is not allowed.");
  }
  if (req.body?.capacity !== undefined) {
    const nextCapacity = integer(req.body.capacity, "Capacity", 1, 100);
    if (nextCapacity < room.occupiedBeds) {
      throw new HttpError(409, `Capacity cannot be lower than the ${room.occupiedBeds} students currently in this room.`);
    }
    await checkBlockCapacity(String(room.block), nextCapacity, String(room._id));
    room.capacity = nextCapacity;
  }
  if (req.body?.roomNumber !== undefined) {
    const nextNum = roomNumber(req.body.roomNumber);
    if (nextNum !== room.roomNumber && (await Room.exists({ block: room.block, roomNumber: nextNum, _id: { $ne: room._id } }))) {
      throw new HttpError(409, `Room ${nextNum} already exists in this hostel block.`);
    }
    room.roomNumber = nextNum;
  }
  if (req.body?.floor !== undefined) room.floor = integer(req.body.floor, "Floor", 0, 100);
  if (req.body?.type !== undefined) room.type = type(req.body.type);
  if (req.body?.monthlyFee !== undefined) room.monthlyFee = fee(req.body.monthlyFee);
  if (req.body?.status !== undefined) {
    if (req.body.status === "maintenance" && room.occupiedBeds > 0) {
      throw new HttpError(409, "Cannot put an occupied room into maintenance. Reallocate students first.");
    }
    room.status = req.body.status;
  } else if (room.status !== "maintenance") {
    room.status = room.occupiedBeds >= room.capacity ? "full" : "available";
  }

  await room.save();
  res.json({ room: await populateRoom(String(room._id)) });
}));

router.delete("/:id", authorize("admin"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const room = await Room.findById(req.params.id);
  if (!room) throw new HttpError(404, "Room not found.");
  if (room.occupiedBeds > 0) throw new HttpError(409, "Cannot delete an occupied room. Transfer or release students first.");

  await room.deleteOne();
  res.json({ message: "Room deleted successfully." });
}));

router.post("/:id/allocate", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const studentId = String(req.body?.student || "");
  requireObjectId(studentId);
  const room = await Room.findById(req.params.id);
  if (!room) throw new HttpError(404, "Room not found.");
  await ensureRoomScope(room, req.auth.role, req.auth.sub);

  const result = await allocateStudent(req.params.id, studentId, req.auth.sub, req.body?.remarks);
  res.json({
    message: "Student allocated successfully.",
    room: await populateRoom(String(result.room._id)),
    student: result.student,
  });
}));

router.post("/:id/transfer", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const studentId = String(req.body?.student || "");
  requireObjectId(studentId);
  const destination = await Room.findById(req.params.id);
  if (!destination) throw new HttpError(404, "Destination room not found.");
  await ensureRoomScope(destination, req.auth.role, req.auth.sub);

  const result = await transferStudent(req.params.id, studentId, req.auth.sub, req.body?.remarks);
  res.json({
    message: "Student transferred successfully.",
    room: await populateRoom(String(result.room._id)),
    student: result.student,
  });
}));

router.post("/:id/vacate", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const studentId = String(req.body?.student || "");
  requireObjectId(studentId);
  const student = await Student.findById(studentId);
  if (!student) throw new HttpError(404, "Student not found.");
  if (student.room) {
    const room = await Room.findById(student.room);
    if (room) await ensureRoomScope(room, req.auth.role, req.auth.sub);
  }

  const result = await releaseStudent(studentId, req.auth.sub, req.body?.remarks);
  res.json({
    message: "Bed vacated successfully.",
    room: await populateRoom(String(result.previousRoom._id)),
    student: result.student,
  });
}));

export default router;

