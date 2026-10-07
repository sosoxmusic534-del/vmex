import crypto from "node:crypto";
import { Agent, fetch } from "undici";
import { getSetting } from "./db.js";

export class XuiError extends Error {}

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
let session = { cookie: "", key: "", at: 0 };

export function xuiConfig() {
  return {
    url: getSetting("xui_url").replace(/\/+$/, ""),
    authMode: getSetting("xui_auth", "password"),
    username: getSetting("xui_username"),
    password: getSetting("xui_password"),
    token: getSetting("xui_token"),
    subUrl: getSetting("xui_sub_url").replace(/\/+$/, ""),
    insecure: getSetting("xui_insecure", "0") === "1",
  };
}

export const isConfigured = () => {
  const config = xuiConfig();
  if (!config.url) return false;
  return config.authMode === "token" ? Boolean(config.token) : Boolean(config.username && config.password);
};

export const resetXuiSession = () => { session = { cookie: "", key: "", at: 0 }; };

export const parseJson = (value) => {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
};

async function send(config, pathname, init) {
  try {
    return await fetch(config.url + pathname, {
      ...init,
      redirect: "manual",
      dispatcher: config.insecure ? insecureAgent : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new XuiError(`Cannot reach the X-UI panel (${error.cause?.code || error.message}).`);
  }
}

async function login(config) {
  const response = await send(config, "/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: config.username, password: config.password }).toString(),
  });
  const data = await response.json().catch(() => null);
  if (!data?.success) {
    throw new XuiError(data?.msg ? `X-UI login failed: ${data.msg}` : `X-UI login failed (HTTP ${response.status}). Check the panel URL and base path.`);
  }
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  if (!cookie) throw new XuiError("X-UI login did not return a session cookie.");
  session = { cookie, key: `${config.url}|${config.username}`, at: Date.now() };
}

async function request(pathname, { method = "GET", body } = {}, retry = true) {
  const config = xuiConfig();
  if (!isConfigured()) throw new XuiError("The X-UI panel is not connected yet.");
  const headers = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  if (config.authMode === "token") {
    headers.Authorization = `Bearer ${config.token}`;
  } else {
    const key = `${config.url}|${config.username}`;
    if (!session.cookie || session.key !== key || Date.now() - session.at > 20 * 60 * 1000) await login(config);
    headers.Cookie = session.cookie;
  }
  const response = await send(config, pathname, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!data) {
    const where = `${method} ${pathname}`;
    if (response.status === 404) {
      throw new XuiError(`Endpoint not found on the panel (HTTP 404): ${where}`);
    }
    if (config.authMode === "token") {
      if (response.status === 401 || response.status === 403) {
        throw new XuiError(`X-UI rejected the API token (HTTP ${response.status}): ${where}`);
      }
      if (response.status >= 300 && response.status < 400) {
        throw new XuiError("X-UI redirected the request (HTTP " + response.status + "). The token wasn't accepted, or the panel URL/base path is wrong.");
      }
      throw new XuiError(`X-UI request failed (HTTP ${response.status}): ${where}`);
    }
    if (retry) {
      resetXuiSession();
      return request(pathname, { method, body }, false);
    }
    throw new XuiError(`X-UI request failed (HTTP ${response.status}): ${where}`);
  }
  if (!data.success) throw new XuiError(data.msg || "X-UI returned an error.");
  return data.obj;
}

export const listInbounds = () => request("/panel/api/inbounds/list");
export const getInbound = (id) => request(`/panel/api/inbounds/get/${id}`);

let onlineCache = { at: 0, list: [] };
export async function getOnlineEmails() {
  if (Date.now() - onlineCache.at < 15_000) return onlineCache.list;
  const payload = await request("/panel/api/inbounds/onlines", { method: "POST" });
  onlineCache = { at: Date.now(), list: Array.isArray(payload) ? payload : [] };
  return onlineCache.list;
}

export async function getClientTraffic(email) {
  const encodedEmail = encodeURIComponent(email);
  try {
    const traffic = await request(`/panel/api/inbounds/getClientTraffics/${encodedEmail}`);
    if (traffic && (traffic.up !== undefined || traffic.down !== undefined)) return traffic;
  } catch {
    // Newer 3x-ui releases expose aggregate usage via the client lookup endpoint.
  }

  const details = await request(`/panel/api/clients/get/${encodedEmail}`);
  const client = details?.client;
  if (!client) throw new XuiError(`Client not found on the X-UI panel: ${email}`);

  const usage = details.usedTraffic;
  const up = typeof usage === "object" && usage !== null ? Number(usage.up) || 0 : 0;
  const down = typeof usage === "number" ? usage : typeof usage === "object" && usage !== null ? Number(usage.down) || 0 : 0;
  return {
    up,
    down,
    expiryTime: client.expiryTime,
    enable: client.enable,
  };
}

const clientKey = (protocol, client) => {
  if (protocol === "vless" || protocol === "vmess") return client.id;
  if (protocol === "trojan") return client.password;
  if (protocol === "shadowsocks") return client.email;
  return client.id || client.password || client.auth || client.email;
};

export async function removeClientByEmail(inboundIds, email) {
  const results = await Promise.allSettled(
    inboundIds.map(async (id) => {
      const inbound = await getInbound(id);
      const client = (parseJson(inbound.settings).clients || []).find((item) => item.email === email);
      if (!client) return;
      await request(
        `/panel/api/inbounds/${id}/delClient/${encodeURIComponent(clientKey(inbound.protocol, client))}`,
        { method: "POST" }
      );
    })
  );
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) throw new XuiError(failed.map((result) => result.reason.message).join("\n"));
}

