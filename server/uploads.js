import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { HttpError } from "./provision.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const RECEIPT_DIR = path.join(dirname, "uploads", "receipts");
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: RECEIPT_DIR,
    filename: (_req, file, callback) => callback(null, `${crypto.randomBytes(16).toString("hex")}${TYPES[file.mimetype] || ".bin"}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!TYPES[file.mimetype]) return callback(new HttpError(400, "Receipt must be a JPG, PNG, WEBP or PDF file."));
    callback(null, true);
  },
}).single("receipt");

export const isImage = (filename) => /\.(jpe?g|png|webp)$/i.test(filename);

export async function checkMagic(filePath) {
  const handle = await fsp.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, buffer.length, 0);
    const extension = path.extname(filePath).toLowerCase();
    const valid =
      (extension === ".jpg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      (extension === ".png" && buffer.toString("hex", 0, 4) === "89504e47") ||
      (extension === ".webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") ||
      (extension === ".pdf" && buffer.toString("ascii", 0, 4) === "%PDF");
    if (!valid) throw new HttpError(400, "That file doesn't look like a real image or PDF.");
  } finally {
    await handle.close();
  }
}