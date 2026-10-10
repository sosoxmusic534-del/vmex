import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { HttpError } from "../errors.js";
import { checkIp, clientIp, deviceId, emailKey, isDisposable } from "../ipguard.js";

let notify = () => {};
import("../discord.js").then((m) => (notify = m.notify)).catch(() => {});

const TRIAL_GB = Number(process.env.TRIAL_GB || 5);
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 3);
const TRIAL_IP_DAYS = Number(process.env.TRIAL_IP_DAYS || 7);
const BLOCK_VPN = process.env.TRIAL_BLOCK_VPN !== "0";
const COUNTRY = (process.env.TRIAL_COUNTRY || "").toUpperCase();

db.exec(`
  CREATE TABLE IF NOT EXISTS trial_claims (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER,
    ip         TEXT NOT NULL,
    device_id  TEXT,
    email_key  TEXT NOT NULL,
    country    TEXT,
    proxy      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function trialPlan() {
  let plan = db.prepare("SELECT * FROM plans WHERE slug = 'trial'").get();
  if (!plan) {
    const source = db.prepare(
      "SELECT inbound_id, inbound_ids, protocols FROM plans WHERE active = 1 AND slug != 'trial' ORDER BY price LIMIT 1"
    ).get() || {};
    db.prepare(`
      INSERT INTO plans (slug, name, description, protocols, price, data_gb, days, inbound_id, inbound_ids, active)
      VALUES ('trial', 'Free Trial', ?, ?, 0, ?, ?, ?, ?, 0)`).run(
      `${TRIAL_GB}GB free trial for new customers`, source.protocols || "", TRIAL_GB, TRIAL_DAYS,
      source.inbound_id ?? null, source.inbound_ids || "[]"
    );
    plan = db.prepare("SELECT * FROM plans WHERE slug = 'trial'").get();
  }
  return plan;
}

const q = {
  user: db.prepare("SELECT * FROM users WHERE id = ?"),
  claimByUser: db.prepare("SELECT * FROM trial_claims WHERE user_id = ?"),
  byEmailKey: db.prepare("SELECT 1 FROM trial_claims WHERE email_key = ? LIMIT 1"),
  byDevice: db.prepare("SELECT 1 FROM trial_claims WHERE device_id = ? LIMIT 1"),
  byIpRecent: db.prepare("SELECT 1 FROM trial_claims WHERE ip = ? AND created_at > datetime('now', ?) LIMIT 1"),
  paidOrders: db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE user_id = ? AND plan_id != ? AND status = 'paid'"),
  invoice: db.prepare("SELECT status FROM invoices WHERE id = ?"),
  carriers: db.prepare("SELECT id, name, logo FROM carriers WHERE active = 1 ORDER BY sort, id"),
  packages: db.prepare("SELECT id, carrier_id, device, name, tag FROM sni_packages WHERE active = 1 ORDER BY sort, id"),
  pkg: db.prepare(`
    SELECT p.*, c.name AS carrier_name FROM sni_packages p
    JOIN carriers c ON c.id = p.carrier_id WHERE p.id = ? AND p.active = 1 AND c.active = 1`),
  addInvoice: db.prepare(`
    INSERT INTO invoices (user_id, plan_id, reference, amount, status, device, carrier_name, package_id, package_name, sni, payment_method_name)
    VALUES (?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?, 'Free trial')`),
  addClaim: db.prepare(`
    INSERT INTO trial_claims (user_id, invoice_id, ip, device_id, email_key, country, proxy)
    VALUES (?, ?, ?, ?, ?, ?, ?)`),
};

function accountState(user, planId) {
  const claim = q.claimByUser.get(user.id);
  if (claim) {
    const status = claim.invoice_id ? q.invoice.get(claim.invoice_id)?.status : null;
    if (status === "paid") return { state: "active" };
    if (status === "pending") return { state: "pending" };
    return { state: "used", reason: "You've already used your free trial." };
  }
  if (q.paidOrders.get(user.id, planId).n > 0) return { state: "not_new", reason: "Free trials are for new customers." };
  if (!user.email_verified) return { state: "blocked", reason: "Verify your email first." };
  if (isDisposable(user.email)) return { state: "blocked", reason: "Temporary email addresses can't claim a free trial." };
  if (q.byEmailKey.get(emailKey(user.email))) return { state: "blocked", reason: "A free trial was already claimed with this email." };
  return { state: "eligible" };
}

function networkState(req, res) {
  const device = deviceId(req, res);
  const ip = clientIp(req);
  if (q.byDevice.get(device)) return { state: "blocked", reason: "A free trial was already claimed on this device.", device, ip };
  if (ip && q.byIpRecent.get(ip, `-${TRIAL_IP_DAYS} days`)) {
    return { state: "blocked", reason: "A free trial was claimed from this network recently. Please try again later.", device, ip };
  }
  return { state: "eligible", device, ip };
}

const r = Router();

r.get("/", requireAuth, (req, res) => {
  const plan = trialPlan();
  const user = q.user.get(req.user.id);
  let result = accountState(user, plan.id);
  if (result.state === "eligible") {
    const network = networkState(req, res);
    if (network.state !== "eligible") result = { state: network.state, reason: network.reason };
  }
  res.json({
    ...result,
    trial: { gb: TRIAL_GB, days: TRIAL_DAYS },
    options: result.state === "eligible" ? { carriers: q.carriers.all(), packages: q.packages.all() } : undefined,
  });
});

const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `trial-${req.user.id}`,
  message: { error: "Too many attempts. Please try again later." },
});

r.post("/", requireAuth, claimLimiter, async (req, res) => {
  const plan = trialPlan();
  const user = q.user.get(req.user.id);
  const account = accountState(user, plan.id);
  if (account.state !== "eligible") throw new HttpError(400, account.reason || "You can't claim a free trial right now.");
  const network = networkState(req, res);
  if (network.state !== "eligible") throw new HttpError(400, network.reason);

  const device = req.body?.device === "router" ? "router" : "sim";
  const pkg = q.pkg.get(Number(req.body?.packageId));
  if (!pkg) throw new HttpError(400, "Choose your network package.");
  if (pkg.device !== "both" && pkg.device !== device) throw new HttpError(400, "That package isn't available for this device.");

  const ipInfo = await checkIp(network.ip);
  if (BLOCK_VPN && ipInfo.proxy) throw new HttpError(400, "Please turn off any VPN or proxy and try again to claim your free trial.");
  if (COUNTRY && ipInfo.country && ipInfo.country !== COUNTRY) throw new HttpError(400, "The free trial isn't available in your country.");

  const reference = `TRIAL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const invoiceId = db.transaction(() => {
    const info = q.addInvoice.run(user.id, plan.id, reference, device, pkg.carrier_name, pkg.id, pkg.name, pkg.sni || "");
    q.addClaim.run(user.id, info.lastInsertRowid, network.ip, network.device, emailKey(user.email), ipInfo.country, ipInfo.proxy ? 1 : 0);
    return info.lastInsertRowid;
  })();

  notify({
    title: "Free trial requested",
    fields: [
      { name: "User", value: `${user.name} (${user.email})` },
      { name: "Package", value: `${pkg.carrier_name} · ${pkg.name} (${device})` },
      { name: "IP", value: `${network.ip || "unknown"}${ipInfo.country ? ` · ${ipInfo.country}` : ""}${ipInfo.provider ? ` · ${ipInfo.provider}` : ""}` },
      { name: "Checks", value: ipInfo.type === "unknown" ? "VPN check unavailable" : "Passed" },
      { name: "Invoice", value: reference },
    ],
  });

  res.json({ ok: true, state: "pending", invoiceId, reference });
});

export default r;
