import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUpload } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatLKR } from "../../lib/format";
import type { Invoice } from "../../lib/types";
import ReceiptPicker from "../../components/portal/ReceiptPicker";
import { Empty, ErrorBox, I, Notice, PageHead, Skeleton, Spinner, StatusBadge, errMsg, toast } from "../../components/portal/ui";

function OpenInvoice({ inv, onChanged }: { inv: Invoice; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const showPicker = !inv.hasReceipt || inv.status === "rejected" || replacing;

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("receipt", file);
      await apiUpload(`/portal/invoices/${inv.id}/receipt`, form);
      toast("Receipt uploaded — we'll check it soon");
      setFile(null);
      setReplacing(false);
      onChanged();
    } catch (error) {
      toast(errMsg(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return <div className={`dash-card pay-note ${inv.status}`}>
    <div className="pay-note-head">
      <div>
        <span className="dash-label">{inv.status === "rejected" ? "Payment rejected" : inv.hasReceipt ? "Waiting for approval" : "Awaiting payment"}</span>
        <h3>#{inv.reference}</h3>
        <p className="dash-muted">{inv.planName}{inv.packageName ? ` · ${inv.packageName}` : ""}</p>
      </div>
      <div className="pay-note-amount">{formatLKR(inv.amount)}<small>via {inv.paymentMethod ?? "manual payment"}</small></div>
    </div>

    {inv.status === "rejected" && <Notice tone="error">
      <p><b>Reason:</b> {inv.rejectReason || "We couldn't verify this payment."}</p>
      <p>Please upload a correct receipt below and we'll check it again.</p>
    </Notice>}

    {inv.status === "pending" && inv.hasReceipt && !replacing && <div className="receipt-status">
      {I.check}
      <span>Receipt received{inv.receiptUploadedAt ? ` on ${formatDate(inv.receiptUploadedAt)}` : ""}. Your config is created as soon as we approve it.</span>
      {inv.receiptUrl && <a href={inv.receiptUrl} target="_blank" rel="noreferrer" className="dash-btn sm">{I.eye} View</a>}
      <button type="button" className="dash-btn sm" onClick={() => setReplacing(true)}>Replace</button>
    </div>}

    {showPicker && <>
      {inv.instructions && <pre className="pay-instructions">{inv.instructions}</pre>}
      <div className="receipt-upload-row">
        <ReceiptPicker file={file} onChange={setFile} />
        <div className="form-actions">
          <button type="button" className="dash-btn primary" onClick={upload} disabled={!file || busy}>
            {busy ? <Spinner /> : <>{I.upload} Upload Receipt</>}
          </button>
          {replacing && <button type="button" className="dash-btn" onClick={() => { setReplacing(false); setFile(null); }}>Cancel</button>}
        </div>
      </div>
      <p className="pay-note-foot">{I.info} Use <b>#{inv.reference}</b> as the payment reference.</p>
    </>}
  </div>;
}

export default function Invoices() {
  const { data, loading, error, reload } = useFetch<{ invoices: Invoice[] }>("/portal/invoices");
  const open = data?.invoices.filter((invoice) => invoice.status === "pending" || invoice.status === "rejected") ?? [];

  return <>
    <PageHead eyebrow="BILLING" title="My Invoices" sub="Your orders, receipts and payment history." />
    {error && <ErrorBox message={error} onRetry={reload} />}

    {open.length > 0 && <div className="dash-stack stagger" style={{ marginBottom: 20 }}>
      {open.map((invoice) => <OpenInvoice key={invoice.id} inv={invoice} onChanged={reload} />)}
    </div>}

    {loading && !data ? <Skeleton height={240} />
      : data?.invoices.length ? <div className="table-wrap" data-lenis-prevent>
        <table className="dash-table">
          <thead><tr><th>Reference</th><th>Plan</th><th>Method</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{data.invoices.map((invoice, index) => <tr key={invoice.id} style={{ animationDelay: `${index * 0.04}s` }}>
            <td className="mono">#{invoice.reference}</td>
            <td>{invoice.planName}{invoice.packageName && <span className="sub">{invoice.carrierName} · {invoice.packageName}</span>}</td>
            <td>{invoice.paymentMethod ?? "—"}</td>
            <td><b>{formatLKR(invoice.amount)}</b></td>
            <td>{formatDate(invoice.createdAt)}</td>
            <td><StatusBadge status={invoice.status} /></td>
          </tr>)}</tbody>
        </table>
      </div> : !error && <div className="dash-card">
        <Empty icon={I.file} title="No invoices yet" text="Your payment history will appear here."
          action={<Link to="/portal/store" className="dash-btn primary sm">Make a purchase {I.arrow}</Link>} />
      </div>}
  </>;
}
