import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { publicUser, setAuthCookie, clearAuthCookie, requireAuth } from "../auth.js";
import { HttpError } from "../errors.js";
import { createChallenge, refreshChallenge, verifyChallenge } from "../otp.js";
import { sendOtpEmail } from "../mailer.js";

/* Discord logs are optional — works even if discord.js doesn't exist */
let notify = () => {};
import("../discord.js").then((m) => (notify = m.notify)).catch(() => {});

const r = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password", 12);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const OTP_LOGIN = (process.env.LOGIN_OTP ?? "on") !== "off";

const q = {
  findByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  findById: db.prepare("SELECT * FROM users WHERE id = ?"),
  insertUser: db.prepare(
    "INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, 0)"
  ),
  deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
  markVerified: db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?"),
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

const maskEmail = (email) => {
  const [user, domain] = email.split("@");
  const shown = user.length <= 2 ? `${user[0]}*` : `${user[0]}***${user.slice(-1)}`;
  return `${shown}@${domain}`;
};

/* Creates a code, emails it, and tells the frontend to show the code screen */
async function sendCode(res, user, purpose, status = 200) {
  const { id, code } = createChallenge(user.id, purpose);
  try {
    await sendOtpEmail(user.email, user.name, code, purpose);
  } catch (e) {
    console.error("[mail]", e.message);
    throw new HttpError(502, "We couldn't send the email code. Please try again in a moment.");
  }
  console.log(`[otp] ${purpose} code sent to ${user.email}`);
  res.status(status).json({ otpRequired: true, challengeId: id, email: maskEmail(user.email), purpose });
}

/* ---------- Register → always needs a code ---------- */
r.post("/register", limiter, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (name.length < 2 || name.length > 50) throw new HttpError(400, "Name must be 2–50 characters.");
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, "Please enter a valid email address.");
  if (password.length < 8 || password.length > 128) throw new HttpError(400, "Password must be 8–128 characters.");

  const existing = q.findByEmail.get(email);
  if (existing && existing.email_verified) {
    throw new HttpError(409, "An account with this email already exists. Please log in.");
  }
  if (existing) q.deleteUser.run(existing.id); // unfinished sign-up → start fresh

  const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? "admin" : "customer";
  const hash = await bcrypt.hash(password, 12);
  const { lastInsertRowid } = q.insertUser.run(name, email, hash, role);
  const user = q.findById.get(lastInsertRowid);

  try {
    await sendCode(res, user, "verify", 201);
    notify({ title: "🆕 New registration (waiting for code)", fields: [{ name: "Email", value: email }, { name: "IP", value: req.ip }] });
  } catch (e) {
    q.deleteUser.run(user.id);
    throw e;
  }
});

/* ---------- Login → password, then a code ---------- */
r.post("/login", limiter, async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const user = q.findByEmail.get(email);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) {
    notify({ title: "⚠️ Failed login", color: "warn", fields: [{ name: "Email tried", value: email || "(empty)" }, { name: "IP", value: req.ip }] });
    throw new HttpError(401, "Invalid email or password.");
  }

  if (!user.email_verified) return sendCode(res, user, "verify");
  if (OTP_LOGIN) return sendCode(res, user, "login");

  setAuthCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

/* ---------- Check the code → log in ---------- */
r.post("/otp/verify", otpLimiter, (req, res) => {
  const challenge = verifyChallenge(req.body?.challengeId, req.body?.code);
  if (challenge.purpose === "verify") q.markVerified.run(challenge.user_id);

  const user = q.findById.get(challenge.user_id);
  if (!user) throw new HttpError(404, "Account not found.");

  setAuthCookie(res, user.id);
  notify({
    title: challenge.purpose === "verify" ? "✅ New account verified" : "✅ Login",
    color: "success",
    fields: [{ name: "User", value: `${user.name} (${user.email})` }, { name: "Role", value: user.role }, { name: "IP", value: req.ip }],
  });
  res.json({ user: publicUser(user) });
});

/* ---------- Resend code ---------- */
r.post("/otp/resend", otpLimiter, async (req, res) => {
  const { challenge, code } = refreshChallenge(req.body?.challengeId);
  const user = q.findById.get(challenge.user_id);
  if (!user) throw new HttpError(404, "Account not found.");

  try {
    await sendOtpEmail(user.email, user.name, code, challenge.purpose);
  } catch (e) {
    console.error("[mail]", e.message);
    throw new HttpError(502, "We couldn't send the email. Please try again in a moment.");
  }
  res.json({ ok: true });
});

r.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

r.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default r;