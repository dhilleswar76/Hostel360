import { Router } from "express";
import { authenticate, authorize } from "../middleware/authenticate.js";

const router = Router();

router.get("/admin", authenticate, authorize("admin"), (_req, res) => res.json({ access: "admin" }));
router.get("/warden", authenticate, authorize("warden", "admin"), (_req, res) => res.json({ access: "warden" }));
router.get("/student", authenticate, authorize("student"), (_req, res) => res.json({ access: "student" }));

export default router;

