import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type NavLink = { label: string; to: string };

const links: NavLink[] = [
  { label: "Features", to: "/#why" },
  { label: "About Us", to: "/about" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Pricing", to: "/#pricing" },
  { label: "FAQ", to: "/#faq" },
];

const policies: NavLink[] = [
  { label: "Terms of Service", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Refund Policy", to: "/refund" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPolicyOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPolicyOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const closeAll = () => {
    setMobileOpen(false);
    setPolicyOpen(false);
  };

  return (
    <header className={`nav-wrap ${scrolled ? "is-scrolled" : ""}`}>
      <nav className="nav" aria-label="Main navigation">
        <Link to="/" className="nav-brand" onClick={closeAll}>
          <img src="/logo.png" alt="VMEX logo" className="nav-logo" />
          <span className="nav-name">
            VM<span className="nav-name-accent">EX</span>
          </span>
        </Link>

        <ul className="nav-links">
          {links.map((l) => (
            <li key={l.label}>
              <Link to={l.to} className="nav-link">{l.label}</Link>
            </li>
          ))}

          <li className="nav-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="nav-link nav-dropdown-btn"
              aria-expanded={policyOpen}
              aria-haspopup="true"
              onClick={() => setPolicyOpen((o) => !o)}
            >
              Policies
              <svg className={`chev ${policyOpen ? "up" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {policyOpen && (
              <div className="nav-menu" role="menu">
                {policies.map((p) => (
                  <Link key={p.label} to={p.to} className="nav-menu-item" role="menuitem" onClick={closeAll}>
                    {p.label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        </ul>

        <div className="nav-actions">
          <Link to="/portal" className="nav-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Client Portal
          </Link>

          <button
            type="button"
            className={`nav-burger ${mobileOpen ? "open" : ""}`}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="nav-mobile">
          {links.map((l) => (
            <Link key={l.label} to={l.to} className="nav-mobile-link" onClick={closeAll}>
              {l.label}
            </Link>
          ))}
          <p className="nav-mobile-label">Policies</p>
          {policies.map((p) => (
            <Link key={p.label} to={p.to} className="nav-mobile-link sub" onClick={closeAll}>
              {p.label}
            </Link>
          ))}
          <Link to="/portal" className="nav-cta full" onClick={closeAll}>
            Client Portal
          </Link>
        </div>
      )}
    </header>
  );
}