import crypto from "node:crypto";
import db from "./db.js";
import { getOnlineEmails } from "./xui.js";

const API = "https://discord.com/api/v10";
const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
export const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
export const REDIRECT_URI = `${PUBLIC_URL}/api/discord/callback`;
export const discordConfigured = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && PUBLIC_URL);

/* ---------- Role setup from .env ---------- */
const PLAN_ROLES = Object.fromEntries(
  String(process.env.DISCORD_PLAN_ROLES || "")
    .split(",")
    .map((pair) => pair.split(":").map((s) => s.trim()))
    .filter(([slug, id]) => slug && id)
);
const EXPIRED_ROLE = (process.env.DISCORD_ROLE_EXPIRED || "").trim();
const MANAGED_ROLES = new Set([...Object.values(PLAN_ROLES), EXPIRED_ROLE].filter(Boolean));
export const rolesConfigured = Boolean(BOT_TOKEN && GUILD_ID && MANAGED_ROLES.size);

/* ---------- Extra columns ---------- */
const linkCols = new Set(db.prepare("PRAGMA table_info(discord_links)").all().map((c) => c.name));
if (!linkCols.has("roles_key")) db.exec("ALTER TABLE discord_links ADD COLUMN roles_key TEXT");
if (!linkCols.has("roles_at")) db.exec("ALTER TABLE discord_links ADD COLUMN roles_at INTEGER");

/* ---------- Encrypt tokens at rest ---------- */
const KEY = crypto.createHash("sha256").update(`discord:${process.env.JWT_SECRET}`).digest();
const seal = (text) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
};
const unseal = (s) => {
  const [iv, tag, enc] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- OAuth ---------- */
async function tokenRequest(params) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Discord token error: ${data.error_description || data.error || res.status}`);
  return data;
}

export const exchangeCode = (code) =>
  tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });

export async function getDiscordUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Discord /users/@me failed (${res.status})`);
  return res.json();
}

export const authorizeUrl = (state) =>
  `https://discord.com/oauth2/authorize?${new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify role_connections.write guilds.join",
    state,
    prompt: "consent",
  })}`;

