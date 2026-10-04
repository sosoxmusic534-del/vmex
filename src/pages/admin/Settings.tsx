import { Link } from "react-router-dom";
import { Empty, I, PageHead } from "../../components/portal/ui";

const cards = [
  {
    key: "xui",
    title: "X-UI Panel",
    text: "Connect your panel, set the API URL, token, subscription URL, and manage inbound automation.",
    to: "/portal/admin/xui",
    icon: I.server,
  },
  {
    key: "network",
    title: "Networks & Packages",
    text: "Edit carrier logos, SNI packages, device routing, and inbound assignments used in checkout.",
    to: "/portal/admin/network",
    icon: I.globe,
  },
  {
    key: "payments",
    title: "Payment Methods",
    text: "Turn payment methods on or off, set instructions, and choose what customers see at checkout.",
    to: "/portal/admin/payments",
    icon: I.wallet,
  },
  {
    key: "users",
    title: "Users & Services",
    text: "Manage customers, services, and account ownership across your VMEX client base.",
    to: "/portal/admin/users",
    icon: I.users,
  },
  {
    key: "tickets",
    title: "Support Tickets",
    text: "Manage customer requests, status updates, priority handling, and admin replies.",
    to: "/portal/admin/tickets",
    icon: I.mail,
  },
  {
    key: "email",
    title: "Email & OTP",
    text: "Resend API email, SMTP fallback, Discord event logging, and login security settings live in the private backend environment file.",
    to: "/portal/admin",
    icon: I.mail,
  },
];

export default function AdminSettings() {
  return (
    <>
      <PageHead
        eyebrow="ADMIN · SETTINGS"
        title="System Settings"
        sub="Portal configuration, email delivery, support flow, and service automation in one place."
      />

      <div className="dash-stack stagger">
        <div className="dash-stats stagger">
          {cards.map((card) => (
            <Link key={card.key} to={card.to} className="dash-card dash-stat" style={{ textDecoration: "none" }}>
              <div className="dash-stat-top">
                <span className="dash-label">{card.title}</span>
                <span className="dash-stat-icon">{card.icon}</span>
              </div>
              <p className="dash-muted" style={{ marginTop: 12, lineHeight: 1.6 }}>{card.text}</p>
              <span className="dash-more" style={{ marginTop: 12, display: "inline-flex" }}>
                Open {I.arrow}
              </span>
            </Link>
          ))}
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <h3 className="dash-h3">{I.info} Email / OTP setup</h3>
          </div>
          <p className="dash-muted">
            Resend is preferred when RESEND_API_KEY is present; otherwise configured SMTP is used. Email and the private Discord webhook URL belong in server/.env, never in the browser.
          </p>
          <div style={{ marginTop: 14 }}>
            <Empty
              icon={I.mail}
              title="Production mail settings"
              text="Set RESEND_API_KEY and MAIL_FROM in server/.env (or configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS as fallback), then restart the backend. Keep DISCORD_WEBHOOK_URL and JWT_SECRET private too."
            />
          </div>
        </div>
      </div>
    </>
  );
}
