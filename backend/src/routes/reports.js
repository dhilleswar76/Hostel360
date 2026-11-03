import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Student from "../models/Student.js";
import Room from "../models/Room.js";
import HostelBlock from "../models/HostelBlock.js";
import Payment from "../models/Payment.js";
import Complaint from "../models/Complaint.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Visitor from "../models/Visitor.js";
import GateMovement from "../models/GateMovement.js";
import MaintenanceTask from "../models/MaintenanceTask.js";
import { asyncHandler, HttpError } from "../utils/http.js";

const router = Router();

router.use(authenticate, authorize("admin", "warden"));

router.get("/:type", asyncHandler(async (req, res) => {
  const { type } = req.params;
  const format = req.query.format || "json";

  let data = [];
  let filename = `${type}-report-${Date.now()}`;

  if (type === "occupancy") {
    const blocks = await HostelBlock.find().lean();
    const rooms = await Room.find().populate("block", "name code").lean();
    data = rooms.map((r) => ({
      RoomNumber: r.roomNumber,
      HostelBlock: r.block?.name || "N/A",
      Floor: r.floor,
      Type: r.type,
      Capacity: r.capacity,
      OccupiedBeds: r.occupiedBeds,
      AvailableBeds: Math.max(0, r.capacity - r.occupiedBeds),
      MonthlyFee: r.monthlyFee,
      Status: r.status,
    }));
  } else if (type === "students") {
    const students = await Student.find()
      .populate("user", "name email phone isActive")
      .populate({ path: "room", populate: { path: "block", select: "name code" } })
      .lean();
    data = students.map((s) => ({
      StudentID: s.studentId,
      Name: s.user?.name || "N/A",
      Email: s.user?.email || "N/A",
      Phone: s.user?.phone || "N/A",
      Course: s.course,
      Department: s.department || "N/A",
      Year: s.year,
      HostelBlock: s.room?.block?.name || "Unassigned",
      RoomNumber: s.room?.roomNumber || "Unassigned",
      GuardianName: s.guardianName || "N/A",
      GuardianPhone: s.guardianPhone || "N/A",
      Status: s.status,
    }));
  } else if (type === "fees") {
    const fees = await Payment.find()
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .lean();
    data = fees.map((f) => ({
      PaymentID: f._id,
      StudentName: f.student?.user?.name || "N/A",
      FeeType: f.feeType,
      Purpose: f.purpose,
      Amount: f.amount,
      AmountPaid: f.amountPaid || 0,
      Balance: Math.max(0, f.amount - (f.amountPaid || 0)),
      Status: f.status,
      DueDate: f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "N/A",
      PaidDate: f.paidAt ? new Date(f.paidAt).toLocaleDateString() : "N/A",
    }));
  } else if (type === "complaints") {
    const complaints = await Complaint.find()
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .populate("assignedTo", "name")
      .lean();
    data = complaints.map((c) => ({
      ComplaintID: c._id,
      Title: c.title,
      Category: c.category,
      Priority: c.priority,
      Status: c.status,
      StudentName: c.student?.user?.name || "N/A",
      AssignedTo: c.assignedTo?.name || "Unassigned",
      CreatedDate: new Date(c.createdAt).toLocaleDateString(),
      ResolvedDate: c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : "Pending",
    }));
  } else if (type === "leaves") {
    const leaves = await LeaveRequest.find()
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .populate("reviewedBy", "name")
      .lean();
    data = leaves.map((l) => ({
      LeaveID: l._id,
      StudentName: l.student?.user?.name || "N/A",
      LeaveType: l.leaveType,
      Reason: l.reason,
      Destination: l.destination || "N/A",
      StartDate: new Date(l.startDate).toLocaleDateString(),
      EndDate: new Date(l.endDate).toLocaleDateString(),
      Status: l.status,
      ReviewedBy: l.reviewedBy?.name || "N/A",
    }));
  } else if (type === "visitors") {
    const visitors = await Visitor.find()
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .lean();
    data = visitors.map((v) => ({
      VisitorName: v.name,
      Phone: v.phone,
      VisitingStudent: v.student?.user?.name || "N/A",
      Purpose: v.purpose,
      ExpectedDate: new Date(v.expectedAt).toLocaleString(),
      CheckedInAt: v.checkedInAt ? new Date(v.checkedInAt).toLocaleString() : "N/A",
      CheckedOutAt: v.checkedOutAt ? new Date(v.checkedOutAt).toLocaleString() : "N/A",
      Status: v.status,
    }));
  } else if (type === "gate") {
    const movements = await GateMovement.find()
      .populate({ path: "student", populate: { path: "user", select: "name" } })
      .populate("recordedBy", "name")
      .sort({ occurredAt: -1 })
      .limit(500)
      .lean();
    data = movements.map((m) => ({
      MovementID: m._id,
      StudentName: m.student?.user?.name || "N/A",
      Direction: m.direction.toUpperCase(),
      Timestamp: new Date(m.occurredAt).toLocaleString(),
      RecordedBy: m.recordedBy?.name || "Staff",
      Notes: m.notes || "",
    }));
  } else if (type === "maintenance") {
    const tasks = await MaintenanceTask.find()
      .populate("block", "name code")
      .populate("room", "roomNumber")
      .populate("assignedTo", "name")
      .lean();
    data = tasks.map((t) => ({
      TaskID: t._id,
      Title: t.title,
      Category: t.category,
      Priority: t.priority,
      Status: t.status,
      Block: t.block?.name || "N/A",
      Room: t.room?.roomNumber || "N/A",
      AssignedTo: t.assignedTo?.name || "Unassigned",
      Deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : "N/A",
      CompletedAt: t.completedAt ? new Date(t.completedAt).toLocaleDateString() : "Pending",
    }));
  } else {
    throw new HttpError(400, "Unknown report type.");
  }

  if (format === "csv") {
    if (!data.length) {
      return res.attachment(`${filename}.csv`).send("No records found");
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = String(row[h] ?? "").replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(",")
      ),
    ];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.send(csvRows.join("\n"));
  }

  res.json({ reportType: type, generatedAt: new Date(), recordCount: data.length, data });
}));

export default router;

