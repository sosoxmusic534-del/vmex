import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Link, NavLink } from "react-router-dom";
import AnimatedBackground from "../../components/AnimatedBackground";

const perks = [
  "Instant config delivery after payment",
  "Track your data usage and expiry",
  "Secure login with email codes",
  "24/7 support from the VMEX team",
];

const nodes = [
  { flag: "sg", name: "Singapore", info: "SG1 · SG2 · 10 Gbps", ping: "~38ms" },
  { flag: "in", name: "India", info: "Mumbai · Gaming tuned", ping: "~25ms" },
];

const check = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "form" | "otp";
};

export default function AuthLayout({ title, subtitle, children, footer, variant = "form" }: Props) {
  return (
    <section className="auth2" data-lenis-prevent>
      <AnimatedBackground />

      <aside className="auth2-panel">
        <Link to="/" className="auth-brand">
          <img src="/logo.png" alt="VMEX logo" />
          <span>VM<b>EX</b></span>
        </Link>

        <div className="auth2-hero">
          <span className="auth2-badge"><i /> All servers online</span>
          <h2>
            Your gateway to <span>fast, secure</span> internet.
          </h2>
          <p>Manage your plans, grab your configs and track usage — all in one place.</p>

          <div className="auth2-nodes">
            {nodes.map((n, i) => (
              <div key={n.name} className="auth2-node" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
                <img src={`https://flagcdn.com/w80/${n.flag}.png`} alt="" />
                <div>
                  <b>{n.name}</b>
                  <small>{n.info}</small>
                </div>
                <span className="auth2-ping"><i /> {n.ping}</span>
              </div>
            ))}
          </div>

          <ul className="auth2-perks">
            {perks.map((p) => (
              <li key={p}><span className="auth-check">{check}</span>{p}</li>
            ))}
          </ul>
        </div>

        <div className="auth2-foot">
          <span>© {new Date().getFullYear()} VMEX Solutions</span>
          <nav>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refunds</Link>
          </nav>
        </div>
      </aside>

      <div className="auth2-main">
        <Link to="/" className="auth-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to website
        </Link>

        <div className={`auth2-card ${variant}`}>
          <Link to="/" className="auth-brand auth-brand-mobile">
            <img src="/logo.png" alt="VMEX logo" />
            <span>VM<b>EX</b></span>
          </Link>

          {variant === "form" && (
            <div className="auth2-tabs">
              <span className="auth2-tab-glow" />
              <NavLink to="/portal/login" className={({ isActive }) => (isActive ? "active" : "")}>Log in</NavLink>
              <NavLink to="/portal/register" className={({ isActive }) => (isActive ? "active" : "")}>Sign up</NavLink>
            </div>
          )}

          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>

          {children}

          {footer && <div className="auth-foot">{footer}</div>}
        </div>

        <p className="auth2-secure">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
          </svg>
          Protected with encrypted sessions & email verification
        </p>
      </div>
    </section>
  );
}

/* ---------- Form pieces (unchanged API) ---------- */

export function Field({
  label,
  icon,
  ...props
}: { label: string; icon: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <span className="auth-input">
        <span className="auth-input-icon">{icon}</span>
        <input {...props} />
      </span>
    </label>
  );
}

export function PasswordField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <label className="auth-field">
      <span className="auth-label">{label}</span>
      <span className="auth-input">
        <span className="auth-input-icon">{icons.lock}</span>
        <input {...props} type={show ? "text" : "password"} />
        <button type="button" className="auth-eye" onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}>
          {show ? icons.eyeOff : icons.eye}
        </button>
      </span>
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="auth-error" role="alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      {message}
    </div>
  );
}

const svg = (d: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export const icons = {
  user: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>),
  mail: svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></>),
  lock: svg(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  eye: svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: svg(<><path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22" /><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" /></>),
};