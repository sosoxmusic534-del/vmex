import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import TrialBanner from "../../components/portal/TrialBanner";
import { avatarUrl } from "../../lib/avatar";
import { useFetch } from "../../lib/useFetch";
import { daysLeft, formatBytes, formatDate, formatLKR } from "../../lib/format";
import type { Invoice, Service } from "../../lib/types";
import { Ic } from "../../components/portal/icons";
import { ErrorBox, I, PageSkeleton } from "../../components/portal/ui";
import { StatusBadge } from "../../components/portal/ui";

type Summary = {
  counts: { services: number; active: number; pendingInvoices: number; totalPaid: number };
  traffic: { used: number; total: number; unlimited: boolean };
  latestService: Service | null;
  latestInvoice: Invoice | null;
  xuiLive: boolean;
};

/* Fixed wave shape for the dot-matrix card */
const WAVE = [3, 4, 5, 4, 6, 7, 6, 8, 7, 9, 8, 7, 6, 8, 9, 8, 7, 5, 6, 7, 8, 9, 8, 7, 6, 5, 6, 7];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<Summary>("/portal/summary");

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data || !user) return null;

  const { counts: c, traffic: t, latestService: s, latestInvoice: inv } = data;
  const pct = !t.unlimited && t.total > 0 ? Math.min(100, (t.used / t.total) * 100) : 0;
  const avatar = avatarUrl(user.email);

  const sTotal = s?.totalBytes ?? 0;
  const sUsed = s?.usedBytes ?? 0;
  const sPct = sTotal > 0 ? Math.min(100, (sUsed / sTotal) * 100) : s ? 12 : 0;
  const sDays = s ? Math.max(0, daysLeft(s.expiresAt)) : 0;
  const daysPct = Math.min(100, (sDays / 30) * 100);
  const filledCols = Math.round((pct / 100) * WAVE.length);
  const segments = 40;
  const filledSeg = Math.round((pct / 100) * segments);

  return (
    <>
    <TrialBanner />
    <div className="px-grid">
      <div className="px-col">
        <div className="px-head">
          <p>
            Wallet balance <span className="px-up">{c.active} active</span>
          </p>
          <h1>{formatLKR((user as { balance?: number }).balance ?? 0)}</h1>
        </div>

        <div className="px-card blue">
          <p className="px-label light">Active services</p>
          <div className="px-big">
            {c.active}
            <small> / {c.services} total</small>
          </div>
          <p className="px-sub light">Running on Singapore & India nodes</p>
          <div className="px-blue-foot">
            <Link to="/portal/services" className="px-dots-btn">•••</Link>
            <span>
              {c.pendingInvoices > 0 ? `${c.pendingInvoices} invoice(s) pending` : "All invoices paid"}
            </span>
          </div>
        </div>

        <div className="px-card">
          <div className="px-card-head">
            <h3>Overview</h3>
            <Link to="/portal/store" className="px-mini-btn">+</Link>
          </div>
          <div className="px-tiles">
            <div className="px-tile">
              <span className="px-coin c1">{I.box}</span>
              <small>Services</small>
              <b>{c.services}</b>
            </div>
            <div className="px-tile">
              <span className="px-coin c2">{I.file}</span>
              <small>Pending</small>
              <b>{c.pendingInvoices}</b>
            </div>
            <div className="px-tile">
              <span className="px-coin c3">{I.card}</span>
              <small>Total paid</small>
              <b>{formatLKR(c.totalPaid)}</b>
            </div>
          </div>
        </div>

        <div className="px-card">
          <div className="px-profile">
            <img src={avatar} alt="" />
            <div>
              <b>{user.name}</b>
              <small>Data usage</small>
            </div>
            <span className={`px-tag ${data.xuiLive ? "ok" : "bad"}`}>
              <i /> {data.xuiLive ? "Servers live" : "Servers offline"}
            </span>
          </div>
          <div className="px-matrix-info">
            <span>{t.unlimited ? "Unlimited plan" : `${pct.toFixed(0)}% used`}</span>
            <span>
              {formatBytes(t.used)} / {t.unlimited ? "∞" : formatBytes(t.total)}
            </span>
          </div>
          <div className="px-matrix">
            {WAVE.map((h, col) => (
              <div key={col} className="px-matrix-col">
                {Array.from({ length: h }).map((_, row) => (
                  <i key={row} className={col < filledCols || t.unlimited ? "on" : ""} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-col">
        <div className="px-tabs">
          <Link to="/portal" className="active">Overview</Link>
          <Link to="/portal/services">Services</Link>
          <Link to="/portal/configs">Configs</Link>
          <Link to="/portal/invoices">Invoices</Link>
        </div>

        <div className="px-card">
          <div className="px-card-head">
            <h3>
              {s ? s.name : "No service yet"}
              {s && <StatusBadge status={s.status} />}
            </h3>
            <Link to="/portal/services" className="px-select">All services {I.arrow}</Link>
          </div>

          {s ? (
            <>
              <div className="px-bars">
                <div className="px-bar-row">
                  <span>Data</span>
                  <div className="px-bar"><i style={{ width: `${sPct}%` }} /></div>
                  <b>{formatBytes(sUsed)}</b>
                </div>
                <div className="px-bar-row">
                  <span>Quota</span>
                  <div className="px-bar"><i className="soft" style={{ width: "100%" }} /></div>
                  <b>{sTotal ? formatBytes(sTotal) : "∞"}</b>
                </div>
                <div className="px-bar-row">
                  <span>Days</span>
                  <div className="px-bar"><i style={{ width: `${daysPct}%` }} /></div>
                  <b>{sDays} left</b>
                </div>
                <div className="px-bar-row">
                  <span>Protocol</span>
                  <div className="px-bar"><i className="soft" style={{ width: "70%" }} /></div>
                  <b>{s.protocol.toUpperCase()}</b>
                </div>
              </div>
              <div className="px-legend">
                <span><i className="dot blue" /> Used</span>
                <span><i className="dot soft" /> Limit</span>
                <span className="px-legend-right">Expires {formatDate(s.expiresAt)}</span>
              </div>
            </>
          ) : (
            <p className="px-sub">Buy a plan to get your first V2Ray config.</p>
          )}
        </div>

        <div className="px-card">
          <div className="px-switch">
            <Link to="/portal/configs">My Configs</Link>
            <Link to="/portal/store" className="on">Buy</Link>
          </div>
          <div className="px-actions">
            <Link to="/portal/store" className="px-action">
              <span className="px-coin c1">{I.store}</span>
              <small>Store</small>
              <b>Buy a plan</b>
              <span className="px-chip-up">100GB · 200GB · ∞</span>
            </Link>
            <Link to="/portal/configs" className="px-action">
              <span className="px-coin c2">{I.sliders}</span>
              <small>Configs</small>
              <b>Copy link</b>
              <span className="px-chip-up">VLESS · VMess · Trojan</span>
            </Link>
          </div>
        </div>

      </div>

      <div className="px-col">
        <div className="px-head center">
          <p>Total traffic used</p>
          <h1>{formatBytes(t.used)}</h1>
          <div className="px-segments">
            {Array.from({ length: segments }).map((_, i) => (
              <i key={i} className={i < filledSeg || t.unlimited ? "on" : ""} />
            ))}
          </div>
          <small className="px-seg-note">
            {t.unlimited ? "Unlimited plan" : `${pct.toFixed(0)}% of ${formatBytes(t.total)}`}
          </small>
        </div>

        <div className="px-card blue swap">
          <h3>Latest invoice</h3>
          {inv ? (
            <>
              <div className="px-swap-box">
                <span className="px-coin c1">{Ic.hash}</span>
                <div>
                  <small>Reference</small>
                  <b>{inv.reference}</b>
                </div>
                <div className="r">
                  <small>Plan</small>
                  <b>{inv.planName}</b>
                </div>
              </div>
              <div className="px-swap-mid">{I.arrow}</div>
              <div className="px-swap-box">
                <span className="px-coin c2">{Ic.coins}</span>
                <div>
                  <small>Amount</small>
                  <b>{formatLKR(inv.amount)}</b>
                </div>
                <div className="r">
                  <StatusBadge status={inv.status} />
                </div>
              </div>
              <p className="px-swap-note">Created {formatDate(inv.createdAt)}</p>
            </>
          ) : (
            <p className="px-sub light">No invoices yet.</p>
          )}
        </div>

        <div className="px-mini-row">
          <div className="px-mini">
            <span className="px-coin sm c1">{Ic.globe}</span>
            <b>Singapore</b>
            <small className="ok">Online</small>
          </div>
          <div className="px-mini">
            <span className="px-coin sm c2">{Ic.globe}</span>
            <b>India</b>
            <small className="ok">Online</small>
          </div>
          <div className="px-mini">
            <span className="px-coin sm c3">{Ic.server}</span>
            <b>Panel</b>
            <small className={data.xuiLive ? "ok" : "bad"}>{data.xuiLive ? "Live" : "Down"}</small>
          </div>
        </div>

        <div className="px-list">
          <Link to="/portal/services" className="px-list-row">
            <span className="px-letter l1">{Ic.box}</span>
            <b>Services</b>
            <span className="r"><b>{c.services}</b><small>{c.active} active</small></span>
          </Link>
          <Link to="/portal/invoices" className="px-list-row">
            <span className="px-letter l2">{Ic.receipt}</span>
            <b>Invoices</b>
            <span className="r"><b>{c.pendingInvoices}</b><small>pending</small></span>
          </Link>
          <Link to="/portal/store" className="px-list-row">
            <span className="px-letter l3">{Ic.wallet}</span>
            <b>Total paid</b>
            <span className="r"><b>{formatLKR(c.totalPaid)}</b><small>all time</small></span>
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
