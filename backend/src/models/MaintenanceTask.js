import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const maintenanceHistorySchema = new Schema({
  status: { type: String, enum: ["pending", "assigned", "in_progress", "completed", "cancelled"], required: true },
  remark: { type: String, trim: true, maxlength: 1000 },
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  changedAt: { type: Date, default: Date.now, required: true },
}, { _id: true });

const maintenanceTaskSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: {
    type: String,
    enum: ["electrical", "plumbing", "cleaning", "carpentry", "appliance", "structural", "other"],
    default: "other",
    required: true,
  },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
  status: {
    type: String,
    enum: ["pending", "assigned", "in_progress", "completed", "cancelled"],
    default: "pending",
    index: true,
  },
  deadline: { type: Date },
  block: { type: Schema.Types.ObjectId, ref: "HostelBlock", required: true, index: true },
  room: { type: Schema.Types.ObjectId, ref: "Room", index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  completionRemarks: { type: String, trim: true, maxlength: 2000 },
  completedAt: { type: Date },
  history: { type: [maintenanceHistorySchema], default: [] },
}, { timestamps: true });

maintenanceTaskSchema.index({ block: 1, status: 1 });
maintenanceTaskSchema.index({ status: 1, priority: -1, createdAt: -1 });

export default models.MaintenanceTask || model("MaintenanceTask", maintenanceTaskSchema);

