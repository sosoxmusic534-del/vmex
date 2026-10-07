import { useMemo } from "react";

type Props = {
  variant?: "blue" | "purple";
  dots?: boolean;
  animated?: boolean;
  fixed?: boolean;
  className?: string;
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ribbon(opts: {
  lines: number;
  baseY: number;
  amp1: number;
  amp2: number;
  freq1: number;
  freq2: number;
  phase: number;
  spread: number;
  twist: number;
}) {
  const { lines, baseY, amp1, amp2, freq1, freq2, phase, spread, twist } = opts;
  const paths: string[] = [];

  for (let i = 0; i < lines; i++) {
    const k = i / (lines - 1) - 0.5;
    let d = "";

    for (let x = -100; x <= 1700; x += 16) {
      const y =
        baseY +
        Math.sin(x * freq1 + phase + k * twist) * amp1 +
        Math.sin(x * freq2 + phase * 1.7 - k * twist * 0.6) * amp2 +
        k * spread * Math.cos(x * 0.0021 + phase);

      d += `${x === -100 ? "M" : "L"}${x},${y.toFixed(1)}`;
    }

    paths.push(d);
  }

  return paths;
}

export default function WaveBackground({
  variant = "blue",
  dots = true,
  animated = false,
  fixed = false,
  className = "",
}: Props) {
  const art = useMemo(() => {
    const main = ribbon({
      lines: 46,
      baseY: 470,
      amp1: 120,
      amp2: 45,
      freq1: 0.0032,
      freq2: 0.0071,
      phase: 0.6,
      spread: 230,
      twist: 2.4,
    });
    const soft = ribbon({
      lines: 26,
      baseY: 380,
      amp1: 90,
      amp2: 30,
      freq1: 0.0026,
      freq2: 0.0058,
      phase: 2.4,
      spread: 160,
      twist: 1.8,
    });

    const random = rng(42);
    const pts: { x: number; y: number; r: number; o: number; glow: boolean }[] = [];

    for (let col = 0; col < 34; col++) {
      for (let row = 0; row < 26; row++) {
        const x = 980 + col * 18;
        const y = 40 + row * 18;
        const fade = 1 - row / 26;

        if (random() < 0.16 * fade + 0.03) {
          pts.push({ x, y, r: 1.4, o: 0.25 + random() * 0.5, glow: random() < 0.12 });
        }
      }
    }

    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 8; row++) {
        if (random() < 0.22) {
          pts.push({ x: 30 + col * 16, y: 760 + row * 16, r: 1.3, o: 0.3 + random() * 0.4, glow: random() < 0.1 });
        }
      }
    }

    return { main, soft, pts };
  }, []);

  return (
    <div
      className={`wave-bg ${variant} ${fixed ? "fixed" : ""} ${animated ? "animated" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`wb-main-${variant}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--wb-a)" stopOpacity="0" />
            <stop offset="25%" stopColor="var(--wb-a)" stopOpacity="0.55" />
            <stop offset="55%" stopColor="var(--wb-b)" stopOpacity="0.9" />
            <stop offset="85%" stopColor="var(--wb-a)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--wb-a)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`wb-soft-${variant}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--wb-c)" stopOpacity="0" />
            <stop offset="40%" stopColor="var(--wb-c)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--wb-c)" stopOpacity="0" />
          </linearGradient>
          <filter id="wb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        <g className="wb-soft" stroke={`url(#wb-soft-${variant})`} fill="none" strokeWidth="0.7">
          {art.soft.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        <g className="wb-main" stroke={`url(#wb-main-${variant})`} fill="none" strokeWidth="0.8">
          {art.main.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {dots && (
          <g className="wb-dots">
            {art.pts.map((p, i) => (
              <g key={i}>
                {p.glow && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.r * 3}
                    fill="var(--wb-b)"
                    opacity={p.o * 0.6}
                    filter="url(#wb-glow)"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={p.glow ? "var(--wb-dot)" : "var(--wb-a)"}
                  opacity={p.o}
                />
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
