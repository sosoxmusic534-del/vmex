export function formatBytes(b: number | null | undefined) {
  if (b == null) return "—";
  if (b === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  return `${(b / 1024 ** i).toFixed(i >= 3 ? 2 : 0)} ${units[i]}`;
}

export const formatLKR = (n: number) =>
  `LKR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const toDate = (v: string | number) =>
  typeof v === "number" ? new Date(v) : new Date(v.replace(" ", "T") + "Z");

export const formatDate = (v: string | number) =>
  toDate(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export const daysLeft = (ms: number) => Math.max(0, Math.ceil((ms - Date.now()) / 86_400_000));

export const formatDateTime = (v: string | number) =>
  new Date(typeof v === "number" ? v : v.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });