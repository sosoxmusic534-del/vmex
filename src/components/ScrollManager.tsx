import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { lenis, scrollToTarget } from "../hooks/useSmoothScroll";

export default function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (el) scrollToTarget(el);
      }, 80);
      return () => clearTimeout(t);
    }

    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname, hash, key]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href")!;
      navigate(href === "#" ? pathname : pathname + href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate, pathname]);

  return null;
}
