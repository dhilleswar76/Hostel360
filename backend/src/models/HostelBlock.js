import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const hostelBlockSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 1000 },
  address: { type: String, trim: true },
  gender: { type: String, enum: ["male", "female", "mixed"], default: "mixed", required: true },
  capacity: { type: Number, required: true, min: 1 },
  warden: { type: Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

hostelBlockSchema.index({ name: 1 });

export default models.HostelBlock || model("HostelBlock", hostelBlockSchema);

