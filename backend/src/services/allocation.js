import mongoose from "mongoose";
import StudentModel from "../models/Student.js";
import RoomModel from "../models/Room.js";
import HostelBlockModel from "../models/HostelBlock.js";
import UserModel from "../models/User.js";
import AllocationHistory from "../models/AllocationHistory.js";
import { HttpError } from "../utils/http.js";

function transactionUnsupported(error) {
  if (!error || typeof error !== "object") return false;
  return error.code === 20 || error.codeName === "IllegalOperation" || /transactions? are only allowed|replica set member|mongos/i.test(error.message || "");
}

async function runWithOptionalTransaction(transactional, guardedFallback) {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await transactional(session);
      });
      return result;
    } catch (error) {
      if (!transactionUnsupported(error)) throw error;
      console.warn("MongoDB transactions are unavailable on this server; using guarded atomic room updates.");
    }
  } finally {
    await session.endSession();
  }
  return guardedFallback();
}

async function getAvailableRoom(roomId, session) {
  const query = RoomModel.findById(roomId);
  if (session) query.session(session);
  const room = await query;
  if (!room) throw new HttpError(404, "Room not found.");
  if (room.status === "maintenance") throw new HttpError(409, "This room is under maintenance.");
  if (room.occupiedBeds >= room.capacity) throw new HttpError(409, "This room has no available beds.");

  const blockQuery = HostelBlockModel.findById(room.block);
  if (session) blockQuery.session(session);
  const block = await blockQuery;
  if (!block || !block.isActive) throw new HttpError(409, "This hostel block is inactive or unavailable.");
  return { room, block };
}

function genderFits(studentGender, blockGender) {
  if (blockGender === "mixed" || !studentGender) return true;
  return studentGender === blockGender;
}

async function reserveRoom(roomId, studentGender, session) {
  const { room, block } = await getAvailableRoom(roomId, session);
  if (!genderFits(studentGender, block.gender)) throw new HttpError(409, "The student's gender is not eligible for this block.");
  const nextOccupied = room.occupiedBeds + 1;
  const updated = await RoomModel.updateOne(
    { _id: room._id, occupiedBeds: room.occupiedBeds, capacity: room.capacity, status: { $ne: "maintenance" } },
    { $inc: { occupiedBeds: 1 }, $set: { status: nextOccupied >= room.capacity ? "full" : "available" } },
    session ? { session } : {},
  );
  if (updated.modifiedCount !== 1) throw new HttpError(409, "Room availability changed. Refresh and try again.");
  return RoomModel.findById(room._id).session(session || null);
}

async function releaseRoom(roomId, session) {
  const query = RoomModel.findById(roomId);
  if (session) query.session(session);
  const room = await query;
  if (!room) throw new HttpError(409, "The student's current room no longer exists.");
  if (room.occupiedBeds < 1) throw new HttpError(409, "Room occupancy is inconsistent; no bed can be released.");
  const updated = await RoomModel.updateOne(
    { _id: room._id, occupiedBeds: room.occupiedBeds },
    { $inc: { occupiedBeds: -1 }, $set: { status: room.status === "maintenance" ? "maintenance" : "available" } },
    session ? { session } : {},
  );
  if (updated.modifiedCount !== 1) throw new HttpError(409, "Room occupancy changed. Refresh and try again.");
  return RoomModel.findById(room._id).session(session || null);
}

async function loadStudent(studentId, session) {
  const query = StudentModel.findById(studentId);
  if (session) query.session(session);
  const student = await query;
  if (!student) throw new HttpError(404, "Student not found.");
  if (student.status !== "active") throw new HttpError(409, "Only active students can be allocated a room.");
  return student;
}

export async function allocateStudent(roomId, studentId, actorId, remarks) {
  const result = await runWithOptionalTransaction(
    async (session) => {
      const student = await loadStudent(studentId, session);
      if (student.room) throw new HttpError(409, "This student is already assigned to a room. Use transfer instead.");
      const room = await reserveRoom(roomId, student.gender, session);
      student.room = room._id;
      await student.save(session ? { session } : undefined);
      return { student, room };
    },
    async () => {
      const student = await loadStudent(studentId);
      if (student.room) throw new HttpError(409, "This student is already assigned to a room. Use transfer instead.");
      const room = await reserveRoom(roomId, student.gender);
      const assigned = await StudentModel.updateOne({ _id: student._id, room: { $in: [null, undefined] }, status: "active" }, { $set: { room: room._id } });
      if (assigned.modifiedCount !== 1) {
        await releaseRoom(room._id);
        throw new HttpError(409, "The student already has a room assignment. Refresh and try again.");
      }
      const updatedStudent = await StudentModel.findById(student._id);
      return { student: updatedStudent, room };
    },
  );

  if (actorId) {
    await AllocationHistory.create({
      student: studentId,
      toRoom: roomId,
      action: "allocated",
      performedBy: actorId,
      remarks: remarks || "Bed allocated",
    }).catch(() => null);
  }

  return result;
}

