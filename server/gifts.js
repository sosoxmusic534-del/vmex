import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import db from "./db.js";
import { changeCredit } from "./credit.js";
import { HttpError } from "./errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = path.resolve(__dirname, "..", "dist", "index.html");

export const GIFT_MIN = 200;
export const GIFT_MAX = 50000;
const GIFT_DAYS = 365;

/* [card start, card middle, card end, embed colour] */
export const GIFT_DESIGNS = {
  aurora: ["#1d4ed8", "#0ea5e9", "#7c3aed", "#3b82f6"],
  midnight: ["#040714", "#1e3a8a", "#0ea5e9", "#0ea5e9"],
  neon: ["#6d28d9", "#db2777", "#22d3ee", "#db2777"],
  sunset: ["#ea580c", "#db2777", "#facc15", "#f97316"],
};

/* ---------- Extra columns (safe to run every start) ---------- */
const cols = new Set(db.prepare("PRAGMA table_info(gift_cards)").all().map((c) => c.name));
for (const [col, type] of Object.entries({
  claim_token: "TEXT",
  design: "TEXT NOT NULL DEFAULT 'aurora'",
  to_name: "TEXT NOT NULL DEFAULT ''",
  from_name: "TEXT NOT NULL DEFAULT ''",
  message: "TEXT NOT NULL DEFAULT ''",
  claimed_by: "INTEGER",
  claimed_at: "TEXT",
})) {
  if (!cols.has(col)) db.exec(`ALTER TABLE gift_cards ADD COLUMN ${col} ${type}`);
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_claim_token ON gift_cards(claim_token)");

/* ---------- Helpers ---------- */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const block = () => Array.from(crypto.randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join("");
const newCode = () => `VMEX-${block()}-${block()}-${block()}`;
const newToken = () => crypto.randomBytes(18).toString("base64url");
export const normalizeCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
const lkr = (n) => `LKR ${Number(n).toLocaleString("en-US")}`;
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const publicBase = (req) =>
  (process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

const q = {
  user: db.prepare("SELECT id, email, name, balance FROM users WHERE id = ?"),
  insert: db.prepare(`
    INSERT INTO gift_cards (code, code_key, amount, max_uses, uses, expires_at, active, note, purchased_by,
                            claim_token, design, to_name, from_name, message)
    VALUES (@code, @code_key, @amount, 1, 0, @expires_at, 1, @note, @purchased_by,
            @claim_token, @design, @to_name, @from_name, @message)`),
  byId: db.prepare("SELECT * FROM gift_cards WHERE id = ?"),
  byToken: db.prepare("SELECT * FROM gift_cards WHERE claim_token = ?"),
  byKey: db.prepare("SELECT * FROM gift_cards WHERE code_key = ?"),
  mine: db.prepare("SELECT * FROM gift_cards WHERE purchased_by = ? ORDER BY id DESC LIMIT 100"),
  redeemed: db.prepare("SELECT 1 FROM gift_card_redemptions WHERE gift_card_id = ? AND user_id = ?"),
  addRedemption: db.prepare("INSERT INTO gift_card_redemptions (gift_card_id, user_id, amount) VALUES (?, ?, ?)"),
  use: db.prepare(`
    UPDATE gift_cards SET uses = uses + 1,
      claimed_by = COALESCE(claimed_by, ?), claimed_at = COALESCE(claimed_at, datetime('now'))
    WHERE id = ? AND uses < max_uses`),
};

export function giftStatus(g) {
  if (!g.active) return "disabled";
  const exp = g.expires_at ? Date.parse(g.expires_at) : NaN;
  if (!Number.isNaN(exp) && exp < Date.now()) return "expired";
  if (g.uses >= g.max_uses) return "claimed";
  return "available";
}

/* What anyone with the link may see (never the code) */
export const giftView = (g) => ({
  amount: g.amount,
  design: GIFT_DESIGNS[g.design] ? g.design : "aurora",
  toName: g.to_name || "",
  fromName: g.from_name || "",
  message: g.message || "",
  status: giftStatus(g),
});

/* What the buyer sees */
const mineView = (g, base) => ({
  ...giftView(g),
  id: g.id,
  code: g.code,
  claimUrl: g.claim_token ? `${base}/gift/${g.claim_token}` : null,
  createdAt: g.created_at,
  claimedAt: g.claimed_at,
});

export const getByToken = (token) => q.byToken.get(String(token || ""));
export const myGifts = (userId, base) => q.mine.all(userId).map((g) => mineView(g, base));

/* ---------- Buy ---------- */
export function buyGift(userId, body, base) {
  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < GIFT_MIN || amount > GIFT_MAX) {
    throw new HttpError(400, `Choose an amount between ${lkr(GIFT_MIN)} and ${lkr(GIFT_MAX)}.`);
  }
  const design = GIFT_DESIGNS[body.design] ? body.design : "aurora";

  const gift = db.transaction(() => {
    const u = q.user.get(userId);
    if (!u) throw new HttpError(404, "Account not found.");
    if (u.balance < amount) throw new HttpError(400, "Not enough balance. Top up your wallet first.");

    const code = newCode();
    const info = q.insert.run({
      code,
      code_key: normalizeCode(code),
      amount,
      expires_at: new Date(Date.now() + GIFT_DAYS * 86400000).toISOString(),
      note: `Bought by ${u.email}`,
      purchased_by: u.id,
      claim_token: newToken(),
      design,
      to_name: clean(body.toName, 32),
      from_name: clean(body.fromName, 32),
      message: clean(body.message, 140),
    });
    changeCredit(u.id, -amount, "purchase", `Gift card ${code}`);
    return q.byId.get(info.lastInsertRowid);
  })();

  return mineView(gift, base);
}

/* ---------- Claim / redeem ---------- */
function redeem(userId, giftId) {
  return db.transaction(() => {
    const g = q.byId.get(giftId);
    const status = giftStatus(g);
    if (status === "claimed") throw new HttpError(409, "This gift card has already been claimed.");
    if (status === "expired") throw new HttpError(410, "This gift card has expired.");
    if (status === "disabled") throw new HttpError(410, "This gift card is no longer active.");
    if (q.redeemed.get(g.id, userId)) throw new HttpError(409, "You've already claimed this gift card.");
    if (q.use.run(userId, g.id).changes === 0) throw new HttpError(409, "This gift card has already been claimed.");
    q.addRedemption.run(g.id, userId, g.amount);
    changeCredit(userId, g.amount, "gift", `Gift card ${g.code}`);
    return g.amount;
  })();
}

export function claimByToken(userId, token) {
  const g = getByToken(token);
  if (!g) throw new HttpError(404, "This gift link isn't valid.");
  return redeem(userId, g.id);
}

export function redeemByCode(userId, code) {
  const g = q.byKey.get(normalizeCode(code));
  if (!g) throw new HttpError(404, "That code isn't valid. Check it and try again.");
  return redeem(userId, g.id);
}

/* ---------- Link preview image (1200×630) ---------- */
const fontDir = path.join(__dirname, "fonts");
const fontFiles = fs.existsSync(fontDir)
  ? fs.readdirSync(fontDir).filter((f) => /\.(ttf|otf)$/i.test(f)).map((f) => path.join(fontDir, f))
  : [];
const ogCache = new Map();

export function giftOgPng(g) {
  const v = giftView(g);
  const key = `${g.id}:${v.status}`;
  if (ogCache.has(key)) return ogCache.get(key);

  const [c1, c2, c3] = GIFT_DESIGNS[v.design];
  const used = v.status !== "available";
  const amount = Number(v.amount).toLocaleString("en-US");
  const msg = v.message.length > 58 ? `${v.message.slice(0, 57)}…` : v.message;
  const F = `font-family="Poppins"`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#d97706"/></linearGradient>
    <linearGradient id="btn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="80"/></filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="30" stdDeviation="28" flood-color="#000" flood-opacity=".6"/></filter>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#fff" fill-opacity=".08"/></pattern>
    <clipPath id="cc"><rect x="90" y="140" width="540" height="340" rx="34"/></clipPath>
  </defs>

  <rect width="1200" height="630" fill="#05070f"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <circle cx="300" cy="330" r="230" fill="${c1}" opacity=".6" filter="url(#blur)"/>
  <circle cx="560" cy="190" r="170" fill="${c3}" opacity=".45" filter="url(#blur)"/>
  <circle cx="1050" cy="560" r="200" fill="${c2}" opacity=".25" filter="url(#blur)"/>

  <g transform="rotate(-8 360 310)" filter="url(#shadow)">
    <g clip-path="url(#cc)" ${used ? 'opacity=".55"' : ""}>
      <rect x="90" y="140" width="540" height="340" fill="url(#card)"/>
      <rect x="90" y="140" width="540" height="340" fill="url(#dots)"/>
      <path d="M300 140 L420 140 L280 480 L160 480 Z" fill="url(#shine)"/>
    </g>
    <rect x="90" y="140" width="540" height="340" rx="34" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
    <text x="130" y="205" ${F} font-weight="800" font-size="30" fill="#fff" letter-spacing="6">VMEX</text>
    <rect x="452" y="174" width="140" height="38" rx="19" fill="#fff" fill-opacity=".18"/>
    <text x="522" y="199" ${F} font-weight="600" font-size="15" fill="#fff" text-anchor="middle" letter-spacing="4">GIFT CARD</text>
    <rect x="130" y="240" width="76" height="56" rx="12" fill="url(#chip)"/>
    <path d="M130 268 H206 M168 240 V296" stroke="#92400e" stroke-opacity=".45" stroke-width="2"/>
    <text x="130" y="395" ${F} font-weight="800" font-size="72" fill="#fff">${amount}</text>
    <text x="132" y="333" ${F} font-weight="700" font-size="22" fill="#fff" fill-opacity=".85" letter-spacing="3">LKR</text>
    <text x="130" y="448" ${F} font-weight="500" font-size="20" fill="#fff" fill-opacity=".9">${esc(v.toName ? `For ${v.toName}` : "A gift for you")}</text>
    ${used ? `<g transform="rotate(-14 360 310)"><rect x="235" y="275" width="250" height="70" rx="10" fill="#05070f" fill-opacity=".45" stroke="#fff" stroke-width="5"/><text x="360" y="323" ${F} font-weight="800" font-size="34" fill="#fff" text-anchor="middle" letter-spacing="6">CLAIMED</text></g>` : ""}
  </g>

  <text x="700" y="200" ${F} font-weight="600" font-size="22" fill="#93b4ff" letter-spacing="5">${used ? "VMEX GIFT CARD" : "YOU'VE GOT A GIFT"}</text>
  <text x="700" y="285" ${F} font-weight="800" font-size="66" fill="#fff">${esc(lkr(v.amount))}</text>
  <text x="700" y="335" ${F} font-weight="500" font-size="26" fill="#c8d4f0">${esc(v.fromName ? `from ${v.fromName}` : "Fast, private V2Ray")}</text>
  ${msg ? `<text x="700" y="390" ${F} font-weight="500" font-size="20" fill="#9fb0d4">“${esc(msg)}”</text>` : ""}
  <rect x="700" y="438" width="260" height="66" rx="33" fill="${used ? "#1f2937" : "url(#btn)"}"/>
  <text x="830" y="480" ${F} font-weight="700" font-size="24" fill="#fff" text-anchor="middle">${used ? "Already claimed" : "Tap to claim"}</text>
</svg>`;

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: "Poppins" },
  })
    .render()
    .asPng();

  if (ogCache.size > 300) ogCache.clear();
  ogCache.set(key, png);
  return png;
}

/* ---------- /gift/:token page with link-preview meta tags ---------- */
let indexTemplate = null;

export function giftPage(req, res, next) {
  try {
    indexTemplate ??= fs.readFileSync(INDEX_HTML, "utf8");
  } catch {
    return next(); // site not built yet
  }

  const g = getByToken(req.params.token);
  const base = publicBase(req);
  let title = "VMEX Gift Card";
  let desc = "This gift link isn't valid.";
  let image = `${base}/logo.png`;
  let color = "#5ab4ff";
  let large = false;

  if (g) {
    const v = giftView(g);
    color = "#5ab4ff";
    image = `${base}/api/gifts/og/${g.claim_token}.png?v=${v.status}`;
    large = true;
    title = `${lkr(v.amount)} VMEX Gift Card${v.toName ? ` for ${v.toName}` : ""}`;
    desc =
      v.status === "available"
        ? `${v.fromName || "Someone"} sent you a VMEX gift card. Tap to claim it and get fast, private V2Ray.`
        : v.status === "claimed"
          ? "This VMEX gift card has already been claimed."
          : "This VMEX gift card is no longer available.";
  }

  const meta = `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="VMEX" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${esc(base + req.originalUrl)}" />
    <meta property="og:image" content="${esc(image)}" />
    ${large ? '<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />' : ""}
    <meta name="twitter:card" content="${large ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <meta name="theme-color" content="${color}" />
    <meta name="description" content="${esc(desc)}" />
    <meta name="robots" content="noindex" />`;

  const html = indexTemplate
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/<head>/i, `<head>${meta}`);

  res.set("Cache-Control", "no-store").type("html").send(html);
}