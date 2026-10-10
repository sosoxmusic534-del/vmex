import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { api, apiUpload } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatLKR } from "../../lib/format";
import type { PaymentMethod, Topup } from "../../lib/types";
import ReceiptPicker from "./ReceiptPicker";
import { I, Notice, Skeleton, Spinner, errMsg, toast } from "./ui";

const PRESETS = [500, 1000, 2000, 5000];
const methodIcon: Record<string, ReactNode> = { bank: I.bank, ezcash: I.phone, card: I.card, wallet: I.wallet };

export default function TopupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data, loading, error } = useFetch<{ paymentMethods: PaymentMethod[] }>("/portal/checkout-options");
  const [amount, setAmount] = useState(1000);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [later, setLater] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const methods = (data?.paymentMethods ?? []).filter((m) => m.type === "manual");
  const method = methods.find((m) => m.id === methodId);
  const validAmount = Number.isInteger(amount) && amount >= 100 && amount <= 100000;

  const close = () => {
    if (busy) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const submit = async () => {
    if (!method || !validAmount) return;
    setBusy(true);
    try {
      const { topup } = await api<{ topup: Topup }>("/account/topups", {
        method: "POST",
        body: JSON.stringify({ amount, paymentMethodId: method.id }),
      });
      if (slip) {
        try {
          const form = new FormData();
          form.append("receipt", slip);
          await apiUpload(`/account/topups/${topup.id}/receipt`, form);
          toast(`Top-up #${topup.reference} sent — we'll check your slip soon`);
        } catch (uploadError) {
          toast(`Top-up created, but the slip upload failed: ${errMsg(uploadError)} Upload it from My Account.`, "error");
        }
      } else {
        toast(`Top-up #${topup.reference} created — upload your slip after paying`);
      }
      onDone();
      onClose();
    } catch (cause) {
      toast(errMsg(cause), "error");
      setBusy(false);
    }
  };

  return createPortal(
    <div className={`co-backdrop ${closing ? "closing" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="co-modal" role="dialog" aria-modal="true" aria-labelledby="tu-title">
        <header className="co-head">
          <div><h2 id="tu-title">Top up credit</h2><p>{validAmount ? formatLKR(amount) : "Enter an amount"}</p></div>
          <button type="button" className="co-close" onClick={close} aria-label="Close">{I.x}</button>
        </header>
        <div className="co-body" data-lenis-prevent>
          {error ? <Notice tone="error"><p>{error}</p></Notice>
            : loading && !data ? <Skeleton height={260} />
            : <div className="co-pane">
              <h3>How much?</h3>
              <div className="amount-chips">
                {PRESETS.map((value) => (
                  <button key={value} type="button" className={`amount-chip ${amount === value ? "on" : ""}`} onClick={() => setAmount(value)}>
                    {formatLKR(value).replace(".00", "")}
                  </button>
                ))}
              </div>
              <label className="topup-amount">
                <span>LKR</span>
                <input type="number" min={100} max={100000} step={50} value={amount || ""}
                  onChange={(event) => setAmount(Math.floor(Number(event.target.value)))} />
              </label>
              {!validAmount && <p className="receipt-err">Amount must be between LKR 100 and LKR 100,000.</p>}

              <h3 style={{ marginTop: 24 }}>Pay with</h3>
              <p className="dash-muted">Top-up credit is added after your payment is verified by staff.</p>
              {methods.length ? <div className="pay-grid" style={{ marginTop: 0 }}>
                {methods.map((item) => (
                  <button key={item.id} type="button" disabled={item.status !== "active"}
                    className={`pay-opt ${methodId === item.id ? "on" : ""}`} onClick={() => setMethodId(item.id)}>
                    <span className="opt-icon">{methodIcon[item.icon] ?? I.card}</span>
                    <b>{item.name}</b><small>{item.status === "active" ? item.description : "Unavailable"}</small>
                  </button>
                ))}
              </div> : <Notice tone="warn"><p>No payment methods are available right now.</p></Notice>}

              {method && <div className="co-receipt">
                {method.instructions && <><p className="co-receipt-title">Send {formatLKR(amount)} to:</p><pre className="pay-instructions">{method.instructions}</pre></>}
                <p className="co-receipt-title">Payment slip</p>
                {!later && <ReceiptPicker file={slip} onChange={setSlip} />}
                <label className="auth-check-row slip-later">
                  <input type="checkbox" checked={later} onChange={(event) => { setLater(event.target.checked); if (event.target.checked) setSlip(null); }} />
                  <span className="auth-box" /><span>I'll upload the slip later from <b>My Account</b></span>
                </label>
              </div>}
            </div>}
        </div>
        <footer className="co-foot">
          <button type="button" className="dash-btn" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="dash-btn primary" onClick={submit}
            disabled={busy || !method || !validAmount || (!slip && !later)}>
            {busy ? <Spinner /> : <>{I.wallet} Request Top-up</>}
          </button>
        </footer>
      </div>
    </div>, document.body
  );
}
