export default function Cta() {
  return (
    <section className="cta" id="get-started">
      <div className="cta-grid" />

      <div className="cta-card">
        <div className="cta-card-glow" />

        <h2 className="cta-title">
          Ready to experience
          <span>true connectivity?</span>
        </h2>

        <p className="cta-text">
          Join thousands of users who trust VMEX for fast, secure, and private internet access.
          Get started in minutes.
        </p>

        <div className="cta-actions">
          <a href="#pricing" className="cta-btn">
            Start Your Journey
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </a>
          <a href="#how-it-works" className="cta-link">See how it works</a>
        </div>

        <div className="cta-meta">
          <span><i /> Instant delivery</span>
          <span><i /> India &amp; Singapore routes</span>
          <span><i /> 24/7 support</span>
        </div>
      </div>
    </section>
  );
}
