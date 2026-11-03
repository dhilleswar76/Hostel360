import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { getDatabaseStatus } from "./config/database.js";
import authRouter from "./routes/auth.js";
import accessRouter from "./routes/access.js";
import studentsRouter from "./routes/students.js";
import blocksRouter from "./routes/blocks.js";
import roomsRouter from "./routes/rooms.js";
import dashboardRouter from "./routes/dashboard.js";
import feesRouter from "./routes/fees.js";
import complaintsRouter from "./routes/complaints.js";
import leavesRouter from "./routes/leaves.js";
import gateRouter from "./routes/gate.js";
import visitorsRouter from "./routes/visitors.js";
import staffRouter from "./routes/staff.js";
import maintenanceRouter from "./routes/maintenance.js";
import announcementsRouter from "./routes/announcements.js";
import emergencyRouter from "./routes/emergency.js";
import messRouter from "./routes/mess.js";
import feedbackRouter from "./routes/feedback.js";
import messagesRouter from "./routes/messages.js";
import notificationsRouter from "./routes/notifications.js";
import reportsRouter from "./routes/reports.js";
import { errorResponse } from "./utils/http.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    system: "HOSTEL360",
    database: getDatabaseStatus(),
    message: "HOSTEL360 Smart Hostel Management API is running",
    timestamp: new Date(),
  })
);

app.use("/api/auth", authRouter);
app.use("/api/access", accessRouter);
app.use("/api/students", studentsRouter);
app.use("/api/blocks", blocksRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/fees", feesRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/leaves", leavesRouter);
app.use("/api/gate", gateRouter);
app.use("/api/visitors", visitorsRouter);
app.use("/api/staff", staffRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/mess", messRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/reports", reportsRouter);

// Serve frontend build in production if available
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Centralized error handling
app.use((error, _req, res, _next) => errorResponse(error, res));

export default app;

