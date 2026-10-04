import { Link } from "react-router-dom";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatLKR } from "../../lib/format";
import type { Invoice } from "../../lib/types";
import UserAvatar from "../../components/portal/UserAvatar";
import { Empty, ErrorBox, I, PageHead, PageSkeleton, StatCard, StatusBadge } from "../../components/portal/ui";

type Overview = {
  counts: { users: number; activeServices: number; pendingInvoices: number; revenue: number };
  xui: { configured: boolean; ok: boolean; inbounds?: number; error?: string };
  recentInvoices: Invoice[];
};

export default function AdminOverview() {
  const { data, loading, error, reload } = useFetch<Overview>("/admin/overview");

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const { counts: c, xui } = data;
  const conn = !xui.configured ? "idle" : xui.ok ? "ok" : "bad";

  return (
    <>
      <PageHead
        eyebrow="ADMIN"
        title="Admin Overview"
        sub="Customers, revenue and X-UI connection at a glance."
        actions={<button type="button" className="dash-btn" onClick={reload}>{I.refresh} Refresh</button>}
      />

      <div className="dash-stack stagger">
        <div className="dash-stats stagger">
          <StatCard label="Customers" value={c.users} icon={I.users} to="/portal/admin/users" linkLabel="View users" />
          <StatCard label="Active Services" value={c.activeServices} icon={I.box} to="/portal/admin/users" linkLabel="Manage" />
          <StatCard label="Pending Invoices" value={c.pendingInvoices} icon={I.file} to="/portal/admin/invoices" linkLabel="Approve" />
          <StatCard label="Revenue" value={c.revenue} format={formatLKR} icon={I.wallet} to="/portal/admin/invoices" linkLabel="History" />
        </div>

        <div className="dash-card xui-card">
          <span className={`xui-icon ${conn}`}>{I.server}</span>
          <div className="xui-body">
            <h3 className="dash-h3">3x-ui Panel</h3>
            <p className="dash-muted">
              {!xui.configured
                ? "Not connected yet. Add your panel URL and login to start creating configs automatically."
                : xui.ok
                  ? `Connected · ${xui.inbounds} inbound${xui.inbounds === 1 ? "" : "s"} found`
                  : xui.error}
            </p>
          </div>
          <span className={`conn ${conn}`}>
            <i /> {conn === "ok" ? "Online" : conn === "bad" ? "Error" : "Not connected"}
          </span>
          <Link to="/portal/admin/xui" className="dash-btn sm">{I.plug} Manage</Link>
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <h3 className="dash-h3">{I.file} Recent Invoices</h3>
            <Link to="/portal/admin/invoices" className="dash-more plain">All invoices {I.arrow}</Link>
          </div>

          {data.recentInvoices.length ? (
            <div className="table-wrap flat" data-lenis-prevent>
              <table className="dash-table">
                <thead>
                  <tr><th>Reference</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.recentInvoices.map((inv, i) => (
                    <tr key={inv.id} style={{ animationDelay: `${i * 0.04}s` }}>
                      <td className="mono">#{inv.reference}</td>
                      <td>
                        <div className="avatar-cell">
                          <UserAvatar seed={inv.user?.email ?? ""} name={inv.user?.name} size="sm" />
                          <div>{inv.user?.name}<span className="sub">{inv.user?.email}</span></div>
                        </div>
                      </td>
                      <td>
                        {inv.planName}
                        {inv.packageName && <span className="sub">{inv.carrierName} · {inv.device === "router" ? "Router" : "SIM"} · {inv.packageName}</span>}
                        {inv.paymentMethod && <span className="sub">via {inv.paymentMethod}</span>}
                      </td>
                      <td><b>{formatLKR(inv.amount)}</b></td>
                      <td>{formatDate(inv.createdAt)}</td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={I.file} title="No invoices yet" text="Orders from customers will show up here." />
          )}
        </div>
      </div>
    </>
  );
}