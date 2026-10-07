import { useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatLKR } from "../../lib/format";
import type { Topup } from "../../lib/types";
import UserAvatar from "../../components/portal/UserAvatar";
import { Empty, ErrorBox, I, PageHead, Skeleton, Spinner, StatusBadge, errMsg, toast } from "../../components/portal/ui";

const TABS = ["pending", "rejected", "paid", "cancelled", "all"] as const;
const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");

export default function AdminTopups() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const { data, loading, error, reload } = useFetch<{ topups: Topup[] }>(`/admin/topups?status=${tab}`);
  const [busy, setBusy] = useState<string | null>(null);

  const approve = async (item: Topup) => {
    if (!item.hasReceipt && !confirm(`#${item.reference} has no slip yet. Approve anyway?`)) return;
    if (!confirm(`Add ${formatLKR(item.amount)} to ${item.user?.name}'s balance?`)) return;
    setBusy(`a-${item.id}`);
    try {
      await api(`/admin/topups/${item.id}/approve`, { method: "POST" });
      toast(`#${item.reference} approved · balance added`);
      reload();
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (item: Topup) => {
    const reason = prompt(`Reason for rejecting #${item.reference} (shown to the customer):`, "Payment not received / slip unclear");
    if (reason === null) return;
    setBusy(`r-${item.id}`);
    try {
      await api(`/admin/topups/${item.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
      toast(`#${item.reference} rejected`);
      reload();
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHead eyebrow="ADMIN · CREDIT" title="Approve Top-ups" sub="Check the slip, then approve to add the credit to the customer's balance." actions={<button type="button" className="dash-btn" onClick={reload}>{I.refresh} Refresh</button>} />
      <div className="tabs">{TABS.map((item) => <button key={item} type="button" className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>{item}</button>)}</div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? <Skeleton height={240} /> : data?.topups.length ? (
        <div className="table-wrap" data-lenis-prevent key={tab}><table className="dash-table"><thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Slip</th><th>Status</th><th /></tr></thead><tbody>
          {data.topups.map((item, index) => <tr key={item.id} style={{ animationDelay: `${index * 0.04}s` }}>
            <td className="mono">#{item.reference}<span className="sub">{formatDate(item.createdAt)}</span></td>
            <td><div className="avatar-cell"><UserAvatar seed={item.user?.email ?? ""} name={item.user?.name} size="sm" /><div>{item.user?.name}<span className="sub">{item.user?.email}</span></div></div></td>
            <td><b>{formatLKR(item.amount)}</b><span className="sub">via {item.paymentMethod}</span></td>
            <td>{item.hasReceipt && item.receiptUrl ? <a className="receipt-thumb" href={item.receiptUrl} target="_blank" rel="noreferrer" title="Open slip">{isPdf(item.receiptUrl) ? <span>PDF</span> : <img src={item.receiptUrl} alt="" loading="lazy" />}</a> : <span className="sub">Not yet</span>}</td>
            <td><StatusBadge status={item.status} />{item.status === "rejected" && item.rejectReason && <span className="sub">{item.rejectReason}</span>}</td>
            <td>{item.status === "pending" && <div className="row-actions"><button type="button" className="dash-btn sm success" disabled={busy !== null} onClick={() => approve(item)}>{busy === `a-${item.id}` ? <Spinner /> : <>{I.check} Approve</>}</button><button type="button" className="dash-btn sm danger" disabled={busy !== null} onClick={() => reject(item)}>{busy === `r-${item.id}` ? <Spinner /> : <>{I.x} Reject</>}</button></div>}</td>
          </tr>)}
        </tbody></table></div>
      ) : !error && <div className="dash-card"><Empty icon={I.wallet} title={`No ${tab === "all" ? "" : tab} top-ups`} text="Nothing here right now." /></div>}
    </>
  );
}
