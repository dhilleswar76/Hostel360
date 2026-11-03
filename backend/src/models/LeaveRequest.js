import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const leaveRequestSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 2000 },
  leaveType: { type: String, enum: ["local_outing", "home_visit", "emergency_leave"], default: "local_outing" },
  destination: { type: String, trim: true, maxlength: 250 },
  emergencyContact: { type: String, trim: true, maxlength: 30 },
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending", index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  reviewNote: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

leaveRequestSchema.index({ status: 1, startDate: 1 });

leaveRequestSchema.pre("validate", function (next) {
  if (this.endDate < this.startDate) {
    this.invalidate("endDate", "End date must be on or after start date");
  }
  if (next) next();
});

export default models.LeaveRequest || model("LeaveRequest", leaveRequestSchema);

