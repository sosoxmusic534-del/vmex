import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const icon = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const socials = [
  { label: "Discord", url: "https://discord.gg/9WEcTQ9cvM", icon: icon(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />) },
  { label: "Telegram", url: "https://t.me/vmexv2ray", icon: icon(<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />) },
  { label: "Email", url: "mailto:vmexofficial@gmail.com", icon: icon(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></>) },
];

const columns = [
  {
    title: "Services",
    links: [
      { label: "V2Ray Plans", href: "/#pricing" },
      { label: "Network Packages", href: "/#packages" },
      { label: "India & Singapore Servers", href: "/#packages" },
      { label: "Gaming Routes", href: "/#packages" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Setup Guides", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
      { label: "About Us", href: "/about" },
      { label: "Client Portal", href: "https://www.vmex.net/portal" },
      { label: "Server Status", href: "https://status.vmex.net" },
      { label: "Contact Us", href: "#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Refund Policy", href: "/refund" },
      { label: "Fair Use Policy", href: "/fair-use" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-line" />

      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src="/logo.png" alt="VMEX logo" />
              <div>
                <span className="footer-name">VM<b>EX</b></span>
                <span className="footer-tag">V2Ray servers for Sri Lanka</span>
              </div>
            </Link>

            <p className="footer-desc">
              Fast, stable and secure V2Ray connectivity for gaming, streaming and private
              browsing. Experience the internet without limits.
            </p>

            <div className="footer-socials">
              {socials.map((s) => (
                <a key={s.label} href={s.url} className="footer-social" target="_blank" rel="noreferrer">
                  {s.icon}
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") || l.href.startsWith("#") ? (
                      <Link to={l.href}>{l.label}</Link>
                    ) : (
                      <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} VMEX. All rights reserved.</p>

          <div className="footer-bottom-right">
            <span className="footer-status">
              <i /> All systems operational
            </span>
            <span className="footer-loc">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Sri Lanka
            </span>
          </div>
        </div>
      </div>

      <div className="footer-big" aria-hidden="true">VMEX</div>
    </footer>
  );
}
