import User from "../models/User.js";
import { verifyAccessToken } from "../auth/token.js";

export async function authenticate(req, res, next) {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Provide a Bearer token." });
  }

  try {
    const payload = verifyAccessToken(authorization.slice(7).trim());
    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (!user || !user.isActive || (user.tokenVersion ?? 0) !== payload.ver) {
      return res.status(401).json({ error: "Session is invalid or has expired. Please sign in again." });
    }
    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof Error && error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError" && error.name !== "NotBeforeError") {
      return next(error);
    }
    res.status(401).json({ error: "Invalid or expired authentication token." });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource." });
    }
    next();
  };
}

