import { useMemo } from "react";
import DottedMap from "dotted-map";

const ChipIcon = {
  vmess: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  vless: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  trojan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  ping: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 20v-3M10 20v-7M15 20v-11M20 20V5" />
    </svg>
  ),
};

export default function Hero() {
  const mapSrc = useMemo(() => {
    const map = new DottedMap({ height: 70, grid: "diagonal" });
    const svg = map.getSVG({
      radius: 0.32,
      color: "#2f6bff",
      shape: "hexagon",
      backgroundColor: "transparent",
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  return (
    <section className="hero" id="features">
      {/* Background layers */}
      <div className="hero-bg" />
      <div className="hero-glow" />

      <div className="hero-map">
        <img src={mapSrc} alt="" className="hero-map-img" draggable={false} />
      </div>

      <div className="hero-scanlines" />
      <div className="hero-vignette" />

      {/* Content */}
      <div className="hero-content">
        <span className="hero-badge hero-anim" style={{ "--h": "0.15s" } as React.CSSProperties}>
          <span className="badge-dot" />
          Servers live in Singapore &amp; India
        </span>

        <h1 className="hero-title">
          <span className="hero-title-top">
            {"The Future of Internet".split(" ").map((word, w, words) => (
              <span key={w} className="word">
                {word.split("").map((c, i) => {
                  const index = words.slice(0, w).join("").length + w + i;
                  return (
                    <span key={i} className="char" style={{ "--i": index } as React.CSSProperties}>
                      {c}
                    </span>
                  );
                })}
                {w < words.length - 1 && " "}
              </span>
            ))}
          </span>

          <span className="glitch-wrap">
            <span className="glitch" data-text="VMEX V2Ray">
              VMEX V2Ray
            </span>
          </span>
        </h1>

        <p className="hero-sub hero-anim" style={{ "--h": "1.55s" } as React.CSSProperties}>
          Enjoy ultra-low latency down to <strong>25ms</strong>, rock-solid stability, and
          optimized network tunneling for gaming, streaming, and daily browsing. High-speed
          encrypted V2Ray and Trojan protocols.
        </p>

        <div className="hero-actions hero-anim" style={{ "--h": "1.75s" } as React.CSSProperties}>
          <a href="#pricing" className="btn-primary">Get Started</a>
          <a href="#why" className="btn-ghost">Features</a>
        </div>

        <div className="hero-chips">
          <span className="hero-anim hero-chip" style={{ "--h": "1.95s" } as React.CSSProperties}>
            <span className="hero-chip-icon">{ChipIcon.vmess}</span>VMess
          </span>
          <span className="hero-anim hero-chip" style={{ "--h": "2.03s" } as React.CSSProperties}>
            <span className="hero-chip-icon">{ChipIcon.vless}</span>VLESS
          </span>
          <span className="hero-anim hero-chip" style={{ "--h": "2.11s" } as React.CSSProperties}>
            <span className="hero-chip-icon">{ChipIcon.trojan}</span>Trojan
          </span>
          <span className="hero-anim hero-chip hero-chip-ping" style={{ "--h": "2.19s" } as React.CSSProperties}>
            <span className="hero-chip-icon">{ChipIcon.ping}</span>25ms Ping
          </span>
        </div>
      </div>
    </section>
  );
}