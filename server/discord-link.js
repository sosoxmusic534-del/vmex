import crypto from "node:crypto";
import db from "./db.js";
import { enrichServices, getOnlineEmails } from "./xui.js";

const API = "https://discord.com/api/v10";
const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
const PRESENCE_IMAGE = process.env.DISCORD_PRESENCE_IMAGE || "vmex"; // Art Asset key
export const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
export const REDIRECT_URI = `${PUBLIC_URL}/api/discord/callback`;
export const discordConfigured = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && PUBLIC_URL);

const BASIC_SCOPES = "identify role_connections.write";
const PRESENCE_SCOPES =
  process.env.DISCORD_PRESENCE_SCOPES || "identify role_connections.write sdk.social_layer_presence";

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

export const authorizeUrl = (state, presence = false) =>
  `https://discord.com/oauth2/authorize?${new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: presence ? PRESENCE_SCOPES : BASIC_SCOPES,
    state,
    prompt: "consent",
  })}`;

export const avatarUrl = (id, avatar) =>
  avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128` : "https://cdn.discordapp.com/embed/avatars/0.png";

/* ---------- Storage ---------- */
const q = {
  upsert: db.prepare(`
    INSERT INTO discord_links (user_id, discord_id, username, avatar, access_token, refresh_token, expires_at,
      scopes, presence_enabled, last_status, hs_token, hs_started_at, hs_updated_at, hs_key)
    VALUES (@user_id, @discord_id, @username, @avatar, @access, @refresh, @expires,
      @scopes, @presence, NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT(user_id) DO UPDATE SET
      discord_id = excluded.discord_id, username = excluded.username, avatar = excluded.avatar,
      access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at,
      scopes = excluded.scopes, presence_enabled = excluded.presence_enabled,
      last_status = NULL, hs_token = NULL, hs_started_at = NULL, hs_updated_at = NULL, hs_key = NULL`),
  removeDiscordElsewhere: db.prepare("DELETE FROM discord_links WHERE discord_id = ? AND user_id != ?"),
  byUser: db.prepare("SELECT * FROM discord_links WHERE user_id = ?"),
  all: db.prepare("SELECT * FROM discord_links"),
  updateTokens: db.prepare("UPDATE discord_links SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?"),
  setStatus: db.prepare("UPDATE discord_links SET last_status = ? WHERE user_id = ?"),
  setSession: db.prepare(
    "UPDATE discord_links SET hs_token = ?, hs_started_at = ?, hs_updated_at = ?, hs_key = ? WHERE user_id = ?"
  ),
  setPresence: db.prepare("UPDATE discord_links SET presence_enabled = ? WHERE user_id = ?"),
  remove: db.prepare("DELETE FROM discord_links WHERE user_id = ?"),
  user: db.prepare("SELECT * FROM users WHERE id = ?"),
  services: db.prepare(`
    SELECT s.*, p.name AS plan_name FROM services s
    LEFT JOIN plans p ON p.id = s.plan_id WHERE s.user_id = ? ORDER BY s.id DESC`),
  orders: db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE user_id = ? AND status = 'paid'"),
};

export function saveLink(userId, discordUser, tokens) {
  q.removeDiscordElsewhere.run(discordUser.id, userId);
  const scopes = String(tokens.scope || "");
  q.upsert.run({
    user_id: userId,
    discord_id: discordUser.id,
    username: discordUser.global_name || discordUser.username,
    avatar: discordUser.avatar,
    access: seal(tokens.access_token),
    refresh: seal(tokens.refresh_token),
    expires: Date.now() + tokens.expires_in * 1000,
    scopes,
    presence: scopes.includes("sdk.social_layer_presence") ? 1 : 0,
  });
}

export const getLink = (userId) => q.byUser.get(userId);

async function accessTokenFor(link) {
  if (link.expires_at - 60_000 > Date.now()) return unseal(link.access_token);
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: unseal(link.refresh_token) });
  q.updateTokens.run(seal(t.access_token), seal(t.refresh_token), Date.now() + t.expires_in * 1000, link.user_id);
  return t.access_token;
}

const fmtBytes = (b) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
  return `${(b / 1024 ** i).toFixed(i >= 3 ? 1 : 0)} ${u[i]}`;
};

/* ---------- Linked Roles (profile connection) ---------- */
function roleStatus(userId, online) {
  const user = q.user.get(userId);
  const now = Date.now();
  const active = q.services.all(userId).filter((s) => s.expires_at > now);
  const connected = active.some((s) => online.includes(s.client_email));
  const plan = active[0]?.plan_name || null;
  const username = connected ? `🟢 Connected · ${plan ?? "VMEX"}` : plan || "No active plan";

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

  const body = roleStatus(userId, online);
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

/* ---------- Discord status: "Playing VMEX" (headless session) ---------- */
async function deleteSession(userId, accessToken, sessionToken) {
  if (sessionToken) {
    await fetch(`${API}/users/@me/headless-sessions/delete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ token: sessionToken }),
    }).catch(() => {});
  }
  q.setSession.run(null, null, null, null, userId);
}

