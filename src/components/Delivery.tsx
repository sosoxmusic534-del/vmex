import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ---------- Small icons ---------- */
const svg = (d: ReactNode, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ic = {
  check: svg(<path d="M20 6L9 17l-5-5" />),
  arrow: svg(<path d="M5 12h14M13 5l7 7-7 7" />),
  copy: svg(<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  eye: svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>),
  bank: svg(<path d="M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10M2 10l10-6 10 6z" />, 16),
  wallet: svg(<><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></>, 16),
  server: svg(<><rect x="2" y="3" width="20" height="8" rx="2" /><rect x="2" y="13" width="20" height="8" rx="2" /></>),
  clock: svg(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>),
  shield: svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  refresh: svg(<><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" /></>),
  link: svg(<><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>),
  done: svg(<><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></>, 26),
};

/* Fake cursor that glides in and clicks */
const FakeCursor = () => (
  <span className="dl-cursor" aria-hidden="true">
    <i className="dl-click" />
    <svg width="22" height="22" viewBox="0 0 28 28">
      <path d="M4 3.5 L24 11.5 L13.5 14.5 L10.5 24.5 Z" fill="#fff" stroke="#0a1f4d" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  </span>
);

/* ---------- Mock cards ---------- */
function PlanCard() {
  return (
    <div className="dl-card dl-plan" style={{ "--x": "80%", "--y": "90%" } as CSSProperties}>
      <div className="dl-plan-banner">
        <img src="/logo.png" alt="" className="dl-banner-logo" />
        <span className="dl-live"><i /> ACTIVE</span>
      </div>
      <div className="dl-plan-body">
        <div className="dl-plan-top">
          <div className="dl-plan-logo"><img src="/logo.png" alt="" /></div>
          <span className="dl-pill">Popular</span>
        </div>
        <small className="dl-kicker">DIALOG</small>
        <h4>DIALOG ZOOM — 200 GB</h4>
        <div className="dl-rows">
          <div><span>{ic.server} Server</span><b>SG · IN</b></div>
          <div><span>{ic.clock} Validity</span><b>30 Days</b></div>
          <div><span>{ic.shield} Protocol</span><b>VLESS · Reality</b></div>
        </div>
        <div className="dl-chips">
          <span>{ic.check} Low Ping UDP</span>
          <span>{ic.check} Renewable</span>
          <span>{ic.check} Multi-Device</span>
        </div>
      </div>
      <div className="dl-plan-foot">
        <div><small>FROM</small><b>LKR 300</b></div>
        <span className="dl-btn white dl-press">Buy Now {ic.arrow}</span>
      </div>
      <FakeCursor />
    </div>
  );
}

function PayCard() {
  return (
    <div className="dl-card dl-pay" style={{ "--x": "76%", "--y": "88%" } as CSSProperties}>
      <header><b>Complete Payment</b><span>×</span></header>
      <div className="dl-pay-sum">
        <div><span>Dialog Zoom · Router</span><em>200 GB</em></div>
        <div className="dl-total"><b>Total</b><b>300 LKR</b></div>
      </div>
      <div className="dl-methods">
        <div className="dl-method">{ic.bank}<span>Bank Transfer</span><code>Manual</code></div>
        <div className="dl-method on">{ic.wallet}<span>Wallet Balance</span><code>Instant</code></div>
      </div>
      <div className="dl-pay-foot">
        <span className="dl-btn ghost">Back</span>
        <span className="dl-btn white dl-press">Check Out {ic.arrow}</span>
      </div>
      <FakeCursor />
    </div>
  );
}

function OrderCard() {
  return (
    <div className="dl-card dl-order" style={{ "--x": "34%", "--y": "84%" } as CSSProperties}>
      <span className="dl-order-icon">{ic.done}</span>
      <small className="dl-order-label">ORDER PLACED</small>
      <h4>DIALOG ZOOM (Router) — 200 GB</h4>
      <div className="dl-order-no">
        <small>ORDER NUMBER</small><b>#VMX-482913</b>{ic.copy}
      </div>
      <div className="dl-order-btns">
        <span className="dl-btn white dl-press">View order {ic.arrow}</span>
        <span className="dl-btn ghost">Continue browsing</span>
      </div>
      <FakeCursor />
    </div>
  );
}

function UsageCard() {
  const pct = 12;
  return (
    <div className="dl-card dl-usage" style={{ "--x": "40%", "--y": "28%", "--pct": pct } as CSSProperties}>
      <div className="dl-usage-head">
        <div>
          <small>ORDER NUMBER — <b>#VMX-482913</b></small>
          <h4>DIALOG ZOOM — 200 GB</h4>
        </div>
        <span className="dl-status"><i /> COMPLETED</span>
      </div>

      <div className="dl-copy dl-press">
        <span>{ic.copy} Copy Config</span>{ic.eye}
      </div>

      <div className="dl-usage-box">
        <div className="dl-usage-top">
          <small>V2RAY USAGE</small>
          <small>Last updated · now</small>
        </div>
        <div className="dl-usage-main">
          <div className="dl-ring">
            <svg viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="36" className="dl-ring-bg" />
              <circle cx="45" cy="45" r="36" className="dl-ring-fill" />
            </svg>
            <div><b>{pct}%</b><small>USED</small></div>
          </div>
          <div className="dl-usage-list">
            <div><span><i className="w" /> Total used</span><b>24.0 / 200 GB</b></div>
            <div><span><i className="b" /> Download</span><b>18.2 GB</b></div>
            <div><span><i className="g" /> Upload</span><b>5.8 GB</b></div>
            <div className="dl-exp"><span>Expires</span><b>27 days</b></div>
          </div>
        </div>
        <div className="dl-usage-btns">
          <span className="dl-btn ghost">{ic.refresh} Refresh usage</span>
          <span className="dl-btn ghost">{ic.link} Copy Config Link</span>
        </div>
      </div>
      <FakeCursor />
    </div>
  );
}

/* ---------- Steps ---------- */
const steps = [
  {
    n: "01",
    tag: "Browse",
    title: "Pick your plan.",
    text: "Choose your network, device and package — real prices, ready to activate.",
    card: <PlanCard />,
  },
  {
    n: "02",
    tag: "Pay",
    title: "Pay how you like.",
    text: "Bank transfer, eZ Cash or your wallet balance — all in one checkout.",
    card: <PayCard />,
  },
  {
    n: "03",
    tag: "Confirm",
    title: "Order placed.",
    text: "Balance orders activate instantly. Bank and eZ Cash payments are approved by our team.",
    card: <OrderCard />,
  },
  {
    n: "04",
    tag: "Delivered",
    title: "In your account.",
    text: "Configs, live usage and expiry — everything in one card in your client portal.",
    card: <UsageCard />,
  },
];

export default function Delivery() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const progress = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
      setStep(Math.min(steps.length - 1, Math.floor(progress * steps.length)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      ref={ref}
      className="delivery"
      id="delivery"
      style={{ "--steps": steps.length } as CSSProperties}
    >
      <div className="dl-sticky">
        <div className="dl-bg" />

        <div className="dl-top">
          <span className="dl-badge"><i /> HOW VMEX DELIVERS</span>
          <span className="dl-top-sub">V2RAY ORDER</span>
        </div>

        <div className="dl-stage">
          {steps.map((s, i) => (
            <div key={s.n} className={`dl-step ${i % 2 ? "flip" : ""} ${i === step ? "active" : ""}`}>
              <div className="dl-text">
                <span className="dl-num" aria-hidden="true">{s.n}</span>
                <p className="dl-label">{s.n} <i /> {s.tag.toUpperCase()}</p>
                <h3>{s.title}</h3>
                <p className="dl-desc">{s.text}</p>
              </div>
              <div className="dl-visual">{s.card}</div>
            </div>
          ))}
        </div>

        <div className="dl-progress" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.n} className={i <= step ? "on" : ""}>
              <small>{s.tag}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
