import { Router } from "express";
import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { mapCarrier, mapInvoice, mapMethod, mapPackage, mapPlan } from "../mappers.js";
import { HttpError, provisionInvoice } from "../provision.js";
import { enrichServices, getClientLinks, isConfigured } from "../xui.js";
import { receiptUpload, checkMagic, isImage, RECEIPT_DIR } from "../uploads.js";
import { notify } from "../discord.js";
import { changeCredit } from "../credit.js";

const r = Router();
r.use(requireAuth);

const invoiceSelect = `
  SELECT i.*, p.name AS plan_name, pm.instructions AS pm_instructions
  FROM invoices i
  JOIN plans p ON p.id = i.plan_id
  LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id`;

const q = {
  services: db.prepare(`
    SELECT s.*, p.name AS plan_name FROM services s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = ? ORDER BY s.id DESC`),
  invoices: db.prepare(`${invoiceSelect} WHERE i.user_id = ? ORDER BY i.id DESC`),
  invoiceById: db.prepare(`${invoiceSelect} WHERE i.id = ?`),
  ownInvoice: db.prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?"),
  plans: db.prepare("SELECT * FROM plans WHERE active = 1 ORDER BY price"),
  plan: db.prepare("SELECT * FROM plans WHERE id = ? AND active = 1"),
  carriers: db.prepare("SELECT * FROM carriers WHERE active = 1 ORDER BY sort, id"),
  carrier: db.prepare("SELECT * FROM carriers WHERE id = ? AND active = 1"),
  packages: db.prepare(`
    SELECT p.* FROM sni_packages p JOIN carriers c ON c.id = p.carrier_id
    WHERE p.active = 1 AND c.active = 1 ORDER BY p.sort, p.id`),
  pkg: db.prepare("SELECT * FROM sni_packages WHERE id = ? AND active = 1"),
  methods: db.prepare("SELECT * FROM payment_methods WHERE status != 'hidden' ORDER BY sort, id"),
  method: db.prepare("SELECT * FROM payment_methods WHERE id = ?"),
  user: db.prepare("SELECT * FROM users WHERE id = ?"),
  addBalance: db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?"),
  pending: db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE user_id = ? AND status = 'pending'"),
  refExists: db.prepare("SELECT 1 FROM invoices WHERE reference = ?"),
  insertInvoice: db.prepare(`
    INSERT INTO invoices (user_id, plan_id, reference, amount, device, carrier_name,
      package_id, package_name, sni, payment_method_id, payment_method_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  cancel: db.prepare("UPDATE invoices SET status = 'cancelled' WHERE id = ? AND status = 'pending'"),
  setReceipt: db.prepare(`
    UPDATE invoices SET receipt_file = ?, receipt_uploaded_at = datetime('now'),
      status = 'pending', reject_reason = NULL
    WHERE id = ?`),
};

/* Dashboard */
r.get("/summary", async (req, res) => {
  const services = await enrichServices(q.services.all(req.user.id));
  const invoices = q.invoices.all(req.user.id);
  const active = services.filter((service) => service.status === "active");

  res.json({
    counts: {
      services: services.length,
      active: active.length,
      pendingInvoices: invoices.filter((invoice) => invoice.status === "pending").length,
      totalPaid: invoices.filter((invoice) => invoice.status === "paid").reduce((n, invoice) => n + invoice.amount, 0),
    },
    traffic: {
      used: active.reduce((n, service) => n + (service.usedBytes || 0), 0),
      total: active.reduce((n, service) => n + service.totalBytes, 0),
      unlimited: active.some((service) => service.totalBytes === 0),
    },
    latestService: services[0] ?? null,
    latestInvoice: invoices[0] ? mapInvoice(invoices[0]) : null,
    xuiLive: isConfigured() && (services.length === 0 || services.some((service) => service.live)),
  });
});

/* Services and configs */
r.get("/services", async (req, res) => {
  res.json({ services: await enrichServices(q.services.all(req.user.id)) });
});

r.get("/configs", async (req, res) => {
  const rows = q.services.all(req.user.id);
  const [services, links] = await Promise.all([
    enrichServices(rows),
    Promise.allSettled(rows.map((service) => getClientLinks(service.client_email, service.sub_id))),
  ]);
  const isAdmin = req.user.role === "admin";

  res.json({
    configs: services.map((service, index) => {
      const result = links[index];
      if (result.status === "rejected") {
        console.error(`[configs] ${rows[index].client_email}:`, result.reason?.message || result.reason);
      }
      return {
        ...service,
        links: result.status === "fulfilled" ? result.value : [],
        linksError: result.status === "rejected"
          ? isAdmin
            ? `Admin debug: ${result.reason?.message || result.reason}`
            : "Your configs couldn't be loaded right now. Please try again shortly."
          : null,
      };
    }),
  });
});

/* Billing */
r.get("/invoices", (req, res) => {
  res.json({ invoices: q.invoices.all(req.user.id).map(mapInvoice) });
});

r.get("/plans", (_req, res) => {
  res.json({ plans: q.plans.all().map((plan) => mapPlan(plan)) });
});

r.get("/checkout-options", (req, res) => {
  const user = q.user.get(req.user.id);
  res.json({
    carriers: q.carriers.all().map((carrier) => mapCarrier(carrier)),
    packages: q.packages.all().map((pkg) => mapPackage(pkg)),
    paymentMethods: q.methods.all().map((method) => mapMethod(method)),
    balance: user.balance ?? 0,
  });
});

r.post("/orders", async (req, res) => {
  const body = req.body ?? {};
  const plan = q.plan.get(Number(body.planId));
  if (!plan) throw new HttpError(404, "Plan not found.");

  const device = ["router", "sim"].includes(body.device) ? body.device : null;
  if (!device) throw new HttpError(400, "Please choose a device.");

  const pkg = q.pkg.get(Number(body.packageId));
  if (!pkg) throw new HttpError(400, "Please choose a package.");
  if (pkg.device !== "both" && pkg.device !== device) {
    throw new HttpError(400, "That package isn't available for this device.");
  }

  const carrier = q.carrier.get(pkg.carrier_id);
  if (!carrier) throw new HttpError(400, "That network is not available right now.");

  const method = q.method.get(Number(body.paymentMethodId));
  if (!method || method.status !== "active") throw new HttpError(400, "Please choose an available payment method.");
  if (method.type !== "balance" && q.pending.get(req.user.id).n >= 3) {
    throw new HttpError(400, "You already have 3 pending invoices. Please pay or wait for approval.");
  }

  let reference;
  do {
    reference = `VMX-${crypto.randomInt(100000, 999999)}`;
  } while (q.refExists.get(reference));

  const insertInvoice = () => q.insertInvoice.run(
    req.user.id, plan.id, reference, plan.price, device, carrier.name,
    pkg.id, pkg.name, pkg.sni, method.id, method.name
  ).lastInsertRowid;

  if (method.type === "balance") {
    const invoiceId = db.transaction(() => {
      const user = q.user.get(req.user.id);
      if (user.balance < plan.price) {
        throw new HttpError(400, `Not enough balance. You have LKR ${user.balance}, this plan costs LKR ${plan.price}.`);
      }
      changeCredit(user.id, -plan.price, "purchase", `${plan.name} · ${pkg.name} (#${reference})`);
      return insertInvoice();
    })();

    try {
      await provisionInvoice(invoiceId);
    } catch (error) {
      console.error(`[orders] balance activation failed for invoice ${invoiceId}:`, error.message);
      db.transaction(() => {
        changeCredit(req.user.id, plan.price, "refund", `Refund #${reference} (activation failed)`);
        q.cancel.run(invoiceId);
      })();
      throw new HttpError(502, "We couldn't activate your plan right now. Your balance has been refunded. Please try again or contact support.");
    }

    notify({
      title: "⚡ Plan bought with balance (auto-activated)",
      color: "success",
      fields: [
        { name: "Customer", value: `${req.user.name} (${req.user.email})` },
        { name: "Plan", value: `${plan.name} · ${pkg.name}` },
        { name: "Amount", value: `LKR ${plan.price}` },
      ],
    });

    return res.status(201).json({ invoice: mapInvoice(q.invoiceById.get(invoiceId)), activated: true });
  }

  const invoiceId = insertInvoice();
  notify({
    title: "🛒 New order (waiting for receipt)",
    fields: [
      { name: "Invoice", value: `#${reference}` },
      { name: "Customer", value: `${req.user.name} (${req.user.email})` },
      { name: "Plan", value: `${plan.name} · ${pkg.name}` },
      { name: "Amount", value: `LKR ${plan.price}` },
      { name: "Method", value: method.name },
    ],
  });
  res.status(201).json({ invoice: mapInvoice(q.invoiceById.get(invoiceId)), activated: false });
});

