import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const announcementSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  targetRole: { type: String, enum: ["all", "student", "warden"], default: "all", required: true, index: true },
  block: { type: Schema.Types.ObjectId, ref: "HostelBlock", index: true },
  priority: { type: String, enum: ["normal", "important", "emergency"], default: "normal", index: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, index: true },
  readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

announcementSchema.index({ targetRole: 1, createdAt: -1 });

export default models.Announcement || model("Announcement", announcementSchema);

