import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, models, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false, minlength: 8 },
  role: { type: String, enum: ["admin", "warden", "student"], required: true, index: true },
  phone: { type: String, trim: true, maxlength: 30 },
  isActive: { type: Boolean, default: true, index: true },
  tokenVersion: { type: Number, default: 0, select: false },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (next) next();
});

export default models.User || model("User", userSchema);

