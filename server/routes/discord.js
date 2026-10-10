import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../auth.js";
import { HttpError } from "../errors.js";
import { getOnlineEmails } from "../xui.js";
import {
  authorizeUrl, avatarUrl, discordConfigured, exchangeCode, getDiscordUser,
  getLink, removeLink, saveLink, syncUser,
} from "../discord-link.js";

let notify = () => {};
import("../discord.js").then((m) => (notify = m.notify)).catch(() => {});

const r = Router();
const STATE_COOKIE = "vmex_dc_state";
const back = (res, status, reason) =>
  res.redirect(`/portal/account?discord=${status}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}#discord`);
const onlineList = async () => {
  try {
    return await getOnlineEmails();
  } catch {
    return [];
  }
};

r.get("/link", requireAuth, (req, res) => {
  if (!discordConfigured) return back(res, "unavailable");
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, `${state}.${req.user.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/api/discord",
  });
  res.redirect(authorizeUrl(state));
});

r.get("/callback", requireAuth, async (req, res) => {
  const [state, uid] = String(req.cookies[STATE_COOKIE] || "").split(".");
  res.clearCookie(STATE_COOKIE, { path: "/api/discord" });

  if (req.query.error) {
    const reason = String(req.query.error_description || req.query.error);
    console.error("[discord] authorize error:", req.query.error, "-", reason);
    return back(res, req.query.error === "access_denied" ? "cancelled" : "error", reason);
  }
  if (!state || state !== req.query.state || Number(uid) !== req.user.id) return back(res, "error");

  try {
    const tokens = await exchangeCode(String(req.query.code || ""));
    const discordUser = await getDiscordUser(tokens.access_token);
    saveLink(req.user.id, discordUser, tokens);
    await syncUser(req.user.id, await onlineList(), true).catch((e) => console.error("[discord] roles:", e.message));
    notify({
      title: "🔗 Discord linked",
      fields: [
        { name: "VMEX user", value: `${req.user.name} (${req.user.email})` },
        { name: "Discord", value: `${discordUser.username} (${discordUser.id})` },
      ],
    });
    back(res, "linked");
  } catch (e) {
    console.error("[discord] link failed:", e.message);
    back(res, "error");
  }
});

r.get("/me", requireAuth, (req, res) => {
  const link = getLink(req.user.id);
  res.json({
    available: discordConfigured,
    linked: Boolean(link),
    discord: link
      ? {
          id: link.discord_id,
          username: link.username,
          avatarUrl: avatarUrl(link.discord_id, link.avatar),
          showing: link.last_status ? JSON.parse(link.last_status).platform_username : null,
          linkedAt: link.linked_at,
        }
      : null,
  });
});

r.post("/sync", requireAuth, async (req, res) => {
  if (!getLink(req.user.id)) throw new HttpError(400, "Connect your Discord first.");
  try {
    const body = await syncUser(req.user.id, await onlineList(), true);
    res.json({ showing: body?.platform_username ?? null });
  } catch (e) {
    console.error("[discord] manual sync:", e.message);
    throw new HttpError(502, "Couldn't update Discord. Try reconnecting your Discord account.");
  }
});

r.delete("/link", requireAuth, (req, res) => {
  removeLink(req.user.id);
  res.json({ ok: true });
});

export default r;