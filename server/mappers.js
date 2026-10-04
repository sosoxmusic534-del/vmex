export const mapInvoice = (i) => ({
  id: i.id,
  reference: i.reference,
  planName: i.plan_name,
  amount: i.amount,
  status: i.status,
  createdAt: i.created_at,
  paidAt: i.paid_at,
  device: i.device ?? null,
  carrierName: i.carrier_name ?? null,
  packageName: i.package_name ?? null,
  sni: i.sni ?? null,
  paymentMethod: i.payment_method_name ?? null,
  instructions: ["pending", "rejected"].includes(i.status) ? i.pm_instructions ?? null : null,
  hasReceipt: Boolean(i.receipt_file),
  receiptUrl: i.receipt_file ? `/api/files/receipts/${i.receipt_file}` : null,
  receiptUploadedAt: i.receipt_uploaded_at ?? null,
  rejectReason: i.status === "rejected" ? i.reject_reason ?? null : null,
  user: i.user_name ? { id: i.user_id, name: i.user_name, email: i.user_email } : undefined,
});

export const mapPlan = (p, admin = false) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  protocols: p.protocols,
  price: p.price,
  dataGb: p.data_gb,
  days: p.days,
  ...(admin ? { inboundIds: JSON.parse(p.inbound_ids || "[]"), active: !!p.active } : {}),
});

export const mapCarrier = (c, admin = false) => ({
  id: c.id,
  name: c.name,
  logo: c.logo,
  ...(admin ? { sort: c.sort, active: !!c.active } : {}),
});

export const mapPackage = (p, admin = false) => ({
  id: p.id,
  carrierId: p.carrier_id,
  device: p.device,
  name: p.name,
  sni: p.sni,
  tag: p.tag,
  ...(admin ? { inboundIds: JSON.parse(p.inbound_ids || "[]"), sort: p.sort, active: !!p.active } : {}),
});

export const mapMethod = (m, admin = false) => ({
  id: m.id,
  name: m.name,
  type: m.type,
  icon: m.icon,
  description: m.description,
  status: m.status,
  instructions: m.instructions,
  ...(admin ? { sort: m.sort } : {}),
});
