import { useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { PaymentMethod } from "../../lib/types";
import { Empty, ErrorBox, I, PageHead, Skeleton, Spinner, errMsg, toast } from "../../components/portal/ui";

const methodIcons: Record<PaymentMethod["icon"], ReactNode> = { bank: I.bank, ezcash: I.phone, card: I.card, wallet: I.wallet };

function MethodCard({ method, onDone }: { method?: PaymentMethod; onDone: () => void }) {
  const [form, setForm] = useState({
    name: method?.name ?? "", type: method?.type ?? "manual", icon: method?.icon ?? "bank",
    description: method?.description ?? "Manual approval", instructions: method?.instructions ?? "",
    status: method?.status ?? "active", sort: method?.sort ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: key === "sort" ? Number(event.target.value) : event.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      await api(method ? `/admin/payment-methods/${method.id}` : "/admin/payment-methods", {
        method: method ? "PUT" : "POST", body: JSON.stringify(form),
      });
      toast(`${form.name} saved`);
      onDone();
    } catch (error) { toast(errMsg(error), "error"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!method) return onDone();
    if (!confirm(`Delete payment method "${method.name}"?`)) return;
    try {
      await api(`/admin/payment-methods/${method.id}`, { method: "DELETE" });
      toast("Payment method deleted");
      onDone();
    } catch (error) { toast(errMsg(error), "error"); }
  };

  return <article className={`dash-card method-card ${form.status}`}>
    <div className="method-top"><span className="method-icon">{methodIcons[form.icon as PaymentMethod["icon"]]}</span>
      <div><b>{form.name || "New method"}</b><small>{form.type === "balance" ? "Instant wallet payment" : "Manual approval"}</small></div>
      <span className={`badge ${form.status === "active" ? "active" : form.status === "disabled" ? "pending" : "cancelled"}`}>{form.status}</span>
    </div>
    <div className="form-grid">
      <label className="dash-field"><span>Name</span><input className="dash-input" value={form.name} onChange={update("name")} placeholder="Bank Transfer" /></label>
      <label className="dash-field"><span>Subtitle</span><input className="dash-input" value={form.description} onChange={update("description")} placeholder="Manual approval" /></label>
      <label className="dash-field"><span>Type</span><select className="dash-input" value={form.type} onChange={update("type")}><option value="manual">Manual approval</option><option value="balance">Wallet balance</option></select></label>
      <label className="dash-field"><span>Icon</span><select className="dash-input" value={form.icon} onChange={update("icon")}><option value="bank">Bank</option><option value="ezcash">Mobile / eZ Cash</option><option value="card">Card</option><option value="wallet">Wallet</option></select></label>
      <label className="dash-field"><span>Status</span><select className="dash-input" value={form.status} onChange={update("status")}><option value="active">Active</option><option value="disabled">Shown unavailable</option><option value="hidden">Hidden</option></select></label>
      <label className="dash-field"><span>Sort order</span><input className="dash-input" type="number" value={form.sort} onChange={update("sort")} /></label>
      {form.type === "manual" && <label className="dash-field full"><span>Instructions shown on pending invoices</span><textarea className="dash-input" value={form.instructions} onChange={update("instructions")} placeholder={"Bank: …\nAccount name: …\nAccount no: …\nBranch: …"} /></label>}
    </div>
    <div className="form-actions"><button type="button" className="dash-btn primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <>{I.check} {method ? "Save" : "Add method"}</>}</button>
      <button type="button" className="dash-btn danger" onClick={remove}>{method ? <>{I.trash} Delete</> : <>{I.x} Cancel</>}</button></div>
  </article>;
}

export default function AdminPayments() {
  const { data, loading, error, reload } = useFetch<{ methods: PaymentMethod[] }>("/admin/payment-methods");
  const [adding, setAdding] = useState(false);
  return <>
    <PageHead eyebrow="ADMIN · BILLING" title="Payment Methods" sub="Choose the payment methods customers see and configure their instructions."
      actions={<button type="button" className="dash-btn primary" onClick={() => setAdding(true)} disabled={adding}>{I.plus} Add method</button>} />
    {error && <ErrorBox message={error} onRetry={reload} />}
    {loading && !data ? <div className="method-grid">{[0, 1].map((index) => <Skeleton key={index} height={360} />)}</div>
      : data?.methods.length || adding ? <div className="method-grid stagger">
        {adding && <MethodCard onDone={() => { setAdding(false); reload(); }} />}
        {data?.methods.map((method) => <MethodCard key={method.id} method={method} onDone={reload} />)}
      </div> : <div className="dash-card"><Empty icon={I.wallet} title="No payment methods" text="Add at least one method for customer checkout." /></div>}
  </>;
}
