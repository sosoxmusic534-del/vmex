const STYLE = "notionists";

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=2f6bff,1e3a8a,0f172a&radius=50`;
}
