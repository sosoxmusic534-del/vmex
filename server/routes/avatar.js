import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { renderAvatarPng } from "../avatar.js";

const r = Router();
const getUser = db.prepare("SELECT email FROM users WHERE id = ?");

/* The logged-in user's avatar as a PNG (same face as the dashboard) */
r.get("/avatar.png", requireAuth, (req, res) => {
  const user = getUser.get(req.user.id);
  if (!user) return res.status(404).end();
  res.type("png").set("Cache-Control", "private, max-age=3600").send(renderAvatarPng(user.email));
});

export default r;