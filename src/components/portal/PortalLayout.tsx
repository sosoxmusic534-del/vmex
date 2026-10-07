import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { formatLKR } from "../../lib/format";
import UserAvatar from "./UserAvatar";
import { I, Toaster } from "./ui";

const STATUS_URL = "https://status.vmex.net";

type Item = { to: string; label: string; icon: ReactNode; end?: boolean; hideSm?: boolean };
type Panel = "admin" | "settings" | null;

const mainNav: Item[] = [
  { to: "/portal", label: "Dashboard", icon: I.grid, end: true },
  { to: "/portal/store", label: "Plans", icon: I.store },
  { to: "/portal/services", label: "Services", icon: I.box },
  { to: "/portal/configs", label: "Configs", icon: I.sliders },
  { to: "/portal/invoices", label: "Invoices", icon: I.file, hideSm: true },
  { to: "/portal/support", label: "Support", icon: I.ticket, hideSm: true },
];

const adminNav: Item[] = [
  { to: "/portal/admin", label: "Overview", icon: I.chart, end: true },
  { to: "/portal/admin/xui", label: "X-UI Panel", icon: I.server },
  { to: "/portal/admin/network", label: "Networks & Packages", icon: I.globe },
  { to: "/portal/admin/payments", label: "Payment Methods", icon: I.card },
  { to: "/portal/admin/invoices", label: "Approve Invoices", icon: I.file },
  { to: "/portal/admin/topups", label: "Approve Top-ups", icon: I.wallet },
  { to: "/portal/admin/users", label: "Users & Services", icon: I.users },
  { to: "/portal/staff/tickets", label: "Support Tickets", icon: I.ticket },
];

function RailLink({ item }: { item: Item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      data-tip={item.label}
      className={({ isActive }) => `rail-btn ${isActive ? "active" : ""} ${item.hideSm ? "hide-sm" : ""}`}
    >
      {item.icon}
    </NavLink>
  );
}

function FlyLink({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) => `flyout-link ${isActive ? "active" : ""}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => setPanel(null), [pathname]);
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (railRef.current && !railRef.current.contains(event.target as Node)) setPanel(null);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPanel(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "staff";
  const adminActive = pathname.startsWith("/portal/admin") || pathname.startsWith("/portal/staff");
  const close = () => setPanel(null);
  const toggle = (nextPanel: Exclude<Panel, null>) => setPanel((current) => current === nextPanel ? null : nextPanel);

  const onLogout = async () => {
    close();
    await logout();
    navigate("/portal/login", { replace: true });
  };

  const rail = (
    <nav className="rail" ref={railRef} aria-label="Portal navigation">
      <Link to="/portal" className="rail-logo" aria-label="VMEX dashboard">
        <img src="/logo.png" alt="" />
      </Link>

      <div className="rail-sep" />

      <div className="rail-nav">
        {mainNav.map((item) => <RailLink key={item.to} item={item} />)}

        {isStaff && (
          <RailLink item={{ to: "/portal/staff/tickets", label: "Support Tickets", icon: I.headset }} />
        )}

        {isAdmin && (
          <div className="rail-pop">
            <button
              type="button"
              className={`rail-btn ${adminActive ? "active" : ""} ${panel === "admin" ? "open" : ""}`}
              data-tip="Admin"
              aria-label="Admin menu"
              aria-expanded={panel === "admin"}
              onClick={() => toggle("admin")}
            >
              {I.shield}
            </button>

            {panel === "admin" && (
              <div className="flyout flyout-mid" role="menu">
                <p className="flyout-title">Admin</p>
                {adminNav.map((item) => <FlyLink key={item.to} item={item} onClick={close} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rail-bottom">
        <div className="rail-pop">
          <button
            type="button"
            className={`rail-btn rail-me ${panel === "settings" ? "open" : ""}`}
            data-tip="Settings"
            aria-label="Settings"
            aria-expanded={panel === "settings"}
            onClick={() => toggle("settings")}
          >
            <UserAvatar seed={user.email} name={user.name} size="sm" />
            <span className="rail-gear">{I.settings}</span>
          </button>

          {panel === "settings" && (
            <div className="flyout flyout-bottom" role="menu">
              <div className="flyout-user">
                <UserAvatar seed={user.email} name={user.name} />
                <div>
                  <b>{user.name}</b>
                  <small className={`role-${user.role}`}>{user.role.toUpperCase()}</small>
                </div>
                <span className="flyout-balance">{formatLKR(user.balance ?? 0)}</span>
              </div>

              <FlyLink item={{ to: "/portal/account", label: "My Account", icon: I.user }} onClick={close} />
              <div className="show-sm">
                <FlyLink item={{ to: "/portal/invoices", label: "Invoices", icon: I.file }} onClick={close} />
                <FlyLink item={{ to: "/portal/support", label: "Support", icon: I.ticket }} onClick={close} />
              </div>

              <div className="flyout-sep" />

              <a href={STATUS_URL} target="_blank" rel="noopener noreferrer" className="flyout-link" onClick={close}>
                {I.pulse}<span>System Status</span>
              </a>
              <Link to="/#how-it-works" className="flyout-link" onClick={close}>
                {I.book}<span>Setup Guide</span>
              </Link>
              <Link to="/" className="flyout-link" onClick={close}>
                {I.back}<span>Back to website</span>
              </Link>

              <div className="flyout-sep" />

              <button type="button" className="flyout-link danger" onClick={onLogout}>
                {I.logout}<span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="dash">
      {createPortal(rail, document.body)}

      <div className="dash-main">
        <div key={pathname} className="dash-page">
          <Outlet />
        </div>
      </div>

      <Toaster />
    </div>
  );
}
