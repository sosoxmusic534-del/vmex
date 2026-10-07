import crypto from "node:crypto";
import db from "./db.js";
import { getOnlineEmails } from "./xui.js";

const API = "https://discord.com/api/v10";
const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
export const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
export const REDIRECT_URI = `${PUBLIC_URL}/api/discord/callback`;
export const discordConfigured = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && PUBLIC_URL);

const KEY = crypto.createHash("sha256").update(`discord:${process.env.JWT_SECRET || "dev-only-secret-change-me"}`).digest();

const seal = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64")).join(".");
};

const unseal = (value) => {
  const [iv, tag, encrypted] = String(value).split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

async function tokenRequest(params) {
  const response = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, ...params }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Discord token error: ${data.error_description || data.error || response.status}`);
  return data;
}

export const exchangeCode = (code) => tokenRequest({
  grant_type: "authorization_code",
  code,
  redirect_uri: REDIRECT_URI,
});

export async function getDiscordUser(accessToken) {
  const response = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Discord /users/@me failed (${response.status})`);
  return response.json();
}

export const authorizeUrl = (state) => `https://discord.com/oauth2/authorize?${new URLSearchParams({
  client_id: DISCORD_CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: "identify role_connections.write",
  state,
  prompt: "consent",
})}`;

export const avatarUrl = (id, avatar) => avatar
  ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`
  : "https://cdn.discordapp.com/embed/avatars/0.png";

const q = {
  upsert: db.prepare(`
    INSERT INTO discord_links (user_id, discord_id, username, avatar, access_token, refresh_token, expires_at, last_status)
    VALUES (@user_id, @discord_id, @username, @avatar, @access, @refresh, @expires, NULL)
    ON CONFLICT(user_id) DO UPDATE SET
      discord_id = excluded.discord_id,
      username = excluded.username,
      avatar = excluded.avatar,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      last_status = NULL
  `),
  removeDiscordElsewhere: db.prepare("DELETE FROM discord_links WHERE discord_id = ? AND user_id != ?"),
  byUser: db.prepare("SELECT * FROM discord_links WHERE user_id = ?"),
  all: db.prepare("SELECT * FROM discord_links"),
  updateTokens: db.prepare("UPDATE discord_links SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?"),
  setStatus: db.prepare("UPDATE discord_links SET last_status = ? WHERE user_id = ?"),
  remove: db.prepare("DELETE FROM discord_links WHERE user_id = ?"),
  user: db.prepare("SELECT * FROM users WHERE id = ?"),
  services: db.prepare(`
    SELECT s.client_email, s.expires_at, p.name AS plan_name
    FROM services s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id = ?
    ORDER BY s.id DESC
  `),
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
export const removeLink = (userId) => q.remove.run(userId);

async function accessTokenFor(link) {
  if (link.expires_at - 60_000 > Date.now()) return unseal(link.access_token);
  const token = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: unseal(link.refresh_token),
  });
  q.updateTokens.run(
    seal(token.access_token),
    seal(token.refresh_token),
    Date.now() + token.expires_in * 1000,
    link.user_id,
  );
  return token.access_token;
}

function statusFor(userId, online) {
  const user = q.user.get(userId);
  const services = q.services.all(userId);
  const now = Date.now();
  const active = services.filter((service) => service.expires_at > now);
  const connected = active.some((service) => online.includes(service.client_email));
  const plan = active[0]?.plan_name || null;
  const username = connected
    ? `🟢 Connected · ${plan ?? "VMEX"}`
    : plan || "No active plan";

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
  const response = await fetch(`${API}/users/@me/applications/${DISCORD_CLIENT_ID}/role-connection`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: json,
  });
  if (!response.ok) throw new Error(`Discord role-connection update failed (${response.status})`);
  q.setStatus.run(json, userId);
  return body;
}

export function startDiscordSync() {
  if (!discordConfigured) {
    console.warn("! Discord linking not configured (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / PUBLIC_URL)");
    return;
  }

  const run = async () => {
    let online = [];
    try {
      online = await getOnlineEmails();
    } catch {
      // Keep the last known online state when the panel is temporarily unavailable.
    }

    for (const link of q.all.all()) {
      try {
        await syncUser(link.user_id, online);
      } catch (error) {
        console.error(`[discord] sync user ${link.user_id}:`, error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  setTimeout(run, 10_000);
  setInterval(run, 60_000);
  console.log("✔ Discord linked roles sync running");
}
