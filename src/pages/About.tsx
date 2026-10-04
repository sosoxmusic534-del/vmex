import { Link } from "react-router-dom";

const audiences = ["Individuals", "Remote Professionals", "Students", "Competitive Gamers"];

const nodes = [
  {
    flag: "sg",
    region: "Singapore",
    title: "Tier-3 Singapore Nodes",
    tag: "SG1 & SG2",
    text: "Direct 10 Gbps uplinks with direct peering routes to South Asian ISPs, offering sub-38ms ping times and optimized packet delivery.",
    stats: [
      { value: "10 Gbps", label: "Uplink" },
      { value: "<38ms", label: "Ping" },
    ],
  },
  {
    flag: "in",
    region: "India",
    title: "Ultra-Low Latency India Node",
    tag: "Mumbai",
    text: "Positioned directly in Mumbai with ultra-low latency specifically tuned for competitive online gaming and real-time voice communications.",
    stats: [
      { value: "~25ms", label: "Ping" },
      { value: "Gaming", label: "Tuned for" },
    ],
  },
];

const protocols = [
  {
    name: "VLESS with XTLS Reality",
    text: "Eliminates certificate fingerprinting by blending traffic with standard TLS handshakes to authoritative websites.",
  },
  {
    name: "Trojan Protocol",
    text: "Encapsulates data packets within standard HTTPS over port 443, making traffic indistinguishable from typical web browsing.",
  },
  {
    name: "Full IPv4 & IPv6 Compatibility",
    text: "Seamless multi-platform integration across all major devices and routers.",
    tags: ["Android · v2rayNG", "iOS · Shadowrocket", "Windows/Mac · v2rayN, Nekoray", "OpenWRT Routers"],
  },
];

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function About() {
  return (
    <section className="about">
      <div className="legal-bg" />

      <div className="about-inner">
        {/* Header */}
        <header className="about-head">
          <nav className="legal-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            <span>About Us</span>
          </nav>

          <span className="legal-pill">Company Profile</span>
          <h1 className="legal-title">
            About <span>VMEX Solutions</span>
          </h1>
          <p className="about-tagline">
            Engineering secure, low-latency, and high-performance network proxy technology.
          </p>
          <p className="about-intro">
            VMEX Solutions (operating via{" "}
            <a href="https://www.vmex.net/" target="_blank" rel="noreferrer">https://www.vmex.net/</a>)
            is an independent technology initiative dedicated to providing modern, encrypted, and
            ultra-high-speed network routing configurations. Founded by <strong>Thikshana</strong>,
            VMEX was built to bridge the gap between network stability, advanced privacy protocols,
            and low-latency digital freedom.
          </p>
        </header>

        {/* Mission */}
        <div className="about-block about-mission">
          <div className="about-block-head">
            <span className="about-icon">
              <Icon d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />
            </span>
            <h2>Our Mission</h2>
          </div>

          <blockquote className="about-quote">
            Empowering people with reliable, privacy-respecting network tunneling.
          </blockquote>

          <p>
            Our mission is to empower individuals, remote professionals, students, and competitive
            gamers with reliable, privacy-respecting network tunneling. In an era where online
            surveillance and network instability degrade digital workflows, VMEX provides
            cutting-edge encryption protocols that safeguard data integrity while maintaining peak
            network throughput.
          </p>

          <div className="about-chips">
            {audiences.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        </div>

        {/* Network */}
        <div className="about-section-title">
          <p className="section-eyebrow">INFRASTRUCTURE</p>
          <h2 className="section-title">
            Our Network <span>Architecture</span>
          </h2>
        </div>

        <div className="node-grid">
          {nodes.map((n) => (
            <article key={n.title} className="about-block node-card">
              <div className="node-top">
                <img src={`https://flagcdn.com/w80/${n.flag}.png`} alt={n.region} className="node-flag" />
                <span className="node-tag">
                  <i /> {n.tag}
                </span>
              </div>
              <h3>{n.title}</h3>
              <p>{n.text}</p>
              <div className="node-stats">
                {n.stats.map((s) => (
                  <div key={s.label}>
                    <b>{s.value}</b>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Protocols */}
        <div className="about-section-title">
          <p className="section-eyebrow">TECHNOLOGY</p>
          <h2 className="section-title">
            Cutting-Edge <span>Protocols Supported</span>
          </h2>
        </div>

        <div className="proto-grid">
          {protocols.map((p, i) => (
            <article key={p.name} className="about-block proto-card">
              <span className="proto-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{p.name}</h3>
              <p>{p.text}</p>
              {p.tags && (
                <div className="proto-tags">
                  {p.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Ethics */}
        <div className="about-block about-ethics">
          <span className="about-icon ethics">
            <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />
          </span>
          <div>
            <h2>Commitment to Digital Ethics</h2>
            <p>
              VMEX Solutions strictly adheres to ethical network operations. We do not support,
              facilitate, or tolerate malicious activities, hacking, or copyright infringement. Our
              platform is designed solely for legitimate privacy enhancement, data security, and
              network performance optimization.
            </p>
            <Link to="/terms" className="about-link">Read our Terms &amp; Conditions →</Link>
          </div>
        </div>

        {/* Contact */}
        <div className="about-block about-contact">
          <div>
            <h2>Have questions about our technology?</h2>
            <p>Our engineering team is always ready to assist.</p>
          </div>
          <a href="mailto:thikshanadhananjaya565@gmail.com" className="cta-btn">
            Contact the Team
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}