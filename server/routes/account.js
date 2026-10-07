import { Router } from "express";
import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { requireAuth, publicUser } from "../auth.js";
import { HttpError } from "../errors.js";
import { receiptUpload, checkMagic, isImage, RECEIPT_DIR } from "../uploads.js";

let notify = () => {};
import("../discord.js").then((m) => (notify = m.notify)).catch(() => {});

const r = Router();
r.use(requireAuth);

const q = {
  user: db.prepare("SELECT * FROM users WHERE id = ?"),
  updateName: db.prepare("UPDATE users SET name = ? WHERE id = ?"),
  updatePass: db.prepare("UPDATE users SET password_hash = ? WHERE id = ?"),
  stats: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM invoices WHERE user_id = @id AND status = 'paid') AS completed,
      (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE user_id = @id AND status = 'paid') AS spent,
      (SELECT COUNT(*) FROM services WHERE user_id = @id AND expires_at > @now) AS active,
      (SELECT COUNT(*) FROM tickets WHERE user_id = @id AND status != 'closed') AS tickets`),
  history: db.prepare("SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50"),
  topups: db.prepare(`
    SELECT t.*, pm.instructions AS pm_instructions FROM topups t
    LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
    WHERE t.user_id = ? ORDER BY t.id DESC LIMIT 30`),
  topupById: db.prepare(`
    SELECT t.*, pm.instructions AS pm_instructions FROM topups t
    LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id WHERE t.id = ?`),
  ownTopup: db.prepare("SELECT * FROM topups WHERE id = ? AND user_id = ?"),
  method: db.prepare("SELECT * FROM payment_methods WHERE id = ?"),
  pendingTopups: db.prepare("SELECT COUNT(*) AS n FROM topups WHERE user_id = ? AND status = 'pending'"),
  refExists: db.prepare("SELECT 1 FROM topups WHERE reference = ?"),
  insertTopup: db.prepare(
    "INSERT INTO topups (user_id, reference, amount, payment_method_id, payment_method_name) VALUES (?, ?, ?, ?, ?)"
  ),
  setReceipt: db.prepare(`
    UPDATE topups SET receipt_file = ?, receipt_uploaded_at = datetime('now'),
      status = 'pending', reject_reason = NULL WHERE id = ?`),
  cancel: db.prepare("UPDATE topups SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'pending'"),
};

const mapTopup = (t) => ({
  id: t.id,
  reference: t.reference,
  amount: t.amount,
  paymentMethod: t.payment_method_name,
  status: t.status,
  hasReceipt: Boolean(t.receipt_file),
  receiptUrl: t.receipt_file ? `/api/files/receipts/${t.receipt_file}` : null,
  receiptUploadedAt: t.receipt_uploaded_at,
  rejectReason: t.status === "rejected" ? t.reject_reason : null,
  instructions: ["pending", "rejected"].includes(t.status) ? t.pm_instructions ?? null : null,
  createdAt: t.created_at,
  paidAt: t.paid_at,
});

const mapTx = (x) => ({
  id: x.id,
  amount: x.amount,
  balanceAfter: x.balance_after,
  type: x.type,
  note: x.note,
  createdAt: x.created_at,
});

r.get("/", (req, res) => {
  const user = q.user.get(req.user.id);
  const s = q.stats.get({ id: user.id, now: Date.now() });
  res.json({
    user: publicUser(user),
    stats: {
      completedOrders: s.completed,
      totalSpent: s.spent,
      activeServices: s.active,
      openTickets: s.tickets,
    },
  });
});

r.patch("/", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (name.length < 2 || name.length > 50) throw new HttpError(400, "Name must be 2–50 characters.");
  q.updateName.run(name, req.user.id);
  res.json({ user: publicUser(q.user.get(req.user.id)) });
});

r.post("/password", async (req, res) => {
  const current = String(req.body?.current ?? "");
  const next = String(req.body?.next ?? "");
  const user = q.user.get(req.user.id);

  if (!(await bcrypt.compare(current, user.password_hash))) throw new HttpError(400, "Your current password is wrong.");
  if (next.length < 8 || next.length > 128) throw new HttpError(400, "New password must be 8–128 characters.");
  if (next === current) throw new HttpError(400, "Choose a different password from the current one.");

  q.updatePass.run(await bcrypt.hash(next, 12), user.id);
  notify({ title: "🔑 Password changed", fields: [{ name: "User", value: `${user.name} (${user.email})` }, { name: "IP", value: req.ip }] });
  res.json({ ok: true });
});

r.get("/credit", (req, res) => {
  res.json({
    balance: q.user.get(req.user.id).balance,
    transactions: q.history.all(req.user.id).map(mapTx),
  });
});

r.get("/topups", (req, res) => {
  res.json({ topups: q.topups.all(req.user.id).map(mapTopup) });
});

r.post("/topups", (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount < 100 || amount > 100000) {
    throw new HttpError(400, "Top-up amount must be between LKR 100 and LKR 100,000.");
  }

  const method = q.method.get(Number(req.body?.paymentMethodId));
  if (!method || method.status !== "active" || method.type !== "manual") {
    throw new HttpError(400, "Please choose an available payment method.");
  }
  if (q.pendingTopups.get(req.user.id).n >= 3) {
    throw new HttpError(400, "You already have 3 pending top-ups. Please wait for them to be approved.");
  }

  let reference;
  do {
    reference = `TOP-${crypto.randomInt(100000, 999999)}`;
  } while (q.refExists.get(reference));

  const id = q.insertTopup.run(req.user.id, reference, amount, method.id, method.name).lastInsertRowid;
  notify({
    title: "💳 New top-up request",
    fields: [
      { name: "Reference", value: `#${reference}` },
      { name: "Customer", value: `${req.user.name} (${req.user.email})` },
      { name: "Amount", value: `LKR ${amount}` },
      { name: "Method", value: method.name },
    ],
  });
  res.status(201).json({ topup: mapTopup(q.topupById.get(id)) });
});

r.post("/topups/:id/receipt", receiptUpload, async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, "Please choose a slip file.");

  const t = q.ownTopup.get(Number(req.params.id), req.user.id);
  if (!t || !["pending", "rejected"].includes(t.status)) {
    await fsp.unlink(file.path).catch(() => {});
    throw new HttpError(400, "You can only add a slip to a pending or rejected top-up.");
  }

  await checkMagic(file.path);
  if (t.receipt_file) await fsp.unlink(path.join(RECEIPT_DIR, t.receipt_file)).catch(() => {});
  q.setReceipt.run(file.filename, t.id);

  notify({
    title: "🧾 Top-up slip uploaded — needs approval",
    color: "warn",
    fields: [
      { name: "Reference", value: `#${t.reference}` },
      { name: "Customer", value: `${req.user.name} (${req.user.email})` },
      { name: "Amount", value: `LKR ${t.amount}` },
    ],
    file: { path: file.path, mime: file.mimetype, isImage: isImage(file.filename) },
  });
  res.json({ topup: mapTopup(q.topupById.get(t.id)) });
});

r.post("/topups/:id/cancel", (req, res) => {
  if (!q.cancel.run(Number(req.params.id), req.user.id).changes) {
    throw new HttpError(400, "Only pending top-ups can be cancelled.");
  }
  res.json({ ok: true });
});

export default r;
