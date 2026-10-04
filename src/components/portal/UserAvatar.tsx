import { useMemo } from "react";
import { Style, Avatar } from "@dicebear/core";
import definition from "@dicebear/styles/initial-face.json";

const style = new Style(definition as ConstructorParameters<typeof Style>[0]);
const cache = new Map<string, string>();

function avatarUri(seed: string) {
  let uri = cache.get(seed);
  if (!uri) {
    const svg = new Avatar(style, { seed }).toString();
    uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    cache.set(seed, uri);
  }
  return uri;
}

type Props = {
  seed: string;
  name?: string;
  size?: "sm" | "md" | "lg";
};

export default function UserAvatar({ seed, name, size = "md" }: Props) {
  const src = useMemo(() => {
    try {
      return avatarUri(seed.trim().toLowerCase());
    } catch {
      return null;
    }
  }, [seed]);

  return (
    <span className={`dash-avatar ${size}`}>
      {src ? (
        <img src={src} alt={name ? `${name}'s avatar` : ""} draggable={false} />
      ) : (
        (name ?? "?").charAt(0).toUpperCase()
      )}
    </span>
  );
}
