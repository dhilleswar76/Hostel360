import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  type: {
    type: String,
    enum: ["payment", "complaint", "leave", "visitor", "maintenance", "emergency", "announcement", "message", "system"],
    default: "system",
  },
  relatedModel: {
    type: String,
    enum: ["Payment", "Complaint", "LeaveRequest", "Visitor", "MaintenanceTask", "EmergencyAlert", "Announcement", "Message"],
  },
  relatedId: Schema.Types.ObjectId,
  readAt: Date,
}, { timestamps: true });

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

export default models.Notification || model("Notification", notificationSchema);

