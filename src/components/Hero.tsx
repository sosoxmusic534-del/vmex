import { useMemo } from "react";
import DottedMap from "dotted-map";

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
          {["VMess", "VLESS", "Trojan", "25ms Ping"].map((chip, i) => (
            <span
              key={chip}
              className="hero-anim"
              style={{ "--h": `${1.95 + i * 0.08}s` } as React.CSSProperties}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}