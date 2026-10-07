import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../auth.js";
import { HttpError } from "../errors.js";
import { getOnlineEmails } from "../xui.js";
import {
  authorizeUrl, avatarUrl, disablePresence, discordConfigured, exchangeCode, getDiscordUser,
  getLink, removeLink, saveLink, syncPresence, syncUser,
} from "../discord-link.js";

let notify = () => {};
import("../discord.js").then((m) => (notify = m.notify)).catch(() => {});

const r = Router();
const STATE_COOKIE = "vmex_dc_state";
const back = (res, status) => res.redirect(`/portal/account?discord=${status}#discord`);
const onlineList = async () => {
  try {
    return await getOnlineEmails();
  } catch {
    return [];
  }
};

/* Start linking. ?presence=1 also asks for the Discord status permission */
r.get("/link", requireAuth, (req, res) => {
  if (!discordConfigured) return back(res, "unavailable");
  const presence = req.query.presence === "1";
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, `${state}.${req.user.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/api/discord",
  });
  res.redirect(authorizeUrl(state, presence));
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

    const online = await onlineList();
    await syncUser(req.user.id, online, true).catch((e) => console.error("[discord] roles:", e.message));
    await syncPresence(req.user.id, online, true).catch((e) => console.error("[discord] status:", e.message));

    notify({
      title: "🔗 Discord linked",
      fields: [
        { name: "VMEX user", value: `${req.user.name} (${req.user.email})` },
        { name: "Discord", value: `${discordUser.username} (${discordUser.id})` },
        { name: "Status enabled", value: String(tokens.scope || "").includes("sdk.social_layer_presence") ? "Yes" : "No" },
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
          presence: {
            enabled: Boolean(link.presence_enabled),
            live: Boolean(link.hs_token),
            text: link.hs_key ? link.hs_key.replace("|", " · ") : null,
          },
        }
      : null,
  });
});

r.post("/sync", requireAuth, async (req, res) => {
  if (!getLink(req.user.id)) throw new HttpError(400, "Connect your Discord first.");
  const online = await onlineList();
  try {
    const roles = await syncUser(req.user.id, online, true);
    const status = await syncPresence(req.user.id, online, true);
    res.json({ showing: roles?.platform_username ?? null, status });
  } catch (e) {
    console.error("[discord] manual sync:", e.message);
    throw new HttpError(502, "Couldn't update Discord. Try reconnecting your Discord account.");
  }
});

r.post("/presence/off", requireAuth, async (req, res) => {
  await disablePresence(req.user.id);
  res.json({ ok: true });
});

r.delete("/link", requireAuth, async (req, res) => {
  await removeLink(req.user.id);
  res.json({ ok: true });
});

export default r;