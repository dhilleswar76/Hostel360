import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const allocationHistorySchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  fromRoom: { type: Schema.Types.ObjectId, ref: "Room" },
  toRoom: { type: Schema.Types.ObjectId, ref: "Room" },
  action: { type: String, enum: ["allocated", "transferred", "vacated"], required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  remarks: { type: String, trim: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

allocationHistorySchema.index({ student: 1, timestamp: -1 });

export default models.AllocationHistory || model("AllocationHistory", allocationHistorySchema);