export async function transferStudent(roomId, studentId, actorId, remarks) {
  let previousRoomId = null;
  const result = await runWithOptionalTransaction(
    async (session) => {
      const student = await loadStudent(studentId, session);
      if (!student.room) throw new HttpError(409, "This student has no current room to transfer from.");
      if (String(student.room) === roomId) throw new HttpError(400, "The student is already assigned to this room.");
      previousRoomId = student.room;
      const room = await reserveRoom(roomId, student.gender, session);
      student.room = room._id;
      await student.save(session ? { session } : undefined);
      await releaseRoom(previousRoomId, session);
      return { student, room };
    },
    async () => {
      const student = await loadStudent(studentId);
      if (!student.room) throw new HttpError(409, "This student has no current room to transfer from.");
      if (String(student.room) === roomId) throw new HttpError(400, "The student is already assigned to this room.");
      previousRoomId = student.room;
      const room = await reserveRoom(roomId, student.gender);
      const moved = await StudentModel.updateOne({ _id: student._id, room: previousRoomId, status: "active" }, { $set: { room: room._id } });
      if (moved.modifiedCount !== 1) {
        await releaseRoom(room._id);
        throw new HttpError(409, "The student's room assignment changed. Refresh and try again.");
      }
      try {
        await releaseRoom(previousRoomId);
      } catch (error) {
        await StudentModel.updateOne({ _id: student._id, room: room._id }, { $set: { room: previousRoomId } });
        await releaseRoom(room._id);
        throw error;
      }
      return { student: await StudentModel.findById(student._id), room };
    },
  );

  if (actorId) {
    await AllocationHistory.create({
      student: studentId,
      fromRoom: previousRoomId,
      toRoom: roomId,
      action: "transferred",
      performedBy: actorId,
      remarks: remarks || "Room transferred",
    }).catch(() => null);
  }

  return result;
}

export async function releaseStudent(studentId, actorId, remarks) {
  let previousRoomId = null;
  const result = await runWithOptionalTransaction(
    async (session) => {
      const student = await StudentModel.findById(studentId).session(session || null);
      if (!student) throw new HttpError(404, "Student not found.");
      if (!student.room) throw new HttpError(409, "This student does not have a room assignment.");
      previousRoomId = student.room;
      student.room = undefined;
      await student.save(session ? { session } : undefined);
      const previousRoom = await releaseRoom(previousRoomId, session);
      return { student, previousRoom };
    },
    async () => {
      const student = await StudentModel.findById(studentId);
      if (!student) throw new HttpError(404, "Student not found.");
      if (!student.room) throw new HttpError(409, "This student does not have a room assignment.");
      previousRoomId = student.room;
      const removed = await StudentModel.updateOne({ _id: student._id, room: previousRoomId }, { $unset: { room: 1 } });
      if (removed.modifiedCount !== 1) throw new HttpError(409, "The student's room assignment changed. Refresh and try again.");
      try {
        const previousRoom = await releaseRoom(previousRoomId);
        return { student: await StudentModel.findById(student._id), previousRoom };
      } catch (error) {
        await StudentModel.updateOne({ _id: student._id, room: { $exists: false } }, { $set: { room: previousRoomId } });
        throw error;
      }
    },
  );

  if (actorId && previousRoomId) {
    await AllocationHistory.create({
      student: studentId,
      fromRoom: previousRoomId,
      action: "vacated",
      performedBy: actorId,
      remarks: remarks || "Room vacated",
    }).catch(() => null);
  }

  return result;
}

export async function deactivateStudent(studentId) {
  return runWithOptionalTransaction(async (session) => {
    const student = await StudentModel.findById(studentId).session(session);
    if (!student) throw new HttpError(404, "Student not found.");
    if (student.room) await releaseRoom(student.room, session);
    student.room = undefined;
    student.status = "inactive";
    await student.save({ session });
    await UserModel.updateOne({ _id: student.user }, { $set: { isActive: false }, $inc: { tokenVersion: 1 } }, { session });
    return student;
  }, async () => {
    const student = await StudentModel.findById(studentId);
    if (!student) throw new HttpError(404, "Student not found.");
    const previousRoom = student.room;
    const deactivated = await StudentModel.updateOne(
      { _id: student._id, status: "active", room: previousRoom ?? { $in: [null, undefined] } },
      { $set: { status: "inactive" }, ...(previousRoom ? { $unset: { room: 1 } } : {}) },
    );
    if (deactivated.modifiedCount !== 1) throw new HttpError(409, "Student account changed. Refresh and try again.");
    try {
      if (previousRoom) await releaseRoom(previousRoom);
      await UserModel.updateOne({ _id: student.user }, { $set: { isActive: false }, $inc: { tokenVersion: 1 } });
      return await StudentModel.findById(student._id);
    } catch (error) {
      await StudentModel.updateOne({ _id: student._id, status: "inactive" }, { $set: { status: "active", ...(previousRoom ? { room: previousRoom } : {}) } });
      if (previousRoom) {
        const room = await RoomModel.findById(previousRoom);
        if (room && room.occupiedBeds < room.capacity) await reserveRoom(String(previousRoom), student.gender).catch(() => undefined);
      }
      throw error;
    }
  });
}

