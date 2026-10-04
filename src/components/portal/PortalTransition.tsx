import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PortalLoader from "./PortalLoader";

type Section = "site" | "auth" | "app";

const sectionOf = (path: string): Section =>
  path.startsWith("/portal/login") || path.startsWith("/portal/register")
    ? "auth"
    : path.startsWith("/portal")
      ? "app"
      : "site";

function messageFor(from: Section, to: Section) {
  if (to === "app") return from === "auth" ? "Signing you in…" : "Opening your dashboard…";
  if (to === "auth") return from === "app" ? "Signing you out…" : "Opening client portal…";
  return "Loading VMEX…";
}

export default function PortalTransition() {
  const { pathname } = useLocation();
  const prev = useRef<Section>(sectionOf(pathname));
  const origin = useRef<Section | null>(null);
  const timers = useRef<number[]>([]);
  const [state, setState] = useState<{ msg: string; leaving: boolean } | null>(null);

  useEffect(() => {
    const next = sectionOf(pathname);
    const from = prev.current;
    prev.current = next;
    if (from === next) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // If a redirect happens mid-transition (e.g. /portal → /portal/login),
    // keep the original starting point so the message stays correct.
    const start = origin.current ?? from;
    origin.current = start;

    timers.current.forEach(clearTimeout);
    setState({ msg: messageFor(start, next), leaving: false });

    timers.current = [
      window.setTimeout(() => setState((s) => (s ? { ...s, leaving: true } : s)), 900),
      window.setTimeout(() => {
        setState(null);
        origin.current = null;
      }, 1350),
    ];
  }, [pathname]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!state) return null;
  return <PortalLoader overlay message={state.msg} leaving={state.leaving} />;
}