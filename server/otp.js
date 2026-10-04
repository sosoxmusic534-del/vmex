import crypto from "node:crypto";
import db from "./db.js";
import { HttpError } from "./errors.js";

const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const TTL = 10 * 60 * 1000;   // code works for 10 minutes
const COOLDOWN = 60 * 1000;   // 60s between resends
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 5;

const hash = (id, code) => crypto.createHmac("sha256", SECRET).update(`${id}:${code}`).digest("hex");
const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const q = {
  insert: db.prepare(
    "INSERT INTO otp_challenges (id, user_id, purpose, code_hash, expires_at, last_sent_at) VALUES (?, ?, ?, ?, ?, ?)"
  ),
  get: db.prepare("SELECT * FROM otp_challenges WHERE id = ?"),
  del: db.prepare("DELETE FROM otp_challenges WHERE id = ?"),
  delForUser: db.prepare("DELETE FROM otp_challenges WHERE user_id = ? AND purpose = ?"),
  attempt: db.prepare("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?"),
  resend: db.prepare(
    "UPDATE otp_challenges SET code_hash = ?, attempts = 0, expires_at = ?, last_sent_at = ?, sends = sends + 1 WHERE id = ?"
  ),
  cleanup: db.prepare("DELETE FROM otp_challenges WHERE expires_at < ?"),
};

export function createChallenge(userId, purpose) {
  q.cleanup.run(Date.now());
  q.delForUser.run(userId, purpose);
  const id = crypto.randomBytes(24).toString("hex");
  const code = newCode();
  const now = Date.now();
  q.insert.run(id, userId, purpose, hash(id, code), now + TTL, now);
  return { id, code };
}

function getChallenge(id) {
  const c = q.get.get(String(id || ""));
  if (!c || c.expires_at < Date.now()) {
    if (c) q.del.run(c.id);
    throw new HttpError(400, "This code has expired. Please start again.");
  }
  return c;
}

export function verifyChallenge(id, code) {
  const c = getChallenge(id);
  if (c.attempts >= MAX_ATTEMPTS) {
    q.del.run(c.id);
    throw new HttpError(429, "Too many wrong codes. Please start again.");
  }

  const given = Buffer.from(hash(c.id, String(code || "").trim()));
  const stored = Buffer.from(c.code_hash);
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    q.attempt.run(c.id);
    const left = MAX_ATTEMPTS - c.attempts - 1;
    throw new HttpError(400, left > 0 ? `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong codes. Please start again.");
  }

  q.del.run(c.id);
  return c;
}

export function refreshChallenge(id) {
  const c = getChallenge(id);
  const wait = c.last_sent_at + COOLDOWN - Date.now();
  if (wait > 0) throw new HttpError(429, `Please wait ${Math.ceil(wait / 1000)}s before asking for a new code.`);
  if (c.sends >= MAX_SENDS) throw new HttpError(429, "Too many codes requested. Please start again.");

  const code = newCode();
  const now = Date.now();
  q.resend.run(hash(c.id, code), now + TTL, now, c.id);
  return { challenge: c, code };
}