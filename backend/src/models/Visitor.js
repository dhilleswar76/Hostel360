import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const visitorSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  identityType: { type: String, enum: ["national_id", "driver_license", "passport", "other"], default: "national_id" },
  identityLast4: { type: String, trim: true, maxlength: 4 },
  purpose: { type: String, required: true, trim: true, maxlength: 500 },
  expectedAt: { type: Date, required: true },
  checkedInAt: Date,
  checkedOutAt: Date,
  status: { type: String, enum: ["expected", "checked_in", "checked_out", "cancelled"], default: "expected", index: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
  passToken: { type: String, sparse: true, select: false },
}, { timestamps: true });

visitorSchema.index({ status: 1, expectedAt: 1 });

export default models.Visitor || model("Visitor", visitorSchema);

