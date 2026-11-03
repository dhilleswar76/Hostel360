import { Router } from "express";
import { Types } from "mongoose";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Complaint from "../models/Complaint.js";
import GateMovement from "../models/GateMovement.js";
import HostelBlock from "../models/HostelBlock.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import Student from "../models/Student.js";
import Visitor from "../models/Visitor.js";
import User from "../models/User.js";
import MaintenanceTask from "../models/MaintenanceTask.js";
import EmergencyAlert from "../models/EmergencyAlert.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get("/stats", authenticate, authorize("admin", "warden"), asyncHandler(async (req, res) => {
  let blockIds = null;
  if (req.auth.role === "warden") {
    const blocks = await HostelBlock.find({ warden: req.auth.sub, isActive: true }).select("_id").lean();
    blockIds = blocks.map((block) => block._id);
  }

  const roomFilter = blockIds ? { block: { $in: blockIds } } : {};
  const rooms = await Room.find(roomFilter).select("block capacity occupiedBeds status").lean();
  const roomIds = rooms.map((room) => room._id);

  const blockScope = blockIds ? { _id: { $in: blockIds } } : { isActive: true };
  const blocks = await HostelBlock.find(blockScope).select("_id name code capacity").sort({ name: 1 }).lean();

  const students = await Student.find({ status: "active", ...(blockIds ? { room: { $in: roomIds } } : {}) }).select("_id").lean();
  const studentIds = students.map((student) => student._id);

  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    outsideCounts,
    feeRows,
    pendingLeaves,
    pendingComplaints,
    emergencyLeaves,
    totalComplaints,
    resolvedComplaints,
    totalWardens,
    totalBlocksCount,
    activeVisitors,
    emergencyAlertsCount,
    pendingMaintenanceCount,
    recentActivitiesList,
    recentPaymentsList,
    recentComplaintsList,
  ] = await Promise.all([
    GateMovement.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $sort: { occurredAt: -1 } },
      { $group: { _id: "$student", direction: { $first: "$direction" } } },
      { $group: { _id: "$direction", count: { $sum: 1 } } },
    ]),
    Payment.find({ student: { $in: studentIds } }).select("amount amountPaid status dueDate paidAt transactions").lean(),
    LeaveRequest.countDocuments({ student: { $in: studentIds }, status: "pending" }),
    Complaint.countDocuments({ student: { $in: studentIds }, status: { $in: ["pending", "assigned", "open", "in_progress"] } }),
    LeaveRequest.countDocuments({ student: { $in: studentIds }, status: "pending", reason: /emergency/i }),
    Complaint.countDocuments({ student: { $in: studentIds } }),
    Complaint.countDocuments({ student: { $in: studentIds }, status: { $in: ["resolved", "closed"] } }),
    User.countDocuments({ role: "warden", isActive: true }),
    HostelBlock.countDocuments(blockScope),
    Visitor.countDocuments({ student: { $in: studentIds }, status: "checked_in" }),
    EmergencyAlert.countDocuments({ status: "active", ...(blockIds ? { block: { $in: blockIds } } : {}) }),
    MaintenanceTask.countDocuments({ status: { $in: ["pending", "assigned", "in_progress"] }, ...(blockIds ? { block: { $in: blockIds } } : {}) }),
    GateMovement.find({ student: { $in: studentIds } })
      .sort({ occurredAt: -1 })
      .limit(6)
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .lean(),
    Payment.find({ student: { $in: studentIds }, status: "paid" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .lean(),
    Complaint.find({ student: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .lean(),
  ]);

  const outside = outsideCounts.find((item) => item._id === "exit")?.count || 0;
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, room) => sum + room.occupiedBeds, 0);
  const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
  const occupiedRooms = rooms.filter((room) => room.occupiedBeds > 0).length;
  const availableRooms = rooms.filter((room) => room.status !== "maintenance" && room.occupiedBeds < room.capacity).length;
  const occupancyPercentage = totalCapacity ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

  const collectedFor = (start, end) => feeRows.reduce((sum, fee) => {
    const transactions = fee.transactions || [];
    const transactionTotal = transactions.reduce((total, tx) => total + (tx.paidAt >= start && tx.paidAt < end ? tx.amount : 0), 0);
    const legacyTotal = transactions.length === 0 && fee.status === "paid" && fee.paidAt && fee.paidAt >= start && fee.paidAt < end ? (fee.amountPaid ?? fee.amount) : 0;
    return sum + transactionTotal + legacyTotal;
  }, 0);

  const feeTotals = feeRows.reduce((sum, fee) => {
    const paid = fee.status === "paid" && fee.amountPaid == null ? fee.amount : fee.amountPaid || 0;
    const balance = Math.max(0, fee.amount - paid);
    sum.total += fee.amount;
    sum.collected += paid;
    sum.pending += balance;
    if (balance > 0 && new Date(fee.dueDate) < today) sum.overdue += balance;
    return sum;
  }, { total: 0, collected: 0, pending: 0, overdue: 0 });

  const monthlyFees = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const pending = feeRows.reduce((sum, fee) => {
      const paid = fee.status === "paid" && fee.amountPaid == null ? fee.amount : fee.amountPaid || 0;
      return sum + (fee.dueDate >= month && fee.dueDate < next ? Math.max(0, fee.amount - paid) : 0);
    }, 0);
    return {
      month: month.toLocaleDateString("en-US", { month: "short" }),
      collected: collectedFor(month, next) / 100_000,
      pending: pending / 100_000,
    };
  });

  const occupancyByBlock = blocks.map((block) => {
    const blockRooms = rooms.filter((room) => String(room.block) === String(block._id));
    const capacity = blockRooms.reduce((sum, room) => sum + room.capacity, 0);
    const occupied = blockRooms.reduce((sum, room) => sum + room.occupiedBeds, 0);
    return {
      name: block.name,
      occupied: capacity ? Math.round((occupied / capacity) * 100) : 0,
      available: capacity ? Math.round(((capacity - occupied) / capacity) * 100) : 100,
      totalBeds: capacity,
      occupiedBeds: occupied,
    };
  });

  const complaintDistribution = [
    { name: "Pending", count: pendingComplaints },
    { name: "Resolved", count: resolvedComplaints },
    { name: "In Progress", count: Math.max(0, totalComplaints - pendingComplaints - resolvedComplaints) },
  ];

  res.json({
    stats: {
      totalStudents: students.length,
      totalWardens,
      totalBlocks: totalBlocksCount,
      totalRooms: rooms.length,
      occupiedRooms,
      availableRooms,
      totalCapacity,
      totalBeds: totalCapacity,
      occupiedBeds,
      availableBeds,
      occupancyPercentage,
      studentsOutside: outside,
      studentsInside: Math.max(0, students.length - outside),
      pendingRequests: pendingLeaves + pendingComplaints,
      pendingApprovals: pendingLeaves,
      emergencyLeaveRequests: emergencyLeaves,
      pendingComplaints,
      totalComplaints,
      resolvedComplaints,
      currentMonthFeeCollection: collectedFor(currentMonth, nextMonth),
      totalFees: feeTotals.total,
      collectedFees: feeTotals.collected,
      pendingFees: feeTotals.pending,
      overdueFees: feeTotals.overdue,
      activeVisitors,
      emergencyAlertsCount,
      pendingMaintenanceCount,
    },
    monthlyFees,
    occupancyByBlock,
    complaintDistribution,
    recentActivities: recentActivitiesList.map((m) => ({
      title: `${m.direction === "entry" ? "Student Entry" : "Student Exit"} Recorded`,
      detail: `${m.student?.user?.name || "Student"} - ${m.direction.toUpperCase()}`,
      time: new Date(m.occurredAt).toLocaleString(),
      tone: m.direction === "entry" ? "green" : "amber",
      icon: m.direction === "entry" ? "DoorOpen" : "MoveRight",
    })),
    recentPayments: recentPaymentsList.map((p) => ({
      id: p._id,
      studentName: p.student?.user?.name || "Student",
      amount: p.amountPaid || p.amount,
      purpose: p.purpose,
      date: p.paidAt || p.updatedAt,
    })),
    recentComplaints: recentComplaintsList.map((c) => ({
      id: c._id,
      title: c.title,
      studentName: c.student?.user?.name || "Student",
      category: c.category,
      priority: c.priority,
      status: c.status,
      date: c.createdAt,
    })),
  });
}));

export default router;

