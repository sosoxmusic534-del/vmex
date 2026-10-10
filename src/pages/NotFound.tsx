import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function NotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Page not found · VMEX";
  }, []);

  return (
    <section className="nf">
      <div className="nf-glow" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="nf-inner">

        <div className="nf-code" aria-hidden="true">
          <div className="nf-radar"><span /></div>
          <h1 className="nf-404" data-text="404">404</h1>
        </div>

        <h2 className="nf-title">This page went offline</h2>
        <p className="nf-text">
          We couldn't find <code>{pathname}</code> on our network. It may have moved, or the link might be
          mistyped.
        </p>

        <div className="nf-actions">
          <Link to="/" className="nf-btn primary">Back to home</Link>
          <Link to="/portal" className="nf-btn">Client portal</Link>
          <button type="button" className="nf-btn ghost" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    </section>
  );
}
