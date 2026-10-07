import { useEffect, useRef } from "react";

const LINES = 26;
const PACKETS = 12;
const STARS = 140;

type Packet = { line: number; x: number; speed: number; size: number };
type Star = { x: number; y: number; r: number; phase: number; speed: number };

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let prev = 0;
    let lineGrad: CanvasGradient | null = null;
    let packets: Packet[] = [];
    let stars: Star[] = [];

    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 48;
    const s = sprite.getContext("2d");
    if (!s) return;
    const g = s.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, "rgba(220,240,255,1)");
    g.addColorStop(0.2, "rgba(120,195,255,0.9)");
    g.addColorStop(0.5, "rgba(47,123,255,0.35)");
    g.addColorStop(1, "rgba(47,123,255,0)");
    s.fillStyle = g;
    s.fillRect(0, 0, 48, 48);

    const waveY = (x: number, k: number, t: number) =>
      h * 0.6 +
      Math.sin(x * 0.0026 + t * 0.00022 + k * 2.3) * h * 0.13 +
      Math.sin(x * 0.0059 - t * 0.00035 + k * 1.5) * h * 0.05 +
      k * h * 0.24 * Math.cos(x * 0.0017 + t * 0.00018);

    const newPacket = (randomX: boolean): Packet => ({
      line: Math.floor(Math.random() * LINES),
      x: randomX ? Math.random() * w : -60,
      speed: 0.05 + Math.random() * 0.11,
      size: 12 + Math.random() * 14,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      lineGrad = ctx.createLinearGradient(0, 0, w, 0);
      lineGrad.addColorStop(0, "rgba(47,107,255,0)");
      lineGrad.addColorStop(0.2, "rgba(47,107,255,0.9)");
      lineGrad.addColorStop(0.55, "rgba(110,190,255,1)");
      lineGrad.addColorStop(0.85, "rgba(47,107,255,0.8)");
      lineGrad.addColorStop(1, "rgba(47,107,255,0)");

      packets = Array.from({ length: PACKETS }, () => newPacket(true));
      stars = Array.from({ length: STARS }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: Math.random() < 0.85 ? 1 : 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.0016,
      }));
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const st of stars) {
        const a = 0.15 + (Math.sin(t * st.speed + st.phase) + 1) * 0.3;
        ctx.fillStyle = `rgba(160,205,255,${a.toFixed(3)})`;
        ctx.fillRect(st.x, st.y, st.r, st.r);
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = lineGrad!;
      for (let i = 0; i < LINES; i++) {
        const k = i / (LINES - 1) - 0.5;
        ctx.globalAlpha = 0.08 + (1 - Math.abs(k) * 2) * 0.28;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 22) {
          const y = waveY(x, k, t);
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "lighter";
      for (const p of packets) {
        p.x += p.speed * dt;
        if (p.x > w + 80) Object.assign(p, newPacket(false));
        const k = p.line / (LINES - 1) - 0.5;

        for (let j = 6; j >= 0; j--) {
          const tx = p.x - j * 9;
          const ty = waveY(tx, k, t);
          const size = p.size * (1 - j * 0.11);
          ctx.globalAlpha = j === 0 ? 0.95 : (1 - j / 7) * 0.35;
          ctx.drawImage(sprite, tx - size / 2, ty - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      const dt = Math.min(t - (prev || t), 60);
      prev = t;
      last = t;
      draw(t, dt);
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) draw(0, 0);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="abg" aria-hidden="true">
      <span className="abg-aurora a" />
      <span className="abg-aurora b" />
      <span className="abg-aurora c" />
      <canvas ref={canvasRef} />
      <div className="abg-vignette" />
    </div>
  );
}
