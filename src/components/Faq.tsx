import { useState } from "react";

type Faq = { q: string; a: string };

const faqs: Faq[] = [
  {
    q: "What is V2Ray and how is it different from a normal VPN?",
    a: "V2Ray is a modern tunneling platform that supports protocols like VMess, VLESS and Trojan. It disguises your traffic as normal web traffic, which makes it faster and more stable than traditional VPNs on Sri Lankan networks.",
  },
  {
    q: "Which networks and packages are supported?",
    a: "VMEX works with Dialog, Mobitel, Hutch, Airtel and SLT Fiber, including SIM and router packages such as TikTok, Zoom, WhatsApp and Social. Check the Packages section above for the currently active routes.",
  },
  {
    q: "How fast will I receive my config after ordering?",
    a: "Delivery is automated. Once your payment is confirmed, your config link and QR code appear in your client dashboard, usually within a few minutes.",
  },
  {
    q: "Which devices and apps can I use?",
    a: "Android (v2rayNG), Windows (v2rayN or Clash), and iPhone / iPad (Shadowrocket, FoXray, Streisand or Sing-box). See the How To Connect section for step-by-step setup.",
  },
  {
    q: "Can I use one plan on multiple devices?",
    a: "Yes. You can import the same config on your phone, laptop and tablet. Your data quota is shared across all devices using that config.",
  },
  {
    q: "Is it good for online gaming?",
    a: "Yes. Our India and Singapore routes support UDP with latency as low as ~25ms, which is ideal for PUBG, Free Fire, Valorant and other online games.",
  },
  {
    q: "What happens when my data or 30 days runs out?",
    a: "Your config stops working until you renew. You can renew or upgrade to another plan anytime from your client dashboard, and your new config is delivered instantly.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "We accept bank transfer, eZ Cash and mCash. Contact our support team if you need another payment option.",
  },
  {
    q: "Do you keep logs of my activity?",
    a: "No. VMEX follows a strict no-logs policy. We route your traffic, we don't monitor or store your browsing activity.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="faq" id="faq">
      <div className="faq-bg" aria-hidden="true" />
      <div className="faq-glow" aria-hidden="true" />

      <div className="faq-inner">
        <div className="faq-side">
          <p className="section-eyebrow">FAQ</p>
          <h2 className="section-title">
            Got questions? <span>We've got answers.</span>
          </h2>
          <p className="faq-sub">
            Everything you need to know about VMEX V2Ray plans, setup and support.
          </p>

          <div className="faq-cta">
            <div className="faq-cta-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h4>Still need help?</h4>
              <p>Our support team is online 24/7 on Discord, Telegram and email.</p>
            </div>
            <a
              href="https://discord.gg/9WEcTQ9cvM"
              className="faq-cta-btn"
              target="_blank"
              rel="noreferrer"
            >
              Contact Support
            </a>
          </div>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.q} className={`faq-item ${isOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${index}`}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span className="faq-num">{String(index + 1).padStart(2, "0")}</span>
                  <span className="faq-q-text">{faq.q}</span>
                  <span className="faq-toggle" aria-hidden="true" />
                </button>

                <div className="faq-a-wrap" id={`faq-a-${index}`} role="region">
                  <div className="faq-a">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
