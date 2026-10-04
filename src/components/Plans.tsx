type Plan = {
  protocols: string;
  name: string;
  desc: string;
  price: number;
  data: string;
  features: string[];
  popular?: boolean;
  orderLink: string;
};

const plans: Plan[] = [
  {
    protocols: "VLESS / VMess",
    name: "200GB Monthly Plan",
    desc: "Ultra-fast V2Ray configuration with 200GB high-speed quota.",
    price: 300,
    data: "200 GB High Speed Data",
    features: [
      "200 GB High Speed Data",
      "30 Days Validity",
      "India & Singapore Routes",
      "Supports Dialog, Mobitel Router, Hutch, Airtel, Fiber",
      "Low Ping UDP for Online Gaming",
      "Works on Android / Windows / iOS",
    ],
    orderLink: "#order-200gb",
  },
  {
    protocols: "VLESS / VMess / Trojan",
    name: "Unlimited Monthly Plan",
    desc: "Zero data limits! High-speed downloading, 4K streaming & gaming.",
    price: 600,
    data: "Unlimited Data Bandwidth",
    features: [
      "Unlimited High Speed Bandwidth",
      "30 Days Validity",
      "India & Singapore Routes",
      "Fast • Stable • Reliable",
      "High-Speed Bandwidth & Low Latency Optimization",
      "Instant Dashboard & Automated Delivery",
    ],
    popular: true,
    orderLink: "#order-unlimited",
  },
  {
    protocols: "VLESS / VMess",
    name: "100GB Monthly Plan",
    desc: "Fast • Stable • Reliable V2Ray server config.",
    price: 120,
    data: "100 GB High Speed Data",
    features: [
      "High Speed Bandwidth",
      "30 Days Validity",
      "India & Singapore Routes",
      "UDP Gaming Support",
    ],
    orderLink: "#order-100gb",
  },
];

const Flags = () => (
  <span className="plan-flags" aria-label="Available in India and Singapore">
    <img src="https://flagcdn.com/w40/in.png" alt="India" />
    <img src="https://flagcdn.com/w40/sg.png" alt="Singapore" />
  </span>
);

const Check = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function Plans() {
  return (
    <section className="plans" id="pricing">
      <div className="plans-lines" aria-hidden="true" />
      <div className="plans-glow" aria-hidden="true" />

      <div className="plans-inner">
        <p className="section-eyebrow">PRICING</p>
        <h2 className="section-title">
          Simple plans, <span>serious speed.</span>
        </h2>
        <p className="plans-sub">
          Pick a plan, pay once, and get your config delivered instantly. No hidden fees.
        </p>

        <div className="plans-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={`plan-card ${plan.popular ? "popular" : ""}`}>
              {plan.popular && <span className="plan-badge">MOST POPULAR</span>}

              <div className="plan-top">
                <span className="plan-proto">{plan.protocols}</span>
                <Flags />
              </div>

              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-desc">{plan.desc}</p>

              <div className="plan-price">
                <span className="plan-cur">LKR</span>
                <span className="plan-amount">{plan.price}</span>
                <span className="plan-period">/ 30 days</span>
              </div>

              <div className="plan-data">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {plan.data}
              </div>

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="plan-check"><Check /></span>
                    {feature}
                  </li>
                ))}
              </ul>

              <a href={plan.orderLink} className="plan-btn">
                Order Now
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
