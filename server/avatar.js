// server/avatar.js
import { Style, Avatar } from "@dicebear/core";
import definition from "@dicebear/styles/initial-face.json" with { type: "json" };
import { Resvg } from "@resvg/resvg-js";

const style = new Style(definition);
const cache = new Map();

export function renderAvatarPng(email) {
  const seed = String(email).trim().toLowerCase();
  if (cache.has(seed)) return cache.get(seed);
  const svg = new Avatar(style, { seed }).toString();
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 256 } }).render().asPng();
  if (cache.size > 500) cache.clear();
  cache.set(seed, png);
  return png;
}