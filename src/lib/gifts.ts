export type GiftDesign = "aurora" | "midnight" | "neon" | "sunset";
export type GiftStatus = "available" | "claimed" | "expired" | "disabled";

export type GiftView = {
  amount: number;
  design: GiftDesign;
  toName: string;
  fromName: string;
  message: string;
  status: GiftStatus;
};

export type MyGift = GiftView & {
  id: number;
  code: string;
  claimUrl: string | null;
  createdAt: string;
  claimedAt: string | null;
};

export const GIFT_MIN = 200;
export const GIFT_MAX = 50000;
export const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

export const GIFT_DESIGNS: { id: GiftDesign; name: string }[] = [
  { id: "aurora", name: "Aurora" },
  { id: "midnight", name: "Midnight" },
  { id: "neon", name: "Neon" },
  { id: "sunset", name: "Sunset" },
];

export const lkr = (n: number) => `LKR ${Math.round(n || 0).toLocaleString("en-US")}`;

export const STATUS_LABEL: Record<GiftStatus, string> = {
  available: "Available",
  claimed: "Claimed",
  expired: "Expired",
  disabled: "Inactive",
};

/** Small fetch helper (uses the login cookie). */
export async function gapi<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Something went wrong (${res.status})`);
  return data as T;
}

/** Ask the auth context to reload the user (balance), whatever it's called. */
export function refreshUser(auth: unknown) {
  const a = auth as { refresh?: () => unknown; reload?: () => unknown; refreshUser?: () => unknown };
  (a.refresh ?? a.reload ?? a.refreshUser)?.call(a);
}

export const toDate = (s: string | null) =>
  s ? new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`).toLocaleDateString() : "";