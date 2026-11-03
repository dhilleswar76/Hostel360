import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const roomSchema = new Schema({
  block: { type: Schema.Types.ObjectId, ref: "HostelBlock", required: true },
  roomNumber: { type: String, required: true, trim: true },
  floor: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1 },
  occupiedBeds: { type: Number, default: 0, min: 0 },
  type: { type: String, enum: ["standard", "deluxe", "single", "double", "triple", "dormitory"], default: "standard" },
  monthlyFee: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["available", "full", "maintenance"], default: "available", index: true },
}, { timestamps: true });

roomSchema.virtual("availableBeds").get(function () {
  return Math.max(0, this.capacity - this.occupiedBeds);
});
roomSchema.set("toJSON", { virtuals: true });
roomSchema.set("toObject", { virtuals: true });
roomSchema.index({ block: 1, roomNumber: 1 }, { unique: true });

roomSchema.pre("validate", function (next) {
  if (this.occupiedBeds > this.capacity) {
    this.invalidate("occupiedBeds", "Occupied beds cannot exceed room capacity");
  }
  if (next) next();
});

export default models.Room || model("Room", roomSchema);

