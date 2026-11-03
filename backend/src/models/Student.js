import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const studentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  studentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  course: { type: String, required: true, trim: true },
  department: { type: String, trim: true, maxlength: 120 },
  year: { type: Number, required: true, min: 1, max: 10 },
  gender: { type: String, enum: ["male", "female", "other"] },
  admissionDate: { type: Date, default: Date.now, required: true },
  room: { type: Schema.Types.ObjectId, ref: "Room", index: true },
  guardianName: { type: String, trim: true },
  guardianPhone: { type: String, trim: true },
  status: { type: String, enum: ["active", "inactive", "graduated"], default: "active", index: true },
}, { timestamps: true });

studentSchema.index({ status: 1, room: 1 });

export default models.Student || model("Student", studentSchema);

