import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";
import MessMenu from "../models/MessMenu.js";
import Feedback from "../models/Feedback.js";
import Student from "../models/Student.js";
import { asyncHandler, HttpError, requireObjectId } from "../utils/http.js";

const router = Router();
const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const meals = ["breakfast", "lunch", "dinner"];

router.use(authenticate);

router.get("/menu", asyncHandler(async (_req, res) => {
  const menu = await MessMenu.find().sort({ dayOfWeek: 1 }).lean();
  res.json({ menu });
}));

router.put("/menu", authorize("admin", "warden"), asyncHandler(async (req, res) => {
  const { dayOfWeek, mealType, items, specialNotes } = req.body || {};
  if (!dayOfWeek || !mealType || !items || !Array.isArray(items)) {
    throw new HttpError(400, "Day of week, meal type, and items list are required.");
  }
  const day = String(dayOfWeek).toLowerCase();
  const meal = String(mealType).toLowerCase();
  if (!days.includes(day) || !meals.includes(meal)) {
    throw new HttpError(400, "Invalid day of week or meal type.");
  }

  const updated = await MessMenu.findOneAndUpdate(
    { dayOfWeek: day, mealType: meal },
    {
      dayOfWeek: day,
      mealType: meal,
      items: items.map((i) => String(i).trim()).filter(Boolean),
      specialNotes: specialNotes ? String(specialNotes).trim() : undefined,
      updatedBy: req.auth.sub,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ message: "Mess menu updated.", menu: updated });
}));

router.post("/feedback", authorize("student"), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.auth.sub }).select("_id");
  if (!student) throw new HttpError(404, "Student profile not found.");

  const { rating, comments } = req.body || {};
  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    throw new HttpError(400, "Rating must be an integer from 1 to 5.");
  }

  const fb = await Feedback.create({
    student: student._id,
    category: "food",
    rating: numRating,
    comments: comments ? String(comments).trim() : undefined,
  });

  res.status(201).json({ message: "Mess feedback submitted. Thank you!", feedback: fb });
}));

router.get("/feedback-summary", authorize("admin", "warden"), asyncHandler(async (_req, res) => {
  const feedbacks = await Feedback.find({ category: "food" })
    .populate({ path: "student", populate: { path: "user", select: "name" } })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const avgStats = await Feedback.aggregate([
    { $match: { category: "food" } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, totalCount: { $sum: 1 } } },
  ]);

  res.json({
    avgRating: avgStats[0]?.avgRating ? Math.round(avgStats[0].avgRating * 10) / 10 : 0,
    totalCount: avgStats[0]?.totalCount || 0,
    feedbacks,
  });
}));

export default router;

