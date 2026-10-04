import jwt from "jsonwebtoken";
import db from "./db.js";

export const isProd = process.env.NODE_ENV === "production";
export const COOKIE = "vmex_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

if (isProd && !process.env.JWT_SECRET) {
  console.error("JWT_SECRET must be set in production.");
  process.exit(1);
}

const findById = db.prepare("SELECT * FROM users WHERE id = ?");

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  balance: u.balance ?? 0,
  createdAt: u.created_at,
});

export function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export const clearAuthCookie = (res) => res.clearCookie(COOKIE, { path: "/" });

export function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE];
  if (!token) return res.status(401).json({ error: "Not logged in." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findById.get(Number(payload.sub));
    if (!user) throw new Error("User not found");
    req.user = user;
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => requireAuth(req, res, () => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You don't have permission for this." });
    next();
  });
}

export const requireAdmin = requireRole("admin");
export const requireStaff = requireRole("staff", "admin");