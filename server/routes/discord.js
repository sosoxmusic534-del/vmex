import crypto from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../auth.js";
import { HttpError } from "../errors.js";
import { getOnlineEmails } from "../xui.js";
import {
  authorizeUrl,
  avatarUrl,
  discordConfigured,
  exchangeCode,
  getDiscordUser,
  getLink,
  removeLink,
  saveLink,
  syncUser,
} from "../discord-link.js";
import { notify } from "../discord.js";

const r = Router();
const STATE_COOKIE = "vmex_discord_state";
const back = (res, status) => res.redirect(`/portal/account?discord=${status}#discord`);

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

  if (req.query.error) return back(res, "cancelled");
  if (!state || state !== req.query.state || Number(uid) !== req.user.id) return back(res, "error");

  try {
    const tokens = await exchangeCode(String(req.query.code || ""));
    const discordUser = await getDiscordUser(tokens.access_token);
    saveLink(req.user.id, discordUser, tokens);

    let online = [];
    try {
      online = await getOnlineEmails();
    } catch {}
    await syncUser(req.user.id, online, true);

    notify({
      title: "🔗 Discord linked",
      fields: [
        { name: "VMEX user", value: `${req.user.name} (${req.user.email})` },
        { name: "Discord", value: `${discordUser.username} (${discordUser.id})` },
      ],
    });
    back(res, "linked");
  } catch (error) {
    console.error("[discord] link failed:", error.message);
    back(res, "error");
  }
});

r.get("/me", requireAuth, (req, res) => {
  const link = getLink(req.user.id);
  res.json({
    available: discordConfigured,
    linked: Boolean(link),
    discord: link ? {
      id: link.discord_id,
      username: link.username,
      avatarUrl: avatarUrl(link.discord_id, link.avatar),
      showing: link.last_status ? JSON.parse(link.last_status).platform_username : null,
      linkedAt: link.linked_at,
    } : null,
  });
});

r.post("/sync", requireAuth, async (req, res) => {
  if (!getLink(req.user.id)) throw new HttpError(400, "Connect your Discord first.");
  let online = [];
  try {
    online = await getOnlineEmails();
  } catch {}
  try {
    const body = await syncUser(req.user.id, online, true);
    res.json({ showing: body?.platform_username ?? null });
  } catch {
    throw new HttpError(502, "Couldn't update Discord. Try reconnecting your Discord account.");
  }
});

r.delete("/link", requireAuth, (req, res) => {
  removeLink(req.user.id);
  res.json({ ok: true });
});

export default r;
