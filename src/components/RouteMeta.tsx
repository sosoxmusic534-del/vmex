import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = window.location.origin;
const LIVE_HOST = "vmex.net";
const DEFAULT_DESC =
  "Ultra-low latency V2Ray configs (VLESS, VMess, Trojan) on Singapore & India servers for Sri Lankan networks.";

type Meta = { title: string; description?: string; index?: boolean };

const pages: Record<string, Meta> = {
  "/": { title: "VMEX — Fast, Secure V2Ray Servers in Sri Lanka" },
  "/about": {
    title: "About VMEX — Our Network & Mission",
    description: "Learn about VMEX Solutions, our Singapore & India network and the protocols we support.",
  },
  "/terms": { title: "Terms & Conditions — VMEX", description: "The terms for using VMEX services." },
  "/privacy": { title: "Privacy Policy — VMEX", description: "How VMEX collects, uses and protects your data." },
  "/refund": { title: "Refund Policy — VMEX", description: "When and how VMEX issues refunds." },
  "/portal/login": { title: "Log in — VMEX Client Portal", index: false },
  "/portal/register": { title: "Create Account — VMEX Client Portal", index: false },
};

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [, key, name] = selector.match(/\[(name|property)="([^"]+)"\]/) ?? [];
    if (key && name) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPortal = pathname.startsWith("/portal");
    const meta: Meta =
      pages[pathname] ?? (isPortal ? { title: "Client Portal — VMEX", index: false } : pages["/"]);

    const description = meta.description ?? DEFAULT_DESC;
    const url = SITE + (pages[pathname] ? pathname : "/");

    const isLive = window.location.hostname === LIVE_HOST || window.location.hostname === `www.${LIVE_HOST}`;
    document.title = meta.title;
    setMeta('meta[name="description"]', "content", description);
    setMeta(
      'meta[name="robots"]',
      "content",
      !isLive || meta.index === false || isPortal ? "noindex, nofollow" : "index, follow"
    );
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = url;
  }, [pathname]);

  return null;
}
