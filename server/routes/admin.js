import { Router } from "express";
import db, { getSetting, setSetting } from "../db.js";
import { requireAdmin } from "../auth.js";
import { notify } from "../discord.js";
import { mapCarrier, mapInvoice, mapMethod, mapPackage, mapPlan } from "../mappers.js";
import { HttpError, provisionInvoice } from "../provision.js";
import {
  removeClientByEmail, enrichServices, isConfigured,
  listInbounds, parseJson, resetXuiSession, xuiConfig,
} from "../xui.js";

const r = Router();
r.use(requireAdmin);

const INVOICE_SELECT = `
  SELECT i.*, p.name AS plan_name, u.name AS user_name, u.email AS user_email,
    pm.instructions AS pm_instructions
  FROM invoices i
  JOIN plans p ON p.id = i.plan_id
  JOIN users u ON u.id = i.user_id
  LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id`;

const q = {
  users: db.prepare("SELECT COUNT(*) AS n FROM users"),
  activeServices: db.prepare("SELECT COUNT(*) AS n FROM services WHERE expires_at > ?"),
  pending: db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE status = 'pending'"),
  revenue: db.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM invoices WHERE status = 'paid'"),
  recent: db.prepare(`${INVOICE_SELECT} ORDER BY i.id DESC LIMIT 8`),
  invoicesAll: db.prepare(`${INVOICE_SELECT} ORDER BY i.id DESC`),
  invoicesBy: db.prepare(`${INVOICE_SELECT} WHERE i.status = ? ORDER BY i.id DESC`),
  invoice: db.prepare("SELECT * FROM invoices WHERE id = ?"),
  invoiceFull: db.prepare(`${INVOICE_SELECT} WHERE i.id = ?`),
  rejectInvoice: db.prepare("UPDATE invoices SET status = 'rejected', reject_reason = ? WHERE id = ? AND status = 'pending'"),
  planById: db.prepare("SELECT * FROM plans WHERE id = ?"),
  plans: db.prepare("SELECT * FROM plans ORDER BY price"),
  updatePlan: db.prepare(
    "UPDATE plans SET inbound_id = ?, inbound_ids = ?, price = ?, data_gb = ?, days = ?, active = ? WHERE id = ?"
  ),
  insertService: db.prepare(`
    INSERT INTO services (user_id, plan_id, invoice_id, name, inbound_id, inbound_ids, protocol,
      client_email, client_id, sub_id, total_bytes, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  markPaid: db.prepare("UPDATE invoices SET status = 'paid', paid_at = datetime('now') WHERE id = ?"),
  markCancelled: db.prepare("UPDATE invoices SET status = 'cancelled' WHERE id = ? AND status = 'pending'"),
  userList: db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM services s WHERE s.user_id = u.id) AS services,
      (SELECT COALESCE(SUM(amount), 0) FROM invoices i WHERE i.user_id = u.id AND i.status = 'paid') AS spent
    FROM users u ORDER BY u.id DESC`),
  userById: db.prepare("SELECT * FROM users WHERE id = ?"),
  setRole: db.prepare("UPDATE users SET role = ? WHERE id = ?"),
  addBalance: db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?"),
  serviceList: db.prepare(`
    SELECT s.*, p.name AS plan_name, u.name AS user_name, u.email AS user_email
    FROM services s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN plans p ON p.id = s.plan_id
    ORDER BY s.id DESC`),
  serviceById: db.prepare("SELECT * FROM services WHERE id = ?"),
  deleteService: db.prepare("DELETE FROM services WHERE id = ?"),
  carriers: db.prepare("SELECT * FROM carriers ORDER BY sort, id"),
  carrierById: db.prepare("SELECT * FROM carriers WHERE id = ?"),
  insCarrier: db.prepare("INSERT INTO carriers (name, logo, sort, active) VALUES (?, ?, ?, ?)"),
  updCarrier: db.prepare("UPDATE carriers SET name = ?, logo = ?, sort = ?, active = ? WHERE id = ?"),
  delCarrier: db.prepare("DELETE FROM carriers WHERE id = ?"),
  packages: db.prepare("SELECT * FROM sni_packages ORDER BY carrier_id, sort, id"),
  packageById: db.prepare("SELECT * FROM sni_packages WHERE id = ?"),
  insPackage: db.prepare(`
    INSERT INTO sni_packages (carrier_id, device, name, sni, tag, inbound_ids, sort, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  updPackage: db.prepare(`
    UPDATE sni_packages SET carrier_id = ?, device = ?, name = ?, sni = ?, tag = ?, inbound_ids = ?, sort = ?, active = ?
    WHERE id = ?`),
  delPackage: db.prepare("DELETE FROM sni_packages WHERE id = ?"),
  methods: db.prepare("SELECT * FROM payment_methods ORDER BY sort, id"),
  methodById: db.prepare("SELECT * FROM payment_methods WHERE id = ?"),
  insMethod: db.prepare(`
    INSERT INTO payment_methods (name, type, icon, description, instructions, status, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?)`),
  updMethod: db.prepare(`
    UPDATE payment_methods SET name = ?, type = ?, icon = ?, description = ?, instructions = ?, status = ?, sort = ?
    WHERE id = ?`),
  delMethod: db.prepare("DELETE FROM payment_methods WHERE id = ?"),
};

const text = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const intOr = (value, fallback = 0) => (Number.isInteger(Number(value)) ? Number(value) : fallback);
const idList = (value) => (Array.isArray(value) ? [...new Set(value.map(Number))].filter(Number.isInteger) : []);
const idParam = (req) => Number(req.params.id);

const xuiPublic = () => {
  const c = xuiConfig();
  return {
    url: c.url,
    authMode: c.authMode,
    username: c.username,
    hasPassword: Boolean(c.password),
    hasToken: Boolean(c.token),
    subUrl: c.subUrl,
    insecure: c.insecure,
  };
};

/* ---------- Overview ---------- */
r.get("/overview", async (_req, res) => {
  let xui = { configured: isConfigured(), ok: false };
  if (xui.configured) {
    try {
      xui = { ...xui, ok: true, inbounds: (await listInbounds()).length };
    } catch (e) {
      xui = { ...xui, error: e.message };
    }
  }
  res.json({
    counts: {
      users: q.users.get().n,
      activeServices: q.activeServices.get(Date.now()).n,
      pendingInvoices: q.pending.get().n,
      revenue: q.revenue.get().n,
    },
    xui,
    recentInvoices: q.recent.all().map(mapInvoice),
  });
});

/* ---------- X-UI connection ---------- */
r.get("/xui", (_req, res) => res.json(xuiPublic()));

r.put("/xui", (req, res) => {
  const url = String(req.body?.url ?? "").trim();
  const subUrl = String(req.body?.subUrl ?? "").trim();
  const authMode = req.body?.authMode === "token" ? "token" : "password";
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");
  const token = String(req.body?.token ?? "").trim();

  if (!/^https?:\/\/.+/i.test(url))
    return res.status(400).json({ error: "Panel URL must start with http:// or https://" });
  if (subUrl && !/^https?:\/\/.+/i.test(subUrl))
    return res.status(400).json({ error: "Subscription URL must start with http:// or https://" });
  if (authMode === "token") {
    if (!token && !getSetting("xui_token"))
      return res.status(400).json({ error: "API token is required." });
  } else {
    if (!username) return res.status(400).json({ error: "Username is required." });
    if (!password && !getSetting("xui_password"))
      return res.status(400).json({ error: "Password is required." });
  }

  setSetting("xui_url", url);
  setSetting("xui_sub_url", subUrl);
  setSetting("xui_auth", authMode);
  setSetting("xui_username", username);
  setSetting("xui_insecure", req.body?.insecure ? "1" : "0");
  if (password) setSetting("xui_password", password);
  if (token) setSetting("xui_token", token);

  resetXuiSession();
  res.json(xuiPublic());
});

r.post("/xui/test", async (_req, res) => {
  resetXuiSession();
  const inbounds = await listInbounds();
  res.json({ ok: true, inbounds: inbounds.length });
});

r.get("/inbounds", async (_req, res) => {
  const list = await listInbounds();
  res.json({
    inbounds: list.map((ib) => ({
      id: ib.id,
      remark: ib.remark,
      protocol: ib.protocol,
      port: ib.port,
      enable: ib.enable,
      up: ib.up,
      down: ib.down,
      total: ib.total,
      clients: (parseJson(ib.settings).clients || []).length,
    })),
  });
});

/* ---------- Plans ---------- */
r.get("/plans", (_req, res) => {
  res.json({ plans: q.plans.all().map((p) => mapPlan(p, true)) });
});

r.put("/plans/:id", (req, res) => {
  const plan = q.planById.get(Number(req.params.id));
  if (!plan) return res.status(404).json({ error: "Plan not found." });

  const b = req.body ?? {};
  const inboundIds = Array.isArray(b.inboundIds) ? [...new Set(b.inboundIds.map(Number))] : [];
  const price = Number(b.price);
  const dataGb = Number(b.dataGb);
  const days = Number(b.days);

  if (!inboundIds.every(Number.isInteger)) return res.status(400).json({ error: "Invalid inbound list." });
  if (!Number.isInteger(price) || price < 0) return res.status(400).json({ error: "Invalid price." });
  if (!Number.isInteger(dataGb) || dataGb < 0) return res.status(400).json({ error: "Invalid data amount." });
  if (!Number.isInteger(days) || days < 1 || days > 3650) return res.status(400).json({ error: "Invalid days." });

  q.updatePlan.run(inboundIds[0] ?? null, JSON.stringify(inboundIds), price, dataGb, days, b.active ? 1 : 0, plan.id);
  res.json({ plan: mapPlan(q.planById.get(plan.id), true) });
});

/* ---------- Carriers ---------- */
const carrierBody = (body = {}) => {
  const name = text(body.name, 60);
  if (!name) throw new HttpError(400, "Carrier name is required.");
  return [name, text(body.logo, 300), intOr(body.sort), body.active ? 1 : 0];
};

r.get("/carriers", (_req, res) => res.json({ carriers: q.carriers.all().map((carrier) => mapCarrier(carrier, true)) }));
r.post("/carriers", (req, res) => {
  const id = q.insCarrier.run(...carrierBody(req.body)).lastInsertRowid;
  res.status(201).json({ carrier: mapCarrier(q.carrierById.get(id), true) });
});
r.put("/carriers/:id", (req, res) => {
  if (!q.updCarrier.run(...carrierBody(req.body), idParam(req)).changes) throw new HttpError(404, "Carrier not found.");
  res.json({ ok: true });
});
r.delete("/carriers/:id", (req, res) => {
  q.delCarrier.run(idParam(req));
  res.json({ ok: true });
});

/* ---------- SNI packages ---------- */
const packageBody = (body = {}) => {
  const carrierId = Number(body.carrierId);
  if (!q.carrierById.get(carrierId)) throw new HttpError(400, "Choose a valid carrier.");
  const name = text(body.name, 100);
  if (!name) throw new HttpError(400, "Package name is required.");
  const device = ["router", "sim", "both"].includes(body.device) ? body.device : "both";
  return [
    carrierId, device, name, text(body.sni, 200), text(body.tag, 40),
    JSON.stringify(idList(body.inboundIds)), intOr(body.sort), body.active ? 1 : 0,
  ];
};

r.get("/packages", (_req, res) => res.json({ packages: q.packages.all().map((pkg) => mapPackage(pkg, true)) }));
r.post("/packages", (req, res) => {
  const id = q.insPackage.run(...packageBody(req.body)).lastInsertRowid;
  res.status(201).json({ package: mapPackage(q.packageById.get(id), true) });
});
r.put("/packages/:id", (req, res) => {
  if (!q.updPackage.run(...packageBody(req.body), idParam(req)).changes) throw new HttpError(404, "Package not found.");
  res.json({ ok: true });
});
r.delete("/packages/:id", (req, res) => {
  q.delPackage.run(idParam(req));
  res.json({ ok: true });
});

/* ---------- Payment methods ---------- */
const methodBody = (body = {}) => {
  const name = text(body.name, 60);
  if (!name) throw new HttpError(400, "Method name is required.");
  const type = body.type === "balance" ? "balance" : "manual";
  const icon = ["bank", "ezcash", "card", "wallet"].includes(body.icon) ? body.icon : "bank";
  const status = ["active", "disabled", "hidden"].includes(body.status) ? body.status : "active";
  return [name, type, icon, text(body.description, 80), text(body.instructions, 2000), status, intOr(body.sort)];
};

r.get("/payment-methods", (_req, res) => res.json({ methods: q.methods.all().map((method) => mapMethod(method, true)) }));
r.post("/payment-methods", (req, res) => {
  const id = q.insMethod.run(...methodBody(req.body)).lastInsertRowid;
  res.status(201).json({ method: mapMethod(q.methodById.get(id), true) });
});
r.put("/payment-methods/:id", (req, res) => {
  if (!q.updMethod.run(...methodBody(req.body), idParam(req)).changes) throw new HttpError(404, "Payment method not found.");
  res.json({ ok: true });
});
r.delete("/payment-methods/:id", (req, res) => {
  q.delMethod.run(idParam(req));
  res.json({ ok: true });
});

/* ---------- Invoices ---------- */
r.get("/invoices", (req, res) => {
  const status = String(req.query.status || "all");
  const rows = ["pending", "paid", "cancelled", "rejected"].includes(status)
    ? q.invoicesBy.all(status)
    : q.invoicesAll.all();
  res.json({ invoices: rows.map(mapInvoice) });
});

r.post("/invoices/:id/approve", async (req, res) => {
  const id = idParam(req);
  await provisionInvoice(id);
  const invoice = q.invoiceFull.get(id);
  notify({
    title: "✅ Payment approved",
    color: "success",
    fields: [
      { name: "Invoice", value: `#${invoice.reference}` },
      { name: "Customer", value: `${invoice.user_name} (${invoice.user_email})` },
      { name: "Amount", value: `LKR ${invoice.amount}` },
      { name: "Approved by", value: req.user.name },
    ],
  });
  res.json({ ok: true });
});

