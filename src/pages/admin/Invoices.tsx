import { useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatLKR } from "../../lib/format";
import type { Invoice } from "../../lib/types";
import UserAvatar from "../../components/portal/UserAvatar";
import { Empty, ErrorBox, I, PageHead, Skeleton, Spinner, StatusBadge, errMsg, toast } from "../../components/portal/ui";

const TABS = ["pending", "rejected", "paid", "cancelled", "all"] as const;
const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");

function Lightbox({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const url = invoice.receiptUrl!;
  return createPortal(
    <div className="co-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="lightbox">
        <header><div><b>Receipt · #{invoice.reference}</b><small>{invoice.user?.name} · {formatLKR(invoice.amount)} via {invoice.paymentMethod}</small></div>
          <div className="row-actions"><a href={url} target="_blank" rel="noreferrer" className="dash-btn sm">Open full size</a>
            <button type="button" className="co-close" onClick={onClose} aria-label="Close">{I.x}</button></div>
        </header>
        <div className="lightbox-body" data-lenis-prevent>{isPdf(url) ? <iframe src={url} title="Receipt PDF" /> : <img src={url} alt="Payment receipt" />}</div>
      </div>
    </div>, document.body,
  );
}

export default function AdminInvoices() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const { data, loading, error, reload } = useFetch<{ invoices: Invoice[] }>(`/admin/invoices?status=${tab}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);

  const decide = async (invoice: Invoice, action: "approve" | "reject") => {
    if (action === "approve" && !invoice.hasReceipt && !confirm(`#${invoice.reference} has no receipt yet. Approve anyway?`)) return;
    let reason = "";
    if (action === "reject") {
      const answer = prompt(`Reason for rejecting #${invoice.reference} (the customer will see this):`, "Payment not received / receipt unclear");
      if (answer === null) return;
      reason = answer;
    }
    const key = `${action}-${invoice.id}`;
    setBusy(key);
    try {
      await api(`/admin/invoices/${invoice.id}/${action}`, {
        method: "POST",
        ...(action === "reject" ? { body: JSON.stringify({ reason }) } : {}),
      });
      toast(action === "approve" ? `#${invoice.reference} approved · config created on X-UI` : `#${invoice.reference} rejected`);
      reload();
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (invoice: Invoice) => {
    if (!confirm(`Cancel invoice #${invoice.reference}?`)) return;
    setBusy(`cancel-${invoice.id}`);
    try {
      await api(`/admin/invoices/${invoice.id}/cancel`, { method: "POST" });
      toast(`#${invoice.reference} cancelled`);
      reload();
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setBusy(null);
    }
  };

  return <>
    <PageHead eyebrow="ADMIN · BILLING" title="Approve Invoices" sub="Check the receipt, then approve (creates the config on X-UI) or reject with a reason."
      actions={<button type="button" className="dash-btn" onClick={reload}>{I.refresh} Refresh</button>} />
    <div className="tabs">{TABS.map((value) => <button key={value} type="button" className={`tab ${tab === value ? "active" : ""}`} onClick={() => setTab(value)}>{value}</button>)}</div>
    {error && <ErrorBox message={error} onRetry={reload} />}
    {loading && !data ? <Skeleton height={260} /> : data?.invoices.length ? <div className="table-wrap" data-lenis-prevent key={tab}>
      <table className="dash-table">
        <thead><tr><th>Reference</th><th>Customer</th><th>Order</th><th>Amount</th><th>Receipt</th><th>Status</th><th /></tr></thead>
        <tbody>{data.invoices.map((invoice, index) => <tr key={invoice.id} style={{ animationDelay: `${index * 0.04}s` }}>
          <td className="mono">#{invoice.reference}<span className="sub">{formatDate(invoice.createdAt)}</span></td>
          <td><div className="avatar-cell"><UserAvatar seed={invoice.user?.email ?? ""} name={invoice.user?.name} size="sm" />
            <div>{invoice.user?.name}<span className="sub">{invoice.user?.email}</span></div></div></td>
          <td>{invoice.planName}{invoice.packageName && <span className="sub">{invoice.carrierName} · {invoice.device === "router" ? "Router" : "SIM"} · {invoice.packageName}</span>}
            {invoice.paymentMethod && <span className="sub">via {invoice.paymentMethod}</span>}</td>
          <td><b>{formatLKR(invoice.amount)}</b></td>
          <td>{invoice.hasReceipt && invoice.receiptUrl ? <button type="button" className="receipt-thumb" onClick={() => setViewing(invoice)} title="View receipt">
            {isPdf(invoice.receiptUrl) ? <span>PDF</span> : <img src={invoice.receiptUrl} alt="" loading="lazy" />}</button> : <span className="sub">None yet</span>}</td>
          <td><StatusBadge status={invoice.status} />{invoice.rejectReason && <span className="sub">{invoice.rejectReason}</span>}</td>
          <td>{invoice.status === "pending" && <div className="row-actions">
            <button type="button" className="dash-btn sm success" disabled={busy !== null} onClick={() => decide(invoice, "approve")}>
              {busy === `approve-${invoice.id}` ? <Spinner /> : <>{I.check} Approve</>}</button>
            <button type="button" className="dash-btn sm danger" disabled={busy !== null} onClick={() => decide(invoice, "reject")}>
              {busy === `reject-${invoice.id}` ? <Spinner /> : <>{I.x} Reject</>}</button>
          </div>}{invoice.status === "rejected" && <button type="button" className="dash-btn sm" disabled={busy !== null} onClick={() => cancel(invoice)}>
            {busy === `cancel-${invoice.id}` ? <Spinner /> : "Cancel"}</button>}</td>
        </tr>)}</tbody>
      </table>
    </div> : !error && <div className="dash-card"><Empty icon={I.file} title={`No ${tab === "all" ? "" : tab} invoices`} text="Nothing here right now." /></div>}
    {viewing && <Lightbox invoice={viewing} onClose={() => setViewing(null)} />}
  </>;
}
