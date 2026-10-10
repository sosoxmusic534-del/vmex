import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../auth.js";
import { HttpError } from "../errors.js";
import {
  buyGift, claimByToken, getByToken, giftOgPng, giftView, myGifts, publicBase, redeemByCode,
} from "../gifts.js";

let notify = () => {};
import("../discord.js").then((m) => (notify = m.notify)).catch(() => {});

const r = Router();

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => `user-${req.user.id}`,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

/* Public: what the claim page shows */
r.get("/claim/:token", (req, res) => {
  const g = getByToken(req.params.token);
  if (!g) throw new HttpError(404, "This gift link isn't valid.");
  res.json({ gift: giftView(g) });
});

/* Claim with the link */
r.post("/claim/:token", requireAuth, claimLimiter, (req, res) => {
  const amount = claimByToken(req.user.id, req.params.token);
  notify({
    title: "🎁 Gift card claimed",
    fields: [
      { name: "User", value: `${req.user.name} (${req.user.email})` },
      { name: "Amount", value: `LKR ${amount.toLocaleString("en-US")}` },
    ],
  });
  res.json({ ok: true, amount });
});

/* Redeem with a typed code */
r.post("/redeem", requireAuth, claimLimiter, (req, res) => {
  const amount = redeemByCode(req.user.id, req.body?.code);
  res.json({ ok: true, amount });
});

/* Buyer's own gift cards */
r.get("/mine", requireAuth, (req, res) => {
  res.json({ gifts: myGifts(req.user.id, publicBase(req)) });
});

/* Buy a gift card with balance */
r.post("/", requireAuth, (req, res) => {
  const gift = buyGift(req.user.id, req.body ?? {}, publicBase(req));
  notify({
    title: "🎁 Gift card bought",
    fields: [
      { name: "Buyer", value: `${req.user.name} (${req.user.email})` },
      { name: "Amount", value: `LKR ${gift.amount.toLocaleString("en-US")}` },
      { name: "For", value: gift.toName || "—" },
    ],
  });
  res.json({ gift });
});

/* Link-preview image */
r.get("/og/:file", (req, res) => {
  const g = getByToken(String(req.params.file).replace(/\.png$/i, ""));
  if (!g) return res.status(404).end();
  res.type("png").set("Cache-Control", "public, max-age=300").send(giftOgPng(g));
});

export default r;