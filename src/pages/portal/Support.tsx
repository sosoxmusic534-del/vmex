import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { TicketRow } from "../../components/portal/tickets";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Ticket } from "../../lib/types";
import { ErrorBox, PageSkeleton } from "../../components/portal/ui";

export default function Support() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useFetch<{ tickets: Ticket[] }>("/portal/tickets");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "general", priority: "normal", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const d = await api<{ ticket: Ticket }>("/portal/tickets", { method: "POST", body: JSON.stringify(form) });
      navigate(`/portal/support/${d.ticket.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <PageSkeleton />;

  const tickets = data?.tickets ?? [];
  const active = tickets.filter((t) => t.status !== "closed").length;

  return (
    <div className="tk-wrap">
      <div className="tk-page-head">
        <div>
          <p className="px-label">SUPPORT</p>
            <h1>My Tickets</h1>
          <p className="px-sub">
            Our staff usually reply within a few hours. {active > 0 && `You have ${active} active ticket${active > 1 ? "s" : ""}.`}
          </p>
        </div>
        <button type="button" className="tk-btn" onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "+ New ticket"}
        </button>
      </div>

      {open && (
        <form className="tk-form px-card" onSubmit={submit}>
          <label className="tk-field full">
            <span>Subject</span>
            <input value={form.subject} onChange={set("subject")} placeholder="e.g. My config stopped working" maxLength={120} required />
          </label>

          <label className="tk-field">
            <span>Category</span>
            <select value={form.category} onChange={set("category")}>
              <option value="general">General</option>
              <option value="billing">Billing & payments</option>
              <option value="technical">Technical / connection</option>
              <option value="config">Config & setup</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="tk-field">
            <span>Priority</span>
            <select value={form.priority} onChange={set("priority")}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="tk-field full">
            <span>Message</span>
            <textarea
              value={form.message}
              onChange={set("message")}
              rows={6}
              maxLength={5000}
              placeholder="Describe the problem. Include your plan, device and what you've tried."
              required
            />
          </label>

          {err && <p className="tk-err full">{err}</p>}

          <div className="full tk-form-foot">
            <button type="submit" className="tk-btn" disabled={busy}>
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </form>
      )}

      <div className="tk-list">
        {tickets.length === 0 ? (
          <div className="px-card tk-empty">
            <b>No tickets yet</b>
            <p className="px-sub">Need help? Click “New ticket” and our staff will get back to you.</p>
          </div>
        ) : (
          tickets.map((t) => <TicketRow key={t.id} t={t} to={`/portal/support/${t.id}`} />)
        )}
      </div>
    </div>
  );
}
