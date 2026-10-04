import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, apiUpload } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatLKR } from "../../lib/format";
import type { Carrier, Device, Invoice, PaymentMethod, Plan, SniPackage } from "../../lib/types";
import { I, Notice, Skeleton, Spinner, errMsg, toast } from "./ui";
import ReceiptPicker from "./ReceiptPicker";

type Options = { carriers: Carrier[]; packages: SniPackage[]; paymentMethods: PaymentMethod[]; balance: number };
const STEPS = ["Connection", "Device", "Package", "Payment"];
const methodIcon: Record<PaymentMethod["icon"], ReactNode> = { bank: I.bank, ezcash: I.phone, card: I.card, wallet: I.wallet };

function CarrierLogo({ carrier }: { carrier: Carrier }) {
  const [failed, setFailed] = useState(false);
  return <div className="opt-logo">{carrier.logo && !failed ? <img src={carrier.logo} alt="" onError={() => setFailed(true)} /> : <span>{carrier.name}</span>}</div>;
}

export default function CheckoutModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { data, loading, error, reload } = useFetch<Options>("/portal/checkout-options");
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [carrierId, setCarrierId] = useState<number | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (busy) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
    // close() depends on busy and onClose; use current busy state when the effect is refreshed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, onClose]);

  const carrier = data?.carriers.find((item) => item.id === carrierId);
  const packages = useMemo(() => data?.packages.filter((item) =>
    item.carrierId === carrierId && (item.device === "both" || item.device === device)
  ) ?? [], [data, carrierId, device]);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const method = data?.paymentMethods.find((item) => item.id === methodId);
  const balance = data?.balance ?? 0;
  const lowBalance = (item: PaymentMethod) => item.type === "balance" && balance < plan.price;
  const needsReceipt = method?.type === "manual";
  const canNext = [carrierId !== null, device !== null, packageId !== null, Boolean(method)][step];

  const go = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const checkout = async () => {
    if (!method || !selectedPackage || !device) return;
    setBusy(true);
    try {
      const result = await api<{ invoice: Invoice; activated: boolean }>("/portal/orders", {
        method: "POST",
        body: JSON.stringify({ planId: plan.id, packageId: selectedPackage.id, device, paymentMethodId: method.id }),
      });
      if (result.activated) {
        toast("Plan activated. Your configs are ready.");
        navigate("/portal/configs");
      } else {
        if (receipt) {
          try {
            const form = new FormData();
            form.append("receipt", receipt);
            await apiUpload(`/portal/invoices/${result.invoice.id}/receipt`, form);
            toast(`Order #${result.invoice.reference} placed — we'll check your receipt soon`);
          } catch (error) {
            toast(`Order created, but the receipt upload failed: ${errMsg(error)} Upload it from My Invoices.`, "error");
          }
        } else {
          toast(`Order #${result.invoice.reference} created`);
        }
        navigate("/portal/invoices");
      }
    } catch (cause) {
      toast(errMsg(cause), "error");
      setBusy(false);
    }
  };

  return createPortal(
    <div className={`co-backdrop ${closing ? "closing" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="co-modal" role="dialog" aria-modal="true" aria-labelledby="co-title">
        <header className="co-head">
          <div><h2 id="co-title">{plan.name}</h2><p>{formatLKR(plan.price)}</p></div>
          <button type="button" className="co-close" onClick={close} aria-label="Close">{I.x}</button>
        </header>

        <div className="co-steps">
          <div className="co-track"><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>
          {STEPS.map((label, index) => (
            <div key={label} className={`co-step ${index < step ? "done" : ""} ${index === step ? "current" : ""}`}>
              <span className="co-dot">{index < step ? I.check : index + 1}</span><small>{label}</small>
            </div>
          ))}
        </div>

        <div className="co-body" data-lenis-prevent>
          {error ? <Notice tone="error"><p>{error}</p><button type="button" className="dash-btn sm" onClick={reload}>{I.refresh} Retry</button></Notice>
            : loading && !data ? <Skeleton height={220} />
              : data ? <div key={step} className={`co-pane ${direction > 0 ? "fwd" : "back"}`}>
                {step === 0 && <>
                  <h3>Choose your connection type</h3>
                  {data.carriers.length ? <div className="opt-grid">{data.carriers.map((item) => (
                    <button key={item.id} type="button" className={`opt ${carrierId === item.id ? "on" : ""}`} onClick={() => { setCarrierId(item.id); setPackageId(null); }}>
                      <CarrierLogo carrier={item} /><b>{item.name}</b>
                    </button>
                  ))}</div> : <Notice tone="warn"><p>No networks are available yet. Please contact support.</p></Notice>}
                </>}
                {step === 1 && <>
                  <h3>Select your device</h3>
                  <div className="opt-grid">{(["router", "sim"] as Device[]).map((item) => (
                    <button key={item} type="button" className={`opt opt-device ${device === item ? "on" : ""}`} onClick={() => { setDevice(item); setPackageId(null); }}>
                      <span className="opt-icon">{item === "router" ? I.wifi : I.sim}</span><b>{item === "router" ? "Router" : "SIM Card"}</b>
                    </button>
                  ))}</div>
                </>}
                {step === 2 && <>
                  <h3>Select a package</h3><div className="co-note">{I.warn} Only the packages below are supported.</div>
                  {packages.length ? <div className="pkg-list">{packages.map((item) => (
                    <button key={item.id} type="button" className={`pkg-opt ${packageId === item.id ? "on" : ""}`} onClick={() => setPackageId(item.id)}>
                      <div className="pkg-opt-top"><b>{item.name}</b>{item.tag && <span className="pkg-tag">{item.tag}</span>}</div>
                      {item.sni && <small>{I.link} SNI: <code>{item.sni}</code></small>}
                    </button>
                  ))}</div> : <Notice tone="warn"><p>No packages are available for {carrier?.name} {device === "router" ? "Router" : "SIM"} yet. Try another option or contact support.</p></Notice>}
                </>}
                {step === 3 && selectedPackage && <>
                  <div className="co-summary">
                    <div><span>Plan</span><b>{plan.name}</b></div><div><span>Duration</span><b>{plan.days} days</b></div>
                    <div><span>Bandwidth</span><b>{plan.dataGb ? `${plan.dataGb} GB` : "Unlimited"}</b></div>
                    <div><span>Carrier</span><b>{carrier?.name}</b></div><div><span>Device</span><b>{device === "router" ? "Router" : "SIM Card"}</b></div>
                    <div><span>Package</span><b>{selectedPackage.name}</b></div><div className="co-total"><span>Total</span><b>{formatLKR(plan.price)}</b></div>
                  </div>
                  <div className="pay-grid">{data.paymentMethods.map((item) => {
                    const disabled = item.status !== "active" || lowBalance(item);
                    const subtitle = item.status !== "active" ? "Unavailable" : item.type === "balance" ? `${lowBalance(item) ? "Not enough" : "Instant"} · ${formatLKR(balance)}` : item.description;
                    return <button key={item.id} type="button" disabled={disabled} className={`pay-opt ${methodId === item.id ? "on" : ""}`} onClick={() => setMethodId(item.id)}>
                      <span className="opt-icon">{methodIcon[item.icon] ?? I.card}</span><b>{item.name}</b><small>{subtitle}</small>
                    </button>;
                  })}</div>
                  {needsReceipt && method && <div className="co-receipt">
                    {method.instructions && <>
                      <p className="co-receipt-title">Pay {formatLKR(plan.price)} to:</p>
                      <pre className="pay-instructions">{method.instructions}</pre>
                    </>}
                    <p className="co-receipt-title">Then upload your receipt</p>
                    <ReceiptPicker file={receipt} onChange={setReceipt} />
                  </div>}
                </>}
              </div> : null}
        </div>

        <footer className="co-foot">
          {step > 0 ? <button type="button" className="dash-btn" onClick={() => go(step - 1)} disabled={busy}>{I.back} Back</button> : <span />}
          {step < STEPS.length - 1
            ? <button type="button" className="dash-btn primary" disabled={!canNext} onClick={() => go(step + 1)}>Next {I.arrow}</button>
            : <button type="button" className="dash-btn primary" disabled={!method || busy || (needsReceipt && !receipt)} onClick={checkout}>{busy ? <Spinner /> : <>{I.zap} Check out</>}</button>}
        </footer>
      </div>
    </div>,
    document.body
  );
}
