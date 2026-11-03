import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const transactionSchema = new Schema({
  idempotencyKey: { type: String, required: true, maxlength: 100 },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: ["cash", "upi", "card", "bank", "other"], required: true },
  transactionId: { type: String, required: true },
  status: { type: String, enum: ["succeeded"], default: "succeeded", required: true },
  paidAt: { type: Date, default: Date.now, required: true },
}, { _id: true });

const paymentSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  amount: { type: Number, required: true, min: 0.01 },
  amountPaid: { type: Number, default: 0, min: 0 },
  feeType: { type: String, enum: ["tuition", "accommodation", "mess", "deposit", "fine", "other"], default: "other", index: true },
  academicYear: { type: String, trim: true, maxlength: 20, default: "Unspecified" },
  currency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
  purpose: { type: String, enum: ["rent", "mess", "deposit", "fine", "other"], required: true },
  dueDate: { type: Date, required: true, index: true },
  paidAt: Date,
  status: { type: String, enum: ["pending", "partially_paid", "paid", "overdue", "failed", "refunded"], default: "pending", index: true },
  method: { type: String, enum: ["cash", "upi", "card", "bank", "other"] },
  transactionId: { type: String, trim: true, sparse: true, unique: true },
  notes: { type: String, trim: true, maxlength: 500 },
  transactions: { type: [transactionSchema], default: [] },
}, { timestamps: true });

paymentSchema.index({ student: 1, status: 1, dueDate: 1 });
paymentSchema.index({ academicYear: 1, feeType: 1, status: 1 });

export default models.Payment || model("Payment", paymentSchema);

