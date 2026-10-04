import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

/* ---------- Icons ---------- */
const svg = (d: ReactNode, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

export const I = {
  grid: svg(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  box: svg(<><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></>),
  sliders: svg(<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />),
  store: svg(<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />),
  file: svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>),
  card: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  book: svg(<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM20 17v5H6.5A2.5 2.5 0 0 1 4 19.5" />),
  mail: svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></>),
  pulse: svg(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />),
  server: svg(<><rect x="2" y="3" width="20" height="8" rx="2" /><rect x="2" y="13" width="20" height="8" rx="2" /><path d="M6 7h.01M6 17h.01" /></>),
  users: svg(<><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9" /></>),
  chart: svg(<path d="M3 3v18h18M7 15l4-4 3 3 5-6" />),
  arrow: svg(<path d="M5 12h14M13 5l7 7-7 7" />, 15),
  back: svg(<path d="M19 12H5M12 19l-7-7 7-7" />),
  copy: svg(<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  check: svg(<path d="M20 6L9 17l-5-5" />),
  x: svg(<path d="M18 6L6 18M6 6l12 12" />),
  trash: svg(<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />),
  logout: svg(<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />),
  menu: svg(<path d="M3 6h18M3 12h18M3 18h18" />),
  refresh: svg(<><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" /></>),
  zap: svg(<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />),
  plug: svg(<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z" />),
  info: svg(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>),
  wallet: svg(<><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></>),
  status: svg(<><path d="M22 12h-4l-3 9L9 3l-3 9H2" /><circle cx="12" cy="12" r="0.5" /></>),
  external: svg(<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14L21 3" /></>, 14),
  chevron: svg(<path d="M6 9l6 6 6-6" />, 16),
  bank: svg(<path d="M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10M2 10l10-6 10 6z" />),
  phone: svg(<><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></>),
  wifi: svg(<><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0" /><circle cx="12" cy="19.5" r="1" /></>),
  sim: svg(<><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><rect x="8.5" y="10.5" width="7" height="7" rx="1" /><path d="M12 10.5v7M8.5 14h7" /></>),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  link: svg(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>, 14),
  warn: svg(<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />, 16),
  globe: svg(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>),
  upload: svg(<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />),
  ticket: svg(<><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" /><path d="M13 5v2M13 11v2M13 17v2" /></>),
  send: svg(<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />),
  eye: svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  headset: svg(<><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" /></>),
};

/* ---------- Helpers ---------- */
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/* ---------- Count-up numbers ---------- */
export function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const v = useCountUp(value);
  return <>{format ? format(v) : Math.round(v).toLocaleString()}</>;
}

/* ---------- Stat card ---------- */
export function StatCard({
  label, value, format, icon, to, linkLabel,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon?: ReactNode;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="dash-card dash-stat">
      <div className="dash-stat-top">
        <span className="dash-label">{label}</span>
        {icon && <span className="dash-stat-icon">{icon}</span>}
      </div>
      <b className="dash-stat-value">
        <CountUp value={value} format={format} />
      </b>
      {to && (
        <Link to={to} className="dash-more">
          {linkLabel} {I.arrow}
        </Link>
      )}
    </div>
  );
}

/* ---------- Animated progress ---------- */
export function Progress({ value, small }: { value: number; small?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  const tone = value >= 90 ? "danger" : value >= 75 ? "warn" : "";
  return (
    <div className={`dash-progress ${tone} ${small ? "sm" : ""}`}>
      <span style={{ width: `${w}%` }} />
    </div>
  );
}

/* ---------- Badges ---------- */
const badgeText: Record<string, string> = {
  active: "Active", expired: "Expired", limited: "Quota reached", disabled: "Disabled",
  pending: "Pending", paid: "Paid", cancelled: "Cancelled", rejected: "Rejected",
  open: "Open", answered: "Answered", closed: "Closed",
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`badge ${status}`}>{badgeText[status] ?? status}</span>
);

/* ---------- Layout pieces ---------- */
export function PageHead({
  eyebrow, title, sub, actions,
}: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <p className="page-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Empty({
  icon, title, text, action,
}: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="dash-empty">
      <span className="dash-empty-icon">{icon}</span>
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`}>
      {I.info}
      <div>{children}</div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Notice tone="error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="dash-btn sm" style={{ marginTop: 10 }} onClick={onRetry}>
          {I.refresh} Try again
        </button>
      )}
    </Notice>
  );
}

export function Skeleton({ height = 120, style }: { height?: number; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, ...style }} />;
}

export function PageSkeleton() {
  return (
    <div className="dash-stack">
      <Skeleton height={70} />
      <div className="dash-stats">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={150} />)}
      </div>
      <Skeleton height={220} />
    </div>
  );
}

export const Spinner = () => <span className="spinner small" />;

/* ---------- Toasts ---------- */
type Toast = { id: number; msg: string; type: "success" | "error" };

export function toast(msg: string, type: Toast["type"] = "success") {
  window.dispatchEvent(new CustomEvent("vmex-toast", { detail: { msg, type } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { msg, type } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((list) => [...list, { id, msg, type }]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener("vmex-toast", on);
    return () => window.removeEventListener("vmex-toast", on);
  }, []);

  return (
    <div className="toasts" role="status">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" ? I.check : I.x}
          {t.msg}
        </div>
      ))}
    </div>
  );
}