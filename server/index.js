import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import portalRoutes from "./routes/portal.js";
import adminRoutes from "./routes/admin.js";
import { customerTickets, adminTickets } from "./routes/tickets.js";
import filesRoutes from "./routes/files.js";
import { HttpError } from "./provision.js";
import { XuiError } from "./xui.js";

const PORT = process.env.PORT || 4000;
const app = express();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/portal/tickets", customerTickets);
app.use("/api/staff/tickets", adminTickets);
app.use("/api/portal", portalRoutes);
app.use("/api/admin/tickets", adminTickets);
app.use("/api/admin", adminRoutes);
app.use("/api/files", filesRoutes);

/* ---------- Serve the built React site (production) ---------- */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");

// Unknown API routes → JSON 404 (not the website)
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

if (fs.existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: false,
      maxAge: "7d",
      setHeaders: (res, file) => {
        if (file.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  // Every other page (/, /portal, /terms…) → index.html so React Router handles it
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(DIST, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
    if (Number.isInteger(err.status)) return res.status(err.status).json({ error: err.message });
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Receipt must be smaller than 5 MB." });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof XuiError) return res.status(502).json({ error: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request body." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

app.listen(PORT, () => console.log(`VMEX API running on http://localhost:${PORT}`));