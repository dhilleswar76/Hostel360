import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const gateMovementSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  qrPass: { type: Schema.Types.ObjectId, ref: "QRPass" },
  direction: { type: String, enum: ["entry", "exit"], required: true },
  occurredAt: { type: Date, default: Date.now, required: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  notes: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

gateMovementSchema.index({ student: 1, occurredAt: -1 });

export default models.GateMovement || model("GateMovement", gateMovementSchema);

