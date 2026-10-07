export type ServiceStatus = "active" | "expired" | "limited" | "disabled";
export type InvoiceStatus = "pending" | "paid" | "cancelled" | "rejected";
export type Device = "router" | "sim";

export type Service = {
  id: number;
  name: string;
  planName: string | null;
  protocol: string;
  usedBytes: number | null;
  totalBytes: number;
  expiresAt: number;
  status: ServiceStatus;
  live: boolean;
  createdAt: string;
  subLink: string | null;
  user?: { name: string; email: string };
};

export type Invoice = {
  id: number;
  reference: string;
  planName: string;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  paidAt: string | null;
  device: Device | null;
  carrierName: string | null;
  packageName: string | null;
  sni: string | null;
  paymentMethod: string | null;
  instructions: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  receiptUploadedAt: string | null;
  rejectReason: string | null;
  user?: { id: number; name: string; email: string };
};

export type Plan = {
  id: number;
  name: string;
  description: string;
  protocols: string;
  price: number;
  dataGb: number;
  days: number;
  inboundIds?: number[];
  active?: boolean;
};

export type Carrier = { id: number; name: string; logo: string; sort?: number; active?: boolean };

export type SniPackage = {
  id: number;
  carrierId: number;
  device: Device | "both";
  name: string;
  sni: string;
  tag: string;
  inboundIds?: number[];
  sort?: number;
  active?: boolean;
};

export type PaymentMethod = {
  id: number;
  name: string;
  type: "manual" | "balance";
  icon: "bank" | "ezcash" | "card" | "wallet";
  description: string;
  status: "active" | "disabled" | "hidden";
  instructions?: string;
  sort?: number;
};

export type Inbound = {
  id: number;
  remark: string;
  protocol: string;
  port: number;
  enable: boolean;
  up: number;
  down: number;
  total: number;
  clients: number;
};

export type TicketStatus = "open" | "answered" | "closed";
export type TicketCategory = "general" | "billing" | "technical" | "config" | "other";
export type TicketPriority = "low" | "normal" | "high";

export type Ticket = {
  id: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  user: { id: number; name: string; email: string };
};

export type TicketMessage = {
  id: number;
  body: string;
  isStaff: boolean;
  author: string;
  createdAt: string;
};

export type UserRole = "customer" | "staff" | "admin";

export type TopupStatus = "pending" | "paid" | "rejected" | "cancelled";

export type Topup = {
  id: number;
  reference: string;
  amount: number;
  paymentMethod: string | null;
  status: TopupStatus;
  hasReceipt: boolean;
  receiptUrl: string | null;
  receiptUploadedAt: string | null;
  rejectReason: string | null;
  instructions?: string | null;
  createdAt: string;
  paidAt: string | null;
  user?: { id: number; name: string; email: string };
};

export type CreditTx = {
  id: number;
  amount: number;
  balanceAfter: number;
  type: "topup" | "purchase" | "refund" | "admin";
  note: string;
  createdAt: string;
};
