import { useEffect } from "react";

const SELECTORS = [
  ".section-eyebrow",
  ".section-title",
  ".pkg-pill",
  ".pkg-sub",
  ".plans-sub",
  ".feature-card",
  ".pkg-card",
  ".pkg-routes",
  ".plan-card",
  ".team-card",
  ".guide-sub",
  ".guide-card",
  ".faq-sub",
  ".faq-cta",
  ".faq-item",
  ".cta-card",
  ".footer-brand",
  ".footer-col",
  ".legal-crumbs",
  ".legal-pill",
  ".legal-title",
  ".legal-dates",
  ".legal-intro",
  ".legal-block",
  ".legal-block h2",
  ".legal-block p",
  ".legal-toc",
  ".about-block",
  ".about-block h2",
  ".about-block p",
  ".about-tagline",
  ".about-intro",
  ".about-quote",
].join(",");

export default function useScrollReveal(enabled: boolean, routeKey?: string) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS));

    els.forEach((el) => {
      const siblings = el.parentElement
        ? Array.from(el.parentElement.children).filter((c) => c.matches(SELECTORS))
        : [el];
      const i = Math.min(siblings.indexOf(el), 6);
      el.style.setProperty("--d", `${i * 0.12}s`);
      el.classList.add("reveal");
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add("is-visible");
          io.unobserve(el);

          // clean up afterwards so hover effects work normally
          const delay = parseFloat(el.style.getPropertyValue("--d")) || 0;
          setTimeout(() => {
            el.classList.remove("reveal", "is-visible");
            el.style.removeProperty("--d");
          }, (delay + 1.1) * 1000);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled, routeKey]);
}