import type { ReactNode } from "react";

type Feature = { icon: ReactNode; title: string; text: string };

const icon = (path: ReactNode) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const features: Feature[] = [
  {
    icon: icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
    title: "Military-Grade Encryption",
    text: "Your data travels through encrypted V2Ray tunnels, invisible to prying eyes. Modern protocols keep every connection private.",
  },
  {
    icon: icon(<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />),
    title: "Lightning Fast Speeds",
    text: "Optimized servers with latency down to 25ms. Perfect for gaming, streaming, and bandwidth-heavy tasks.",
  },
  {
    icon: icon(
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>,
    ),
    title: "Singapore & India Servers",
    text: "High-speed access points in Singapore and India. Connect to the nearest server for the best performance.",
  },
  {
    icon: icon(
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>,
    ),
    title: "Strict No-Logs Policy",
    text: "We route your traffic, we don't watch it. Zero activity logs mean your browsing history stays yours.",
  },
  {
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 20h20" />
      </>,
    ),
    title: "Multi-Device Support",
    text: "Use VMEX on your phone, laptop, and tablet at the same time. One subscription, all your devices covered.",
  },
  {
    icon: icon(
      <>
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
      </>,
    ),
    title: "24/7 Expert Support",
    text: "Our team is always ready to help. Get assistance via Discord, Telegram, or email anytime.",
  },
];

export default function Features() {
  return (
    <section className="features" id="why">
      <div className="features-lines" aria-hidden="true" />
      <div className="features-glow" aria-hidden="true" />

      <div className="features-inner">
        <p className="section-eyebrow">WHY VMEX</p>
        <h2 className="section-title">
          Built for the <span>modern internet.</span>
        </h2>

        <div className="features-grid">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
