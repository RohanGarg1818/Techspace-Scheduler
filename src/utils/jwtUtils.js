import jwt from "jsonwebtoken";

const DEFAULT_SECRET = "your-secret-key-change-this";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (JWT_SECRET === DEFAULT_SECRET) {
  console.warn(
    "[SECURITY WARNING] JWT_SECRET is not set. Using the insecure default. Set JWT_SECRET in your .env file.",
  );
}

/**
 * Generate a JWT token for a user
 * @param {object} payload - User data to encode
 * @returns {string} - JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate a token that embeds the user's current passwordChangedAt timestamp.
 * authenticate() will reject tokens issued before the latest password change.
 */
export const generateTokenWithPasswordVersion = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      pwv: user.passwordChangedAt ?? 0,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
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
