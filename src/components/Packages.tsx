import { useState } from "react";

type Status = "Available" | "Active";

type Pkg = {
  network: string;
  type: string;
  logo: string;
  plan: string;
  host?: string;
  status: Status;
};

const packages: Pkg[] = [
  { network: "Dialog",  type: "SIM",    logo: "/logos/dialog.jpg",  plan: "TikTok",   status: "Available" },
  { network: "Dialog",  type: "Router", logo: "/logos/dialog.jpg",  plan: "Zoom",     status: "Available" },
  { network: "Hutch",   type: "SIM",    logo: "/logos/hutch.png",   plan: "Social",   status: "Available" },
  { network: "Airtel",  type: "SIM",    logo: "/logos/airtel.png",  plan: "TikTok",   status: "Available" },
  { network: "Airtel",  type: "SIM",    logo: "/logos/airtel.png",  plan: "Zoom",     status: "Available" },
  { network: "SLT",     type: "Fiber",  logo: "/logos/slt.webp",     plan: "Zoom",     status: "Available" },
  { network: "SLT",     type: "Fiber",  logo: "/logos/slt.webp",     plan: "Fast Web", status: "Available" },
  { network: "Mobitel", type: "SIM",    logo: "/logos/mobitel.png", plan: "Zoom",     status: "Active" },
  { network: "Mobitel", type: "SIM",    logo: "/logos/mobitel.png", plan: "WhatsApp", status: "Active" },
];

const routes = [
  { flag: "in", name: "India",     info: "Lowest Latency", ping: "~25ms" },
  { flag: "sg", name: "Singapore", info: "Ultra-Fast 10Gbps", ping: "~38ms" },
];

const bareLogos = ["Hutch", "Airtel"];

function NetLogo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const bare = bareLogos.includes(name);

  return (
    <div className={`pkg-logo ${bare ? "bare" : ""}`}>
      {failed ? (
        <span className="pkg-logo-fallback">{name.charAt(0)}</span>
      ) : (
        <img src={src} alt={`${name} logo`} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export default function Packages() {
  return (
    <section className="packages" id="packages">
      <div className="pkg-grid-bg" />
      <div className="pkg-glow" />

      <div className="packages-inner">
        <span className="pkg-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="2" />
            <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5" />
          </svg>
          FAST • STABLE • RELIABLE
        </span>

        <h2 className="section-title">
          Available Packages &amp; <span>Network Routes</span>
        </h2>
        <p className="pkg-sub">
          Optimized SNI tunneling and protocol routing for all major Sri Lankan networks and
          home connections.
        </p>

        <div className="pkg-cards">
          {packages.map((p, i) => (
            <article key={i} className={`pkg-card ${p.status === "Active" ? "is-active" : ""}`}>
              <div className="pkg-head">
                <NetLogo src={p.logo} name={p.network} />
                <div className="pkg-net">
                  <span className="pkg-net-name">{p.network}</span>
                  <span className="pkg-net-type">{p.type}</span>
                </div>
              </div>

              <div className="pkg-plan">
                <span>{p.plan}</span>
                <i className="pkg-dot" />
              </div>

              {p.host && <code className="pkg-host">{p.host}</code>}

              <span className={`pkg-status ${p.status.toLowerCase()}`}>{p.status}</span>
            </article>
          ))}
        </div>

        <div className="pkg-routes">
          <span className="pkg-routes-label">Available Server Routes</span>
          <div className="pkg-routes-list">
            {routes.map((r) => (
              <div key={r.name} className="route-chip">
                <img src={`https://flagcdn.com/w40/${r.flag}.png`} alt="" className="route-flag" />
                <b>{r.name}</b>
                <span>{r.info}</span>
                <em>{r.ping}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}