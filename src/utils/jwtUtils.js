import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate a JWT token for a user
 * @param {object} payload - User data to encode
 * @returns {string} - JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
