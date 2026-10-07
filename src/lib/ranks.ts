export const RANKS = [
  { key: "bronze", name: "Bronze", min: 0 },
  { key: "silver", name: "Silver", min: 5 },
  { key: "gold", name: "Gold", min: 15 },
  { key: "platinum", name: "Platinum", min: 30 },
  { key: "diamond", name: "Diamond", min: 50 },
] as const;

export type Rank = (typeof RANKS)[number];

export function getRank(completed: number) {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (completed >= rank.min) index = i;
  });
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? ((completed - current.min) / (next.min - current.min)) * 100 : 100;
  const remaining = next ? next.min - completed : 0;
  return { current, next, progress, remaining };
}
