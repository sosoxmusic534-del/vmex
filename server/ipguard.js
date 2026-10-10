import crypto from "node:crypto";
import db from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS ip_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ip         TEXT NOT NULL,
    kind       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ip_events ON ip_events(ip, kind, created_at);
`);

/* Real visitor IP (Cloudflare Tunnel sends it in CF-Connecting-IP) */
export function clientIp(req) {
  return String(req.headers["cf-connecting-ip"] || req.ip || "").replace(/^::ffff:/, "");
}

/* Long-lived random ID for this browser */
const DEVICE_COOKIE = "vmex_dev";
export function deviceId(req, res) {
  let id = req.cookies?.[DEVICE_COOKIE];
  if (!/^[a-f0-9]{32}$/.test(id || "")) {
    id = crypto.randomBytes(16).toString("hex");
    res.cookie(DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 365 * 86400000,
      path: "/",
    });
  }
  return id;
}

/* Same inbox = same key (stops name+1@gmail.com and n.a.m.e@gmail.com tricks) */
export function emailKey(email) {
  let [local = "", domain = ""] = String(email).toLowerCase().trim().split("@");
  local = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

const DISPOSABLE = new Set([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
  "tempmail.com", "temp-mail.org", "tempmail.net", "tmpmail.org", "yopmail.com", "trashmail.com",
  "getnada.com", "dispostable.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com",
  "mintemail.com", "emailondeck.com", "tempr.email", "moakt.com", "mohmal.com", "1secmail.com",
  "mailnesia.com", "mytemp.email", "burnermail.io", "spamgourmet.com",
]);
export const isDisposable = (email) => DISPOSABLE.has(String(email).split("@")[1]?.toLowerCase() || "");

/* VPN / proxy / country lookup (proxycheck.io), cached 6 hours */
const ipCache = new Map();
export async function checkIp(ip) {
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return { proxy: false, type: "local", country: null, provider: null };
  }
  const hit = ipCache.get(ip);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.data;
  try {
    const key = process.env.PROXYCHECK_KEY ? `&key=${encodeURIComponent(process.env.PROXYCHECK_KEY)}` : "";
    const res = await fetch(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=1${key}`, {
      signal: AbortSignal.timeout(5000),
    });
    const info = (await res.json())?.[ip] || {};
    const data = {
      proxy: info.proxy === "yes",
      type: info.type || null,
      country: info.isocode || null,
      provider: info.provider || null,
    };
    if (ipCache.size > 5000) ipCache.clear();
    ipCache.set(ip, { at: Date.now(), data });
    return data;
  } catch {
    return { proxy: false, type: "unknown", country: null, provider: null };
  }
}

/* Limit new accounts per IP (soft, because mobile networks share IPs) */
const SIGNUP_MAX = Number(process.env.MAX_SIGNUPS_PER_IP || 3);
const SIGNUP_HOURS = Number(process.env.SIGNUP_WINDOW_HOURS || 24);
const countSignups = db.prepare(
  "SELECT COUNT(*) AS n FROM ip_events WHERE ip = ? AND kind = 'register' AND created_at > datetime('now', ?)"
);
const addEvent = db.prepare("INSERT INTO ip_events (ip, kind) VALUES (?, ?)");

export function registerGuard(req, res, next) {
  const ip = clientIp(req);
  if (ip && countSignups.get(ip, `-${SIGNUP_HOURS} hours`).n >= SIGNUP_MAX) {
    return res.status(429).json({
      error: "Too many accounts were created from this network recently. Please log in to your existing account or try again later.",
    });
  }
  res.on("finish", () => {
    if (res.statusCode < 400 && ip) addEvent.run(ip, "register");
  });
  next();
}