import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireStaff } from "../auth.js";
import { notify } from "../discord.js";

/* ---------- Tables (created automatically) ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    TEXT NOT NULL,
    category   TEXT NOT NULL DEFAULT 'general',
    priority   TEXT NOT NULL DEFAULT 'normal',
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_staff   INTEGER NOT NULL DEFAULT 0,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
  CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages(ticket_id);
`);

const CATEGORIES = ["general", "billing", "technical", "config", "other"];
const PRIORITIES = ["low", "normal", "high"];
const STATUSES = ["open", "answered", "closed"];
const MAX_OPEN = 5;

const TICKET_SELECT = `
  SELECT t.*, u.name AS user_name, u.email AS user_email,
    (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
  FROM tickets t
  JOIN users u ON u.id = t.user_id`;

const q = {
  mine: db.prepare(`${TICKET_SELECT} WHERE t.user_id = ? ORDER BY t.updated_at DESC, t.id DESC`),
  all: db.prepare(`${TICKET_SELECT}
    ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'answered' THEN 1 ELSE 2 END, t.updated_at DESC`),
  byStatus: db.prepare(`${TICKET_SELECT} WHERE t.status = ? ORDER BY t.updated_at DESC`),
  byId: db.prepare(`${TICKET_SELECT} WHERE t.id = ?`),
  openCount: db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE user_id = ? AND status != 'closed'"),
  counts: db.prepare("SELECT status, COUNT(*) AS n FROM tickets GROUP BY status"),
  insertTicket: db.prepare("INSERT INTO tickets (user_id, subject, category, priority) VALUES (?, ?, ?, ?)"),
  insertMsg: db.prepare("INSERT INTO ticket_messages (ticket_id, user_id, is_staff, body) VALUES (?, ?, ?, ?)"),
  messages: db.prepare(`
    SELECT m.*, u.name AS author FROM ticket_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.ticket_id = ? ORDER BY m.id`),
  setStatus: db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?"),
};

const mapTicket = (t) => ({
  id: t.id,
  subject: t.subject,
  category: t.category,
  priority: t.priority,
  status: t.status,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  messageCount: t.message_count,
  user: { id: t.user_id, name: t.user_name, email: t.user_email },
});

const mapMsg = (m) => ({
  id: m.id,
  body: m.body,
  isStaff: !!m.is_staff,
  author: m.author,
  createdAt: m.created_at,
});

const idParam = (req) => {
  const n = Number(req.params.id);
  return Number.isInteger(n) && n > 0 ? n : 0;
};

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

/* =====================================================
   Customer routes → /api/portal/tickets
   ===================================================== */
export const customerTickets = Router();
customerTickets.use(requireAuth);

customerTickets.get("/", (req, res) => {
  res.json({ tickets: q.mine.all(req.user.id).map(mapTicket) });
});

customerTickets.post("/", (req, res) => {
  const subject = clean(req.body?.subject, 120);
  const message = clean(req.body?.message, 5000);
  const category = CATEGORIES.includes(req.body?.category) ? req.body.category : "general";
  const priority = PRIORITIES.includes(req.body?.priority) ? req.body.priority : "normal";

  if (subject.length < 4) return res.status(400).json({ error: "Subject must be at least 4 characters." });
  if (message.length < 10) return res.status(400).json({ error: "Please describe your issue (at least 10 characters)." });
  if (q.openCount.get(req.user.id).n >= MAX_OPEN)
    return res.status(429).json({ error: `You already have ${MAX_OPEN} open tickets. Please close one or wait for a reply.` });

  const id = db.transaction(() => {
    const { lastInsertRowid } = q.insertTicket.run(req.user.id, subject, category, priority);
    q.insertMsg.run(lastInsertRowid, req.user.id, 0, message);
    return Number(lastInsertRowid);
  })();

  notify({
    title: `🎫 New ticket #${id}`,
    description: message.slice(0, 500),
    fields: [
      { name: "Subject", value: subject },
      { name: "Category", value: category },
      { name: "Customer", value: `${req.user.name} (${req.user.email})` },
    ],
  });

  res.status(201).json({ ticket: mapTicket(q.byId.get(id)) });
});

function ownTicket(req, res) {
  const t = q.byId.get(idParam(req));
  if (!t || t.user_id !== req.user.id) {
    res.status(404).json({ error: "Ticket not found." });
    return null;
  }
  return t;
}

customerTickets.get("/:id", (req, res) => {
  const t = ownTicket(req, res);
  if (!t) return;
  res.json({ ticket: mapTicket(t), messages: q.messages.all(t.id).map(mapMsg) });
});

customerTickets.post("/:id/reply", (req, res) => {
  const t = ownTicket(req, res);
  if (!t) return;
  const body = clean(req.body?.message, 5000);
  if (body.length < 2) return res.status(400).json({ error: "Message is too short." });

  db.transaction(() => {
    q.insertMsg.run(t.id, req.user.id, 0, body);
    q.setStatus.run("open", t.id);
  })();
  notify({
    title: `💬 Customer replied on ticket #${t.id}`,
    description: body.slice(0, 500),
    fields: [{ name: "Subject", value: t.subject }, { name: "Customer", value: req.user.name }],
  });
  res.json({ ok: true });
});

customerTickets.post("/:id/close", (req, res) => {
  const t = ownTicket(req, res);
  if (!t) return;
  q.setStatus.run("closed", t.id);
  res.json({ ok: true });
});

/* =====================================================
   Admin / staff routes → /api/admin/tickets
   ===================================================== */
export const adminTickets = Router();
adminTickets.use(requireStaff);

adminTickets.get("/", (req, res) => {
  const status = String(req.query.status || "all");
  const rows = STATUSES.includes(status) ? q.byStatus.all(status) : q.all.all();
  const counts = Object.fromEntries(q.counts.all().map((r) => [r.status, r.n]));
  res.json({ tickets: rows.map(mapTicket), counts });
});

adminTickets.get("/:id", (req, res) => {
  const t = q.byId.get(idParam(req));
  if (!t) return res.status(404).json({ error: "Ticket not found." });
  res.json({ ticket: mapTicket(t), messages: q.messages.all(t.id).map(mapMsg) });
});

adminTickets.post("/:id/reply", (req, res) => {
  const t = q.byId.get(idParam(req));
  if (!t) return res.status(404).json({ error: "Ticket not found." });
  const body = clean(req.body?.message, 5000);
  if (body.length < 2) return res.status(400).json({ error: "Message is too short." });

  db.transaction(() => {
    q.insertMsg.run(t.id, req.user.id, 1, body);
    q.setStatus.run("answered", t.id);
  })();
  notify({
    title: `🛟 Staff replied on ticket #${t.id}`,
    description: body.slice(0, 500),
    color: "success",
    fields: [{ name: "Subject", value: t.subject }, { name: "Staff", value: req.user.name }],
  });
  res.json({ ok: true });
});

adminTickets.post("/:id/status", (req, res) => {
  const t = q.byId.get(idParam(req));
  if (!t) return res.status(404).json({ error: "Ticket not found." });
  const status = String(req.body?.status);
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status." });
  q.setStatus.run(status, t.id);
  res.json({ ok: true });
});
