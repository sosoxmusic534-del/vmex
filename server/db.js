import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "vmex.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ---------- Core tables ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    protocols   TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    data_gb     INTEGER NOT NULL DEFAULT 0,
    days        INTEGER NOT NULL DEFAULT 30,
    inbound_id  INTEGER,
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id    INTEGER NOT NULL REFERENCES plans(id),
    reference  TEXT NOT NULL UNIQUE,
    amount     INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS services (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id      INTEGER REFERENCES plans(id),
    invoice_id   INTEGER REFERENCES invoices(id),
    name         TEXT NOT NULL,
    inbound_id   INTEGER NOT NULL,
    protocol     TEXT NOT NULL,
    client_email TEXT NOT NULL UNIQUE,
    client_id    TEXT NOT NULL,
    sub_id       TEXT NOT NULL,
    total_bytes  INTEGER NOT NULL DEFAULT 0,
    expires_at   INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/* Helper: does a column exist? */
const hasCol = (table, col) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);

/* ---------- Users: role, balance, email verification ---------- */
if (!hasCol("users", "role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
}
if (!hasCol("users", "balance")) {
  db.exec("ALTER TABLE users ADD COLUMN balance INTEGER NOT NULL DEFAULT 0");
}
if (!hasCol("users", "email_verified")) {
  db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
  db.exec("UPDATE users SET email_verified = 1"); // old accounts stay usable
}

/* ---------- Multi-inbound plans & services ---------- */
if (!hasCol("plans", "inbound_ids")) {
  db.exec("ALTER TABLE plans ADD COLUMN inbound_ids TEXT NOT NULL DEFAULT '[]'");
  db.exec("UPDATE plans SET inbound_ids = json_array(inbound_id) WHERE inbound_id IS NOT NULL");
}
if (!hasCol("services", "inbound_ids")) {
  db.exec("ALTER TABLE services ADD COLUMN inbound_ids TEXT NOT NULL DEFAULT '[]'");
  db.exec("UPDATE services SET inbound_ids = json_array(inbound_id)");
}

/* ---------- Catalog: carriers, SNI packages, payment methods ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS carriers (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    logo   TEXT NOT NULL DEFAULT '',
    sort   INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sni_packages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    carrier_id  INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    device      TEXT NOT NULL DEFAULT 'both',
    name        TEXT NOT NULL,
    sni         TEXT NOT NULL DEFAULT '',
    tag         TEXT NOT NULL DEFAULT '',
    inbound_ids TEXT NOT NULL DEFAULT '[]',
    sort        INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'manual',
    icon         TEXT NOT NULL DEFAULT 'bank',
    description  TEXT NOT NULL DEFAULT '',
    instructions TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'active',
    sort         INTEGER NOT NULL DEFAULT 0
  );
`);

/* ---------- Invoice extra columns (checkout + receipts) ---------- */
const invoiceCols = {
  device: "TEXT",
  carrier_name: "TEXT",
  package_id: "INTEGER",
  package_name: "TEXT",
  sni: "TEXT",
  payment_method_id: "INTEGER",
  payment_method_name: "TEXT",
  receipt_file: "TEXT",
  receipt_uploaded_at: "TEXT",
  reject_reason: "TEXT",
};
for (const [col, type] of Object.entries(invoiceCols)) {
  if (!hasCol("invoices", col)) db.exec(`ALTER TABLE invoices ADD COLUMN ${col} ${type}`);
}

/* ---------- Email OTP codes ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS otp_challenges (
    id           TEXT PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose      TEXT NOT NULL,
    code_hash    TEXT NOT NULL,
    attempts     INTEGER NOT NULL DEFAULT 0,
    sends        INTEGER NOT NULL DEFAULT 1,
    expires_at   INTEGER NOT NULL,
    last_sent_at INTEGER NOT NULL
  );
`);

/* ---------- Support tickets ---------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject    TEXT NOT NULL,
    category   TEXT NOT NULL DEFAULT 'general',
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    is_staff   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
`);

/* Extra ticket columns used by routes/tickets.js */
if (!hasCol("tickets", "priority")) {
  db.exec("ALTER TABLE tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'");
}

/* ---------- Starter data (only inserted once) ---------- */
const seed = db.prepare(
  "INSERT OR IGNORE INTO plans (slug, name, description, protocols, price, data_gb, days) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
seed.run("100gb", "100GB Monthly Plan", "Fast • Stable • Reliable V2Ray server config.", "VLESS / VMess", 120, 100, 30);
seed.run("200gb", "200GB Monthly Plan", "Ultra-fast V2Ray configuration with 200GB high-speed quota.", "VLESS / VMess", 300, 200, 30);
seed.run("unlimited", "Unlimited Monthly Plan", "Zero data limits! High-speed downloading, 4K streaming & gaming.", "VLESS / VMess / Trojan", 600, 0, 30);

/* Edit placeholder SNI values and payment instructions in the admin panel. */
if (!db.prepare("SELECT COUNT(*) AS n FROM carriers").get().n) {
  const addCarrier = db.prepare("INSERT INTO carriers (name, logo, sort) VALUES (?, ?, ?)");
  const dialog = addCarrier.run("Dialog", "/logos/dialog.jpg", 1).lastInsertRowid;
  addCarrier.run("SLT Mobitel", "/logos/mobitel.png", 2);
  addCarrier.run("Airtel", "/logos/airtel.png", 3);
  addCarrier.run("Hutch", "/logos/hutch.png", 4);

  const addPackage = db.prepare(
    "INSERT INTO sni_packages (carrier_id, device, name, sni, tag, sort) VALUES (?, ?, ?, ?, ?, ?)"
  );
  addPackage.run(dialog, "both", "Dialog Zoom", "example.zoom.us", "Most Popular", 1);
  addPackage.run(dialog, "sim", "Dialog TikTok", "example.tiktok.com", "TikTok", 2);
}

if (!db.prepare("SELECT COUNT(*) AS n FROM payment_methods").get().n) {
  const addMethod = db.prepare(
    "INSERT INTO payment_methods (name, type, icon, description, instructions, status, sort) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  addMethod.run("Bank Transfer", "manual", "bank", "Manual approval",
    "Bank: Your Bank\nAccount name: VMEX Solutions\nAccount no: 0000 0000 0000\nBranch: Your Branch", "active", 1);
  addMethod.run("eZ Cash", "manual", "ezcash", "Manual approval", "Send to: 07X XXX XXXX (VMEX)", "active", 2);
  addMethod.run("Card Payment", "manual", "card", "Coming soon", "", "disabled", 3);
  addMethod.run("Using Balance", "balance", "wallet", "Instant", "", "active", 4);
}

/* ---------- Settings helpers ---------- */
export function getSetting(key, fallback = "") {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
}

export default db;