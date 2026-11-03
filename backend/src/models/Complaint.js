import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const historySchema = new Schema({
  status: { type: String, enum: ["pending", "assigned", "in_progress", "resolved", "rejected"], required: true },
  remark: { type: String, trim: true, maxlength: 1000 },
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  changedAt: { type: Date, default: Date.now, required: true },
}, { _id: true });

const complaintSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  room: { type: Schema.Types.ObjectId, ref: "Room" },
  category: {
    type: String,
    enum: ["electrical", "plumbing", "cleaning", "room_maintenance", "wifi", "water_supply", "food", "other", "maintenance", "cleanliness", "safety"],
    required: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal", index: true },
  status: { type: String, enum: ["pending", "assigned", "in_progress", "resolved", "rejected", "open", "closed"], default: "pending", index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  remarks: { type: String, trim: true, maxlength: 1000 },
  resolution: { type: String, trim: true, maxlength: 3000 },
  history: { type: [historySchema], default: [] },
  resolvedAt: Date,
}, { timestamps: true });

complaintSchema.index({ status: 1, priority: -1, createdAt: -1 });

export default models.Complaint || model("Complaint", complaintSchema);

