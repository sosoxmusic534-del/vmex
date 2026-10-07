import { Router } from "express";
import path from "node:path";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { RECEIPT_DIR } from "../uploads.js";

const router = Router();
const findOwner = db.prepare(`
  SELECT user_id FROM invoices WHERE receipt_file = ?
  UNION ALL
  SELECT user_id FROM topups WHERE receipt_file = ?
  LIMIT 1`);

router.get("/receipts/:file", requireAuth, (req, res) => {
  const filename = path.basename(req.params.file);
  const receipt = findOwner.get(filename, filename);
  if (!receipt || (receipt.user_id !== req.user.id && req.user.role !== "admin")) {
    return res.status(404).json({ error: "File not found." });
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(path.join(RECEIPT_DIR, filename));
});

export default router;