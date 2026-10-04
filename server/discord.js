import fs from "node:fs/promises";
import path from "node:path";

const COLORS = { info: 0x2f7bff, success: 0x22c55e, warn: 0xf59e0b, danger: 0xef4444 };

export function notify({ title, description, color = "info", fields = [], file } = {}) {
  if (!process.env.DISCORD_WEBHOOK_URL) return;
  send({ title, description, color, fields, file }).catch((error) => {
    console.error("[discord]", error.message);
  });
}

async function send({ title, description, color, fields, file }) {
  const embed = {
    title: String(title || "VMEX event").slice(0, 256),
    ...(description ? { description: String(description).slice(0, 4000) } : {}),
    color: COLORS[color] ?? COLORS.info,
    fields: fields
      .filter((field) => field.value !== undefined && field.value !== null && field.value !== "")
      .map((field) => ({ name: String(field.name).slice(0, 256), value: String(field.value).slice(0, 1024), inline: field.inline ?? true })),
    timestamp: new Date().toISOString(),
    footer: { text: "VMEX Portal" },
  };
  const payload = { username: "VMEX Logs", embeds: [embed], allowed_mentions: { parse: [] } };
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  let response;

  if (file) {
    const name = path.basename(file.path);
    if (file.isImage) embed.image = { url: `attachment://${name}` };
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    form.append("files[0]", new Blob([await fs.readFile(file.path)], { type: file.mime }), name);
    response = await fetch(webhook, { method: "POST", body: form });
  } else {
    response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
}

export const device = (req) => String(req.headers["user-agent"] || "unknown").slice(0, 200);