import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const messageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 3000 },
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

export default models.Message || model("Message", messageSchema);

