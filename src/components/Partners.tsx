import { useState } from "react";
import { Link } from "react-router-dom";

type Partner = { name: string; logo: string };

const partners: Partner[] = [
  { name: "DigitalOcean", logo: "/partners/digitalocean.webp" },
  { name: "Linode", logo: "/partners/linode.webp" },
  { name: "Leaseweb", logo: "/partners/leaseweb.webp" },
];

const arrow = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

function PartnerLogo({ partner }: { partner: Partner }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="partner" title={partner.name}>
      {failed ? (
        <span className="partner-name">{partner.name}</span>
      ) : (
        <img src={partner.logo} alt={partner.name} loading="lazy" draggable={false} onError={() => setFailed(true)} />
      )}
    </div>
  );
}

export default function Partners() {
  return (
    <section className="infra">
      <div className="infra-inner">
        <div className="infra-card infra-guides">
          <div className="infra-tile">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="M10 9l5 3-5 3z" fill="currentColor" />
            </svg>
          </div>

          <div className="infra-guides-text">
            <p className="infra-eyebrow">GUIDES <i>·</i> APPS <i>·</i> DOWNLOADS <span /></p>
            <h3>Everything you need to get connected.</h3>
            <p className="infra-desc">
              Step-by-step setup guides plus recommended clients for Android, Windows, macOS and iOS —
              all in one place.
            </p>
          </div>

          <Link to="/#how-it-works" className="infra-btn">
            View Guides {arrow}
          </Link>
        </div>

        <div className="infra-card infra-stack">
          <span className="infra-watermark" aria-hidden="true">V2RAY</span>

          <div className="infra-stack-top">
            <div>
              <p className="infra-eyebrow">INFRASTRUCTURE <span /> PREMIUM SERVERS</p>
              <h3 className="infra-big">Built on world-class networks.</h3>
              <p className="infra-desc">
                Our Singapore and India nodes run on top-tier providers with 10 Gbps uplinks —
                low ping, high uptime, zero compromises.
              </p>
            </div>

            <Link to="/#pricing" className="infra-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="8" rx="2" />
                <rect x="2" y="13" width="20" height="8" rx="2" />
                <path d="M6 7h.01M6 17h.01" />
              </svg>
              Explore Plans {arrow}
            </Link>
          </div>

          <div className="infra-partners">
            <p className="infra-eyebrow">POWERED BY <b>INDUSTRY LEADERS</b> <span /></p>

            <div className="partners-marquee">
              <div className="partners-track">
                {[0, 1].map((copy) => (
                  <div key={copy} className="partners-group" aria-hidden={copy === 1}>
                    {partners.map((p) => (
                      <PartnerLogo key={`${copy}-${p.name}`} partner={p} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
