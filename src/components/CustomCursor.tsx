import { useEffect, useRef } from "react";
import "./CustomCursor.css";

const HOVER = 'a, button, [role="button"], [role="tab"], input[type="submit"], label, select, summary, .cursor-hover';
const TEXT = 'input:not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]';

export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.documentElement.classList.add("has-custom-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    let raf = 0;
    let visible = false;

    const move = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;

      if (!visible) {
        visible = true;
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        dot.current?.classList.add("is-visible");
        ring.current?.classList.add("is-visible");
      }

      const t = e.target as Element | null;
      const onText = !!t?.closest?.(TEXT);
      const onHover = !onText && !!t?.closest?.(HOVER);

      ring.current?.classList.toggle("is-hover", onHover);
      dot.current?.classList.toggle("is-hover", onHover);
      ring.current?.classList.toggle("is-text", onText);
      dot.current?.classList.toggle("is-text", onText);
    };

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;

      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;

      raf = requestAnimationFrame(loop);
    };

    const down = () => ring.current?.classList.add("is-down");
    const up = () => ring.current?.classList.remove("is-down");
    const leave = () => {
      visible = false;
      dot.current?.classList.remove("is-visible");
      ring.current?.classList.remove("is-visible");
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cc-ring" aria-hidden />
      <div ref={dot} className="cc-dot" aria-hidden />
    </>
  );
}
