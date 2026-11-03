import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const qrPassSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  token: { type: String, required: true, unique: true, select: false },
  purpose: { type: String, enum: ["leave", "temporary_exit", "visitor"], default: "leave", required: true },
  validFrom: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ["active", "used", "revoked", "expired"], default: "active", index: true },
  leaveRequest: { type: Schema.Types.ObjectId, ref: "LeaveRequest" },
  issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  usedAt: Date,
}, { timestamps: true });

qrPassSchema.index({ student: 1, status: 1, expiresAt: 1 });

export default models.QRPass || model("QRPass", qrPassSchema);