export async function createClient({ inboundIds, email, totalBytes, expiresAt }) {
  const all = await listInbounds();
  const selected = inboundIds.map((id) => all.find((inbound) => inbound.id === id));
  const missing = inboundIds.filter((_, index) => !selected[index]);
  if (missing.length) {
    throw new XuiError(`Inbound ${missing.join(", ")} no longer exists on the X-UI panel.`);
  }

  const vless = selected.filter((inbound) => inbound.protocol === "vless");
  const vision = vless.length > 0 && vless.every((inbound) => {
    const stream = parseJson(inbound.streamSettings);
    return stream.network === "tcp" && ["reality", "tls"].includes(stream.security);
  });

  const subId = crypto.randomBytes(8).toString("hex");
  const client = {
    email,
    totalGB: totalBytes,
    expiryTime: expiresAt,
    tgId: 0,
    limitIp: 0,
    limitHwid: 0,
    enable: true,
    subId,
    ...(vision ? { flow: "xtls-rprx-vision" } : {}),
  };

  try {
    await request("/panel/api/clients/add", { method: "POST", body: { client, inboundIds } });
  } catch (error) {
    await removeClientByEmail(inboundIds, email).catch(() => {});
    throw error;
  }

  const protocol = [...new Set(selected.map((inbound) => inbound.protocol))].join(" + ");
  return { protocol, subId };
}

export function subscriptionLink(subId) {
  const { subUrl } = xuiConfig();
  return subUrl ? `${subUrl}/${subId}` : null;
}

export async function enrichServices(rows) {
  const live = isConfigured();
  const results = await Promise.allSettled(rows.map((service) => live ? getClientTraffic(service.client_email) : Promise.reject()));
  return rows.map((service, index) => {
    const traffic = results[index].status === "fulfilled" ? results[index].value : null;
    const usedBytes = traffic ? (traffic.up || 0) + (traffic.down || 0) : null;
    const expiresAt = traffic && traffic.expiryTime > 0 ? traffic.expiryTime : service.expires_at;
    const expired = expiresAt > 0 && expiresAt < Date.now();
    const overQuota = service.total_bytes > 0 && usedBytes !== null && usedBytes >= service.total_bytes;
    const status = traffic && traffic.enable === false ? "disabled" : expired ? "expired" : overQuota ? "limited" : "active";
    return {
      id: service.id,
      name: service.name,
      planName: service.plan_name ?? null,
      protocol: service.protocol,
      usedBytes,
      totalBytes: service.total_bytes,
      expiresAt,
      status,
      live: Boolean(traffic),
      createdAt: service.created_at,
      subLink: subscriptionLink(service.sub_id),
      user: service.user_name ? { name: service.user_name, email: service.user_email } : undefined,
    };
  });
}

const clientLinksPath = (subId) => `/panel/api/clients/subLinks/${encodeURIComponent(subId)}`;

export async function getClientLinks(_email, subId) {
  if (!subId) throw new XuiError("This service has no subscription ID saved.");

  const obj = await request(clientLinksPath(subId));
  const supportedProtocols = /^(?:vless|vmess|trojan|ss|hysteria|hy2):\/\//i;
  return Array.isArray(obj)
    ? obj.filter((link) => typeof link === "string" && supportedProtocols.test(link))
    : [];
}
