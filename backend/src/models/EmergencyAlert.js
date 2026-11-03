import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const emergencyAlertSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  block: { type: Schema.Types.ObjectId, ref: "HostelBlock", index: true },
  room: { type: Schema.Types.ObjectId, ref: "Room", index: true },
  reason: { type: String, default: "Emergency SOS triggered", trim: true, maxlength: 1000 },
  locationDescription: { type: String, trim: true, maxlength: 500 },
  status: {
    type: String,
    enum: ["active", "acknowledged", "resolved"],
    default: "active",
    index: true,
  },
  acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
  acknowledgedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });

emergencyAlertSchema.index({ status: 1, createdAt: -1 });

export default models.EmergencyAlert || model("EmergencyAlert", emergencyAlertSchema);

