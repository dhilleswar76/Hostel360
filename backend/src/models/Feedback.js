import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const feedbackSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  category: {
    type: String,
    enum: ["cleaning", "food", "wifi", "maintenance", "security", "overall"],
    required: true,
    index: true,
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["submitted", "reviewed"], default: "submitted" },
}, { timestamps: true });

export default models.Feedback || model("Feedback", feedbackSchema);

