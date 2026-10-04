import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { avatarUrl } from "../../lib/avatar";
import { formatLKR } from "../../lib/format";
import { Ic } from "./icons";
import { I, Toaster } from "./ui";

type Item = { to: string; label: string; icon: ReactNode; end?: boolean };

const svg = (d: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const icHome = svg(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>);
const icLogout = svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>);
const icBell = svg(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>);
const icPlus = svg(<path d="M12 5v14M5 12h14" />);
const icSupport = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8M8 13h5" />
  </svg>
);
const icTickets = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
    <path d="M13 6v2M13 16v2M13 11v2" />
  </svg>
);

const mainNav: Item[] = [
  { to: "/portal", label: "Dashboard", icon: I.grid, end: true },
  { to: "/portal/services", label: "Services", icon: I.box },
  { to: "/portal/configs", label: "Configs", icon: I.sliders },
  { to: "/portal/store", label: "Store", icon: I.store },
  { to: "/portal/invoices", label: "Invoices", icon: I.file },
  { to: "/portal/support", label: "Support", icon: icSupport },
];

const adminNav: Item[] = [
  { to: "/portal/admin", label: "Admin Overview", icon: I.chart, end: true },
  { to: "/portal/admin/xui", label: "X-UI Panel", icon: I.server },
  { to: "/portal/admin/invoices", label: "Approve Invoices", icon: I.card },
  { to: "/portal/admin/users", label: "Users & Services", icon: I.users },
  { to: "/portal/admin/tickets", label: "Tickets", icon: icTickets },
  { to: "/portal/admin/settings", label: "Settings", icon: I.sliders },
];

const staffNav: Item[] = [
  { to: "/portal/staff/tickets", label: "Support Tickets", icon: icTickets },
];

function RailLink({ to, label, icon, end }: Item) {
  return (
    <NavLink
      to={to}
      end={end}
      data-tip={label}
      aria-label={label}
      className={({ isActive }) => `px-rail-btn ${isActive ? "active" : ""}`}
    >
      {icon}
    </NavLink>
  );
}

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "staff";
  const balance = (user as { balance?: number }).balance ?? 0;
  const avatar = avatarUrl(user.email);

  const onLogout = async () => {
    await logout();
    navigate("/portal/login", { replace: true });
  };

  return (
    <div className="px-shell">
      <aside className="px-rail">
        <Link to="/portal" className="px-rail-logo" aria-label="VMEX">
          <img src="/logo.png" alt="" />
        </Link>

        <nav className="px-rail-group">
          {mainNav.map((i) => <RailLink key={i.to} {...i} />)}
        </nav>

        {isAdmin && (
          <nav className="px-rail-group admin">
            {adminNav.map((i) => <RailLink key={i.to} {...i} />)}
          </nav>
        )}

        {(isStaff || isAdmin) && (
          <nav className="px-rail-group staff">
            {staffNav.map((item) => <RailLink key={item.to} {...item} />)}
          </nav>
        )}

        <div className="px-rail-bottom">
          <Link to="/" className="px-rail-round" data-tip="Back to site" aria-label="Back to site">{icHome}</Link>
          <button type="button" onClick={onLogout} className="px-rail-round" data-tip="Log out" aria-label="Log out">
            {icLogout}
          </button>
        </div>
      </aside>

      <div className="px-main">
        <header className="px-top">
          <Link to="/portal/store" className="px-wallet">
            <span className="px-wallet-icon">{Ic.wallet}</span>
            <span>
              <small>Wallet</small>
              <b>{formatLKR(balance)}</b>
            </span>
          </Link>
          <Link to="/portal/store" className="px-pill" aria-label="Top up">{icPlus}</Link>

          <div className="px-top-center">
            <Link to="/portal/services" className="px-pill white" aria-label="Services">{I.box}</Link>
            <Link to="/portal/configs" className="px-pill white" aria-label="Configs">{I.sliders}</Link>
            <Link to="/portal/invoices" className="px-pill white" aria-label="Invoices">{I.file}</Link>
            <Link to="/portal/store" className="px-cta">
              Get a new config {I.arrow}
            </Link>
          </div>

          <button type="button" className="px-pill bell" aria-label="Notifications">
            {icBell}
            <i />
          </button>

          <div className="px-account" ref={menuRef}>
            <button
              type="button"
              className={`px-account-btn ${menuOpen ? "open" : ""}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
            >
              <img src={avatar} alt="" />
              <span className="px-account-text">
                <b>{user.name}</b>
                <small className={user.role}>{isAdmin ? "Administrator" : isStaff ? "Staff" : "Customer"}</small>
              </span>
              <span className="px-account-chev">{Ic.chevron}</span>
            </button>

            {menuOpen && (
              <div className="px-account-menu">
                <div className="px-account-head">
                  <img src={avatar} alt="" />
                  <div>
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                  </div>
                </div>

                <Link to="/portal/store" className="px-account-wallet">
                  <span className="px-coin c1">{Ic.wallet}</span>
                  <span>
                    <small>Wallet balance</small>
                    <b>{formatLKR(balance)}</b>
                  </span>
                </Link>

                <nav className="px-account-links">
                  <Link to="/portal">{Ic.grid} Dashboard</Link>
                  <Link to="/portal/services">{Ic.box} My services</Link>
                  <Link to="/portal/invoices">{Ic.receipt} Invoices</Link>
                  <Link to="/portal/support">{Ic.chat} Support</Link>
                  {isAdmin && <Link to="/portal/admin">{Ic.shield} Admin panel</Link>}
                  <Link to="/">{Ic.home} Back to website</Link>
                </nav>

                <button type="button" className="px-account-logout" onClick={onLogout}>
                  {Ic.logout} Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="px-content">
          <div key={pathname} className="px-page">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
