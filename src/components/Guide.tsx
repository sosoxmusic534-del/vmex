import type { ReactNode } from "react";

type GuideCard = {
  icon: ReactNode;
  title: string;
  desc: string;
  steps: ReactNode[];
};

const svg = (children: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const guides: GuideCard[] = [
  {
    icon: svg(
      <>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M11 18h2" />
      </>
    ),
    title: "1. Android (v2rayNG)",
    desc: "The most stable app for Android smartphones and Android TV boxes.",
    steps: [
      <>Download <b>v2rayNG</b> from Google Play Store or GitHub.</>,
      <>Copy your config from your VMEX dashboard.</>,
      <>Open v2rayNG, tap <b>'+'</b> → <b>Import config from Clipboard</b> (or Scan QR Code).</>,
      <>Tap the round <b>'V'</b> button at the bottom right to connect!</>,
    ],
  },
  {
    icon: svg(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 20h20" />
      </>
    ),
    title: "2. Windows PC (v2rayN / Clash)",
    desc: "Ultra-smooth connection for gaming, downloading torrents, and remote work.",
    steps: [
      <>Download &amp; extract <b>v2rayN-with-core</b> on Windows.</>,
      <>Copy your V2Ray config link from your VMEX account.</>,
      <>In the v2rayN window, simply press <kbd>Ctrl</kbd> + <kbd>V</kbd>.</>,
      <>Right-click the system tray icon → <b>System Proxy: Set system proxy</b>. Done!</>,
    ],
  },
  {
    icon: svg(
      <>
        <rect x="7" y="2" width="10" height="20" rx="3" />
        <path d="M11 5h2" />
        <circle cx="12" cy="18" r="1" />
      </>
    ),
    title: "3. iPhone / iOS (Shadowrocket)",
    desc: "Supports Shadowrocket, FoXray, Streisand, or Sing-box on the App Store.",
    steps: [
      <>Install <b>Shadowrocket</b> or <b>FoXray / Streisand</b> from the App Store.</>,
      <>Copy your V2Ray config link or open your QR code on screen.</>,
      <>Tap the QR scanner icon inside the iOS app to auto-import.</>,
      <>Toggle the main switch to <b>Connected</b>. Enjoy unlimited browsing!</>,
    ],
  },
];

export default function Guide() {
  return (
    <section className="guide" id="how-it-works">
      <div className="guide-bg" />
      <div className="guide-glow" />

      <div className="guide-inner">
        <p className="section-eyebrow">EASY TUTORIAL</p>
        <h2 className="section-title">
          How To Connect in <span>3 Simple Steps</span>
        </h2>
        <p className="guide-sub">
          No technical knowledge required. Copy your config link or scan the QR code and connect
          immediately.
        </p>

        <div className="guide-grid">
          {guides.map((g) => (
            <article key={g.title} className="guide-card">
              <div className="guide-icon">{g.icon}</div>
              <h3>{g.title}</h3>
              <p className="guide-desc">{g.desc}</p>

              <ol className="guide-steps">
                {g.steps.map((s, i) => (
                  <li key={i}>
                    <span className="guide-num">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}