export async function syncPresence(userId, online, force = false) {
  const link = q.byUser.get(userId);
  if (!link?.presence_enabled) return null;

  const now = Date.now();
  const row = q.services.all(userId).find((s) => s.expires_at > now && online.includes(s.client_email));
  const token = await accessTokenFor(link);

  // Not connected → clear the status
  if (!row) {
    if (link.hs_token) await deleteSession(userId, token, link.hs_token);
    return null;
  }

  const [svc] = await enrichServices([row]);
  const used = svc.usedBytes ?? 0;
  const usedText = svc.totalBytes ? `${fmtBytes(used)} / ${fmtBytes(svc.totalBytes)}` : `${fmtBytes(used)} used`;
  const plan = row.plan_name || "VMEX";
  const key = `${plan}|${usedText}`;
  const age = now - (link.hs_updated_at || 0);

  // Don't spam Discord: at most every 2 minutes, and always refresh before the 20-minute expiry
  if (!force && link.hs_token && (age < 2 * 60_000 || (link.hs_key === key && age < 10 * 60_000))) {
    return { details: "Connected to VMEX", state: `${plan} · ${usedText}` };
  }

  const startedAt = link.hs_started_at || now;
  const activity = {
    type: 0, // "Playing"
    name: "VMEX",
    application_id: DISCORD_CLIENT_ID,
    platform: "desktop",
    details: "Connected to VMEX",
    state: `${plan} · ${usedText}`.slice(0, 128),
    timestamps: { start: String(startedAt) },
    assets: { large_image: PRESENCE_IMAGE, large_text: "VMEX · Fast, Secure V2Ray" },
  };

  const res = await fetch(`${API}/users/@me/headless-sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...(link.hs_token ? { token: link.hs_token } : {}), activities: [activity] }),
  });

  if (res.status === 202) return null; // Discord is still caching the app — try again next minute
  if (!res.ok) {
    q.setSession.run(null, null, null, null, userId); // start a fresh session next time
    throw new Error(`headless session ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  q.setSession.run(data.token, startedAt, now, key, userId); // token can rotate — keep the newest
  return { details: activity.details, state: activity.state };
}

export async function disablePresence(userId) {
  const link = q.byUser.get(userId);
  if (!link) return;
  if (link.hs_token) {
    try {
      await deleteSession(userId, await accessTokenFor(link), link.hs_token);
    } catch {
      q.setSession.run(null, null, null, null, userId);
    }
  }
  q.setPresence.run(0, userId);
}

export async function removeLink(userId) {
  await disablePresence(userId).catch(() => {});
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
        console.error(`[discord] roles ${link.user_id}:`, e.message);
      }
      try {
        await syncPresence(link.user_id, online);
      } catch (e) {
        console.error(`[discord] status ${link.user_id}:`, e.message);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  };
  setTimeout(run, 10_000);
  setInterval(run, 60_000);
  console.log("✔ Discord sync running (roles + status)");
}