r.post("/invoices/:id/receipt", receiptUpload, async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, "Please choose a receipt file.");

  const invoice = q.ownInvoice.get(Number(req.params.id), req.user.id);
  if (!invoice || !["pending", "rejected"].includes(invoice.status)) {
    await fsp.unlink(file.path).catch(() => {});
    throw new HttpError(400, "You can only upload a receipt for a pending or rejected invoice.");
  }

  try {
    await checkMagic(file.path);
  } catch (error) {
    await fsp.unlink(file.path).catch(() => {});
    throw error;
  }
  if (invoice.receipt_file) await fsp.unlink(path.join(RECEIPT_DIR, invoice.receipt_file)).catch(() => {});
  q.setReceipt.run(file.filename, invoice.id);

  notify({
    title: "🧾 Receipt uploaded — needs approval",
    color: "warn",
    fields: [
      { name: "Invoice", value: `#${invoice.reference}` },
      { name: "Customer", value: `${req.user.name} (${req.user.email})` },
      { name: "Amount", value: `LKR ${invoice.amount}` },
      { name: "Method", value: invoice.payment_method_name },
      { name: "Package", value: invoice.package_name },
    ],
    file: { path: file.path, mime: file.mimetype, isImage: isImage(file.filename) },
  });

  res.json({ invoice: mapInvoice(q.invoiceById.get(invoice.id)) });
});

export default r;