export const avatarUrl = (id, avatar) =>
  avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128` : "https://cdn.discordapp.com/embed/avatars/0.png";

/* ---------- Bot API (with rate-limit retry) ---------- */
async function botApi(method, path, body, reason) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(reason ? { "X-Audit-Log-Reason": encodeURIComponent(reason) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status !== 429) return res;
    const data = await res.json().catch(() => ({}));
    await sleep((data.retry_after ?? 1) * 1000 + 150);
  }
  throw new Error("Discord rate limit");
}

/* ---------- Storage ---------- */
const q = {
  upsert: db.prepare(`
    INSERT INTO discord_links (user_id, discord_id, username, avatar, access_token, refresh_token, expires_at, last_status, roles_key, roles_at)
    VALUES (@user_id, @discord_id, @username, @avatar, @access, @refresh, @expires, NULL, NULL, NULL)
    ON CONFLICT(user_id) DO UPDATE SET
      discord_id = excluded.discord_id, username = excluded.username, avatar = excluded.avatar,
      access_token = excluded.access_token, refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at, last_status = NULL, roles_key = NULL, roles_at = NULL`),
  removeDiscordElsewhere: db.prepare("DELETE FROM discord_links WHERE discord_id = ? AND user_id != ?"),
  byUser: db.prepare("SELECT * FROM discord_links WHERE user_id = ?"),
  all: db.prepare("SELECT * FROM discord_links"),
  updateTokens: db.prepare("UPDATE discord_links SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?"),
  setStatus: db.prepare("UPDATE discord_links SET last_status = ? WHERE user_id = ?"),
  setRoles: db.prepare("UPDATE discord_links SET roles_key = ?, roles_at = ? WHERE user_id = ?"),
  remove: db.prepare("DELETE FROM discord_links WHERE user_id = ?"),
  user: db.prepare("SELECT * FROM users WHERE id = ?"),
  services: db.prepare(`
    SELECT s.client_email, s.expires_at, p.name AS plan_name, p.slug AS plan_slug FROM services s
    LEFT JOIN plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.id DESC`),
  orders: db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE user_id = ? AND status = 'paid'"),
};

export function saveLink(userId, discordUser, tokens) {
  q.removeDiscordElsewhere.run(discordUser.id, userId);
  q.upsert.run({
    user_id: userId,
    discord_id: discordUser.id,
    username: discordUser.global_name || discordUser.username,
    avatar: discordUser.avatar,
    access: seal(tokens.access_token),
    refresh: seal(tokens.refresh_token),
    expires: Date.now() + tokens.expires_in * 1000,
  });
}

export const getLink = (userId) => q.byUser.get(userId);

async function accessTokenFor(link) {
  if (link.expires_at - 60_000 > Date.now()) return unseal(link.access_token);
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: unseal(link.refresh_token) });
  q.updateTokens.run(seal(t.access_token), seal(t.refresh_token), Date.now() + t.expires_in * 1000, link.user_id);
  return t.access_token;
}

/* ---------- Linked Roles (profile connection) ---------- */
function statusFor(userId, online) {
  const user = q.user.get(userId);
  const now = Date.now();
  const active = q.services.all(userId).filter((s) => s.expires_at > now);
  const connected = active.some((s) => online.includes(s.client_email));
  const plan = active[0]?.plan_name || null;
  const username = connected ? `Connected · ${plan ?? "VMEX"}` : plan || "No active plan";
  return {
    platform_name: "VMEX",
    platform_username: username.slice(0, 100),
    metadata: {
      active_plan: active.length ? "1" : "0",
      connected: connected ? "1" : "0",
      orders: String(q.orders.get(userId).n),
      member_since: new Date(user.created_at.replace(" ", "T") + "Z").toISOString(),
    },
  };
}

export async function syncUser(userId, online, force = false) {
  const link = q.byUser.get(userId);
  if (!link) return null;
  const body = statusFor(userId, online);
  const json = JSON.stringify(body);
  if (!force && json === link.last_status) return body;
  const token = await accessTokenFor(link);
  const res = await fetch(`${API}/users/@me/applications/${DISCORD_CLIENT_ID}/role-connection`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: json,
  });
  if (!res.ok) throw new Error(`role-connection update failed (${res.status})`);
  q.setStatus.run(json, userId);
  return body;
}

/* ---------- Plan roles in your server ---------- */
function desiredRoles(userId) {
  const rows = q.services.all(userId);
  const now = Date.now();
  const active = rows.filter((s) => s.expires_at > now);
  const roles = new Set();
  for (const s of active) {
    const role = PLAN_ROLES[s.plan_slug];
    if (role) roles.add(role);
  }
  if (!active.length && rows.length && EXPIRED_ROLE) roles.add(EXPIRED_ROLE);
  return roles;
}

export async function syncMemberRoles(userId, force = false) {
  if (!rolesConfigured) return;
  const link = q.byUser.get(userId);
  if (!link) return;

  const want = desiredRoles(userId);
  const key = [...want].sort().join(",");
  if (!force && link.roles_key === key && Date.now() - (link.roles_at || 0) < 15 * 60_000) return;

  const memberPath = `/guilds/${GUILD_ID}/members/${link.discord_id}`;
  let res = await botApi("GET", memberPath);

  // Not in the server yet: add them (needs the guilds.join permission they approved)
  if (res.status === 404) {
    if (process.env.DISCORD_AUTO_JOIN === "0") return;
    const token = await accessTokenFor(link);
    const join = await botApi("PUT", memberPath, { access_token: token, roles: [...want] }, "VMEX customer joined");
    if (join.status === 201) {
      q.setRoles.run(key, Date.now(), userId);
      return;
    }
    if (join.status !== 204) {
      throw new Error(`couldn't add member to server (${join.status}) — reconnect Discord or check the bot's Create Invite permission`);
    }
    res = await botApi("GET", memberPath);
  }
  if (!res.ok) throw new Error(`member lookup failed (${res.status})`);

  const member = await res.json();
  const have = new Set(member.roles || []);
  for (const role of MANAGED_ROLES) {
    if (want.has(role) && !have.has(role)) {
      const r = await botApi("PUT", `${memberPath}/roles/${role}`, null, "VMEX plan sync");
      if (!r.ok && r.status !== 204) throw new Error(`add role failed (${r.status}) — is the bot's role above the plan roles?`);
    } else if (!want.has(role) && have.has(role)) {
      const r = await botApi("DELETE", `${memberPath}/roles/${role}`, null, "VMEX plan sync");
      if (!r.ok && r.status !== 204) throw new Error(`remove role failed (${r.status}) — is the bot's role above the plan roles?`);
    }
  }
  q.setRoles.run(key, Date.now(), userId);
}

export async function removeLink(userId) {
  const link = q.byUser.get(userId);
  if (link && rolesConfigured) {
    for (const role of MANAGED_ROLES) {
      await botApi("DELETE", `/guilds/${GUILD_ID}/members/${link.discord_id}/roles/${role}`, null, "VMEX unlinked").catch(() => {});
    }
  }
  q.remove.run(userId);
}

/* ---------- Background sync every minute ---------- */
export function startDiscordSync() {
  if (!discordConfigured) {
    console.warn("! Discord linking not configured (DISCORD_CLIENT_ID / SECRET / PUBLIC_URL)");
    return;
  }
  const run = async () => {
    let online = [];
    try {
      online = await getOnlineEmails();
    } catch {
      /* panel unreachable */
    }
    for (const link of q.all.all()) {
      try {
        await syncUser(link.user_id, online);
      } catch (e) {
        console.error(`[discord] profile ${link.user_id}:`, e.message);
      }
      try {
        await syncMemberRoles(link.user_id);
      } catch (e) {
        console.error(`[discord] roles ${link.user_id}:`, e.message);
      }
      await sleep(300);
    }
  };
  setTimeout(run, 10_000);
  setInterval(run, 60_000);
  console.log(`✔ Discord sync running${rolesConfigured ? " (profile + server roles)" : " (profile only)"}`);
}