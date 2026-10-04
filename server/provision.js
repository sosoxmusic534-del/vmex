import db from "./db.js";
import { createClient, removeClientByEmail } from "./xui.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const q = {
  invoice: db.prepare("SELECT * FROM invoices WHERE id = ?"),
  plan: db.prepare("SELECT * FROM plans WHERE id = ?"),
  pkg: db.prepare("SELECT * FROM sni_packages WHERE id = ?"),
  insertService: db.prepare(`
    INSERT INTO services (user_id, plan_id, invoice_id, name, inbound_id, inbound_ids, protocol,
      client_email, client_id, sub_id, total_bytes, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  markPaid: db.prepare(
    "UPDATE invoices SET status = 'paid', paid_at = datetime('now') WHERE id = ? AND status = 'pending'"
  ),
};

const processing = new Set();

export async function provisionInvoice(id) {
  if (processing.has(id)) throw new HttpError(409, "This invoice is already being processed.");

  const invoice = q.invoice.get(id);
  if (!invoice) throw new HttpError(404, "Invoice not found.");
  if (invoice.status !== "pending") throw new HttpError(400, "Only pending invoices can be activated.");

  const plan = q.plan.get(invoice.plan_id);
  if (!plan) throw new HttpError(400, "The plan for this invoice no longer exists.");

  const pkg = invoice.package_id ? q.pkg.get(invoice.package_id) : null;
  let packageInboundIds = [];
  try { packageInboundIds = JSON.parse(pkg?.inbound_ids || "[]"); } catch { /* use plan fallback */ }
  let planInboundIds = [];
  try { planInboundIds = JSON.parse(plan.inbound_ids || "[]"); } catch { /* validation below */ }
  const inboundIds = packageInboundIds.length ? packageInboundIds : planInboundIds;
  if (!inboundIds.length) {
    throw new HttpError(400, "No X-UI inbound is assigned to this package or plan (Admin → Networks & Packages).");
  }

  processing.add(id);
  try {
    const email = `vmex-u${invoice.user_id}-i${invoice.id}`;
    const totalBytes = plan.data_gb * 1024 ** 3;
    const expiresAt = Date.now() + plan.days * 86_400_000;
    const client = await createClient({ inboundIds, email, totalBytes, expiresAt });
    const name = invoice.package_name ? `${plan.name} · ${invoice.package_name}` : plan.name;

    try {
      db.transaction(() => {
        q.insertService.run(
          invoice.user_id, plan.id, invoice.id, name, inboundIds[0], JSON.stringify(inboundIds),
          client.protocol, email, "", client.subId, totalBytes, expiresAt
        );
        if (!q.markPaid.run(invoice.id).changes) {
          throw new HttpError(409, "This invoice is no longer pending.");
        }
      })();
    } catch (error) {
      await removeClientByEmail(inboundIds, email).catch(() => {});
      throw error;
    }
  } finally {
    processing.delete(id);
  }
}
