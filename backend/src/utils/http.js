import { Types } from "mongoose";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorResponse(error, res) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error && typeof error === "object" && error.code === 11000) {
    return res.status(409).json({ error: "A record with that unique value already exists." });
  }
  if (error && typeof error === "object" && error.name === "ValidationError") {
    const details = error.errors
      ? Object.values(error.errors).map((item) => item.message).filter(Boolean)
      : [];
    return res.status(400).json({ error: "Please correct the submitted details.", details });
  }
  if (error && typeof error === "object" && error.name === "CastError") {
    return res.status(400).json({ error: "The requested record identifier or value is invalid." });
  }
  console.error("API request failed:", error instanceof Error ? error.message : error);
  res.status(500).json({ error: "An unexpected server error occurred." });
}

export function requireObjectId(value) {
  if (!Types.ObjectId.isValid(value)) {
    throw new HttpError(400, "Invalid record identifier.");
  }
}

