import { useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatBytes, formatDate, formatLKR } from "../../lib/format";
import type { Service } from "../../lib/types";
import UserAvatar from "../../components/portal/UserAvatar";
import { Empty, ErrorBox, I, PageHead, Progress, Skeleton, Spinner, StatusBadge, errMsg, toast } from "../../components/portal/ui";

type AdminUser = {
  id: number; name: string; email: string; role: string;
  balance: number; createdAt: string; services: number; spent: number;
};

export default function AdminUsers() {
  const users = useFetch<{ users: AdminUser[] }>("/admin/users");
  const services = useFetch<{ services: Service[] }>("/admin/services");
  const [busy, setBusy] = useState<number | null>(null);

  const remove = async (s: Service) => {
    if (!confirm(`Delete "${s.name}" for ${s.user?.email}? This also removes the client from X-UI.`)) return;
    setBusy(s.id);
    try {
      const result = await api<{ panelRemoved: boolean; warning?: string }>(`/admin/services/${s.id}?force=1`, { method: "DELETE" });
      toast(result.panelRemoved ? "Service and X-UI client deleted" : `Service deleted from portal; X-UI cleanup failed: ${result.warning ?? "unknown error"}`, result.panelRemoved ? "success" : "error");
    } catch (error) {
      toast(errMsg(error), "error");
    } finally {
      setBusy(null);
      services.reload();
      users.reload();
    }
  };

  const adjustBalance = async (user: AdminUser) => {
    const input = prompt(`Adjust balance for ${user.name} (current LKR ${user.balance}).\nEnter an amount — use a negative number to deduct.`, "0");
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isInteger(amount) || amount === 0) return toast("Enter a whole number other than 0", "error");
    try {
      await api(`/admin/users/${user.id}/balance`, { method: "POST", body: JSON.stringify({ amount }) });
      toast(`Balance ${amount > 0 ? "added" : "deducted"}`);
      users.reload();
    } catch (error) { toast(errMsg(error), "error"); }
  };

  const changeRole = async (user: AdminUser, role: string) => {
    if (!confirm(`Make ${user.name} a ${role}?`)) return;
    try {
      await api(`/admin/users/${user.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      toast(`${user.name} is now ${role}`);
      users.reload();
    } catch (error) {
      toast(errMsg(error), "error");
    }
  };

  return (
    <>
      <PageHead
        eyebrow="ADMIN · CUSTOMERS"
        title="Users & Services"
        sub="Everyone registered and every config you've created."
        actions={<button type="button" className="dash-btn" onClick={() => { users.reload(); services.reload(); }}>{I.refresh} Refresh</button>}
      />

      <div className="dash-stack stagger">
        <div className="dash-card">
          <h3 className="dash-h3" style={{ marginBottom: 18 }}>{I.users} Users</h3>
          {users.error && <ErrorBox message={users.error} onRetry={users.reload} />}
          {users.loading && !users.data ? (
            <Skeleton height={180} />
          ) : (
            <div className="table-wrap flat" data-lenis-prevent>
              <table className="dash-table">
                <thead>
                  <tr><th>ID</th><th>User</th><th>Role</th><th>Balance</th><th>Services</th><th>Spent</th><th>Joined</th><th /></tr>
                </thead>
                <tbody>
                  {users.data?.users.map((u, i) => (
                    <tr key={u.id} style={{ animationDelay: `${i * 0.03}s` }}>
                      <td className="mono">#VMX-{String(u.id).padStart(6, "0")}</td>
                      <td>
                        <div className="avatar-cell">
                          <UserAvatar seed={u.email} name={u.name} size="sm" />
                          <div>{u.name}<span className="sub">{u.email}</span></div>
                        </div>
                      </td>
                      <td><select className={`role-select ${u.role}`} value={u.role} onChange={(event) => changeRole(u, event.target.value)}>
                        <option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option>
                      </select></td>
                      <td><b>{formatLKR(u.balance)}</b></td>
                      <td>{u.services}</td>
                      <td>{formatLKR(u.spent)}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td><div className="row-actions">
                        <button type="button" className="dash-btn sm" onClick={() => adjustBalance(u)}>{I.wallet} Balance</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dash-card">
          <h3 className="dash-h3" style={{ marginBottom: 18 }}>{I.box} Services</h3>
          {services.error && <ErrorBox message={services.error} onRetry={services.reload} />}
          {services.loading && !services.data ? (
            <Skeleton height={180} />
          ) : services.data?.services.length ? (
            <div className="table-wrap flat" data-lenis-prevent>
              <table className="dash-table">
                <thead>
                  <tr><th>Customer</th><th>Service</th><th>Usage</th><th>Expires</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {services.data.services.map((s, i) => {
                    const pct = s.totalBytes ? ((s.usedBytes ?? 0) / s.totalBytes) * 100 : 100;
                    return (
                      <tr key={s.id} style={{ animationDelay: `${i * 0.03}s` }}>
                        <td>
                          <div className="avatar-cell">
                            <UserAvatar seed={s.user?.email ?? ""} name={s.user?.name} size="sm" />
                            <div>{s.user?.name}<span className="sub">{s.user?.email}</span></div>
                          </div>
                        </td>
                        <td>{s.name}<span className="sub">{s.protocol.toUpperCase()}</span></td>
                        <td style={{ minWidth: 170 }}>
                          <span className="sub" style={{ marginBottom: 6 }}>
                            {formatBytes(s.usedBytes)} / {s.totalBytes ? formatBytes(s.totalBytes) : "∞"}
                          </span>
                          <Progress value={pct} small />
                        </td>
                        <td>{formatDate(s.expiresAt)}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="dash-btn sm danger" disabled={busy !== null} onClick={() => remove(s)} aria-label="Delete service">
                              {busy === s.id ? <Spinner /> : I.trash}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={I.box} title="No services yet" text="Approve an invoice to create the first one." />
          )}
        </div>
      </div>
    </>
  );
}