import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import Feedback from "../models/Feedback.js";
import Student from "../models/Student.js";
import { asyncHandler, HttpError } from "../utils/http.js";

const router = Router();
const categories = ["cleaning", "food", "wifi", "maintenance", "security", "overall"];

router.use(authenticate);

router.get("/summary", authorize("admin", "warden"), asyncHandler(async (_req, res) => {
  const [breakdown, list] = await Promise.all([
    Feedback.aggregate([
      { $group: { _id: "$category", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    Feedback.find()
      .populate({ path: "student", populate: { path: "user", select: "name email" } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const summary = categories.map((cat) => {
    const item = breakdown.find((b) => b._id === cat);
    return {
      category: cat,
      avgRating: item ? Math.round(item.avgRating * 10) / 10 : 0,
      count: item?.count || 0,
    };
  });

  res.json({ summary, feedbacks: list });
}));

router.post("/", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub }).select("_id");
  if (!student) throw new HttpError(404, "Student profile not found.");

  const { category, rating, comments } = req.body || {};
  if (!category || !categories.includes(String(category).toLowerCase())) {
    throw new HttpError(400, "Please choose a valid feedback category.");
  }

  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    throw new HttpError(400, "Rating must be between 1 and 5.");
  }

  const feedback = await Feedback.create({
    student: student._id,
    category: String(category).toLowerCase(),
    rating: numRating,
    comments: comments ? String(comments).trim() : undefined,
  });

  res.status(201).json({ message: "Thank you for your feedback!", feedback });
}));

export default router;

