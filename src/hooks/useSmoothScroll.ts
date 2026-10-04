import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export let lenis: Lenis | null = null;

export function scrollToTarget(target: HTMLElement | number, offset = -100) {
  if (lenis) {
    lenis.scrollTo(target, { offset });
  } else if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export default function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.85, smoothWheel: true });

    let id = 0;
    const raf = (time: number) => {
      lenis?.raf(time);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(id);
      lenis?.destroy();
      lenis = null;
    };
  }, [enabled]);
}