import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const messMenuSchema = new Schema({
  dayOfWeek: {
    type: String,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    required: true,
  },
  mealType: {
    type: String,
    enum: ["breakfast", "lunch", "dinner"],
    required: true,
  },
  items: [{ type: String, trim: true, required: true }],
  specialNotes: { type: String, trim: true, maxlength: 500 },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

messMenuSchema.index({ dayOfWeek: 1, mealType: 1 }, { unique: true });

export default models.MessMenu || model("MessMenu", messMenuSchema);

