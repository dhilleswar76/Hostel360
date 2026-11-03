import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET || "Hostel360_Default_Secure_Key_2026_At_Least_32_Chars";
  return secret;
}

export function validateTokenConfig() {
  const secret = getSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  jwt.sign({ sub: "configuration-check", role: "student", ver: 0 }, secret, { expiresIn });
}

export function createAccessToken(payload) {
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