r.post("/invoices/:id/reject", (req, res) => {
  const invoice = q.invoice.get(idParam(req));
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "pending") throw new HttpError(400, "Only pending invoices can be rejected.");
  const reason = text(req.body?.reason, 300) || "We couldn't verify this payment.";
  q.rejectInvoice.run(reason, invoice.id);
  notify({
    title: "❌ Payment rejected",
    color: "danger",
    fields: [
      { name: "Invoice", value: `#${invoice.reference}` },
      { name: "Reason", value: reason, inline: false },
      { name: "Rejected by", value: req.user.name },
    ],
  });
  res.json({ ok: true });
});

r.post("/invoices/:id/cancel", (req, res) => {
  const { changes } = q.markCancelled.run(Number(req.params.id));
  if (!changes) return res.status(400).json({ error: "Only pending invoices can be cancelled." });
  res.json({ ok: true });
});

/* ---------- Users & services ---------- */
r.get("/users", (_req, res) => {
  res.json({
    users: q.userList.all().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      balance: u.balance ?? 0,
      createdAt: u.created_at,
      services: u.services,
      spent: u.spent,
    })),
  });
});

r.patch("/users/:id/role", (req, res) => {
  const role = req.body?.role;
  if (!["customer", "staff", "admin"].includes(role)) throw new HttpError(400, "Invalid role.");
  const user = q.userById.get(idParam(req));
  if (!user) throw new HttpError(404, "User not found.");
  if (user.id === req.user.id && role !== "admin") throw new HttpError(400, "You can't remove your own admin role.");

  q.setRole.run(role, user.id);
  notify({
    title: "🛡️ Role changed",
    fields: [
      { name: "User", value: `${user.name} (${user.email})` },
      { name: "Role", value: `${user.role} → ${role}` },
      { name: "Changed by", value: req.user.name },
    ],
  });
  res.json({ ok: true });
});

r.post("/users/:id/balance", (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    throw new HttpError(400, "Enter a whole LKR amount (use a negative number to deduct).");
  }
  const user = q.userById.get(idParam(req));
  if (!user) throw new HttpError(404, "User not found.");
  if ((user.balance ?? 0) + amount < 0) {
    throw new HttpError(400, `Balance can't go below 0 (current LKR ${user.balance ?? 0}).`);
  }
  q.addBalance.run(amount, user.id);
  res.json({ balance: (user.balance ?? 0) + amount });
});

r.get("/services", async (_req, res) => {
  res.json({ services: await enrichServices(q.serviceList.all()) });
});

r.delete("/services/:id", async (req, res) => {
  const s = q.serviceById.get(Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Service not found." });

  let panelRemoved = true;
  let panelError = null;
  try {
    const inboundIds = JSON.parse(s.inbound_ids || "[]");
    await removeClientByEmail(inboundIds.length ? inboundIds : [s.inbound_id], s.client_email);
  } catch (e) {
    panelRemoved = false;
    panelError = e.message;
    if (!req.query.force) throw e;
  }
  q.deleteService.run(s.id);
  res.json({ ok: true, panelRemoved, ...(panelError ? { warning: panelError } : {}) });
});

export default r;