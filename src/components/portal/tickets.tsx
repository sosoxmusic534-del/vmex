import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useFetch } from "../../lib/useFetch";
import type { Ticket, TicketMessage, TicketStatus } from "../../lib/types";
import { ErrorBox, PageSkeleton } from "./ui";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Waiting for staff",
  answered: "Staff replied",
  closed: "Closed",
};

export function TicketBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`tk-badge ${status}`}>
      <i /> {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityTag({ p }: { p: string }) {
  return <span className={`tk-prio ${p}`}>{p}</span>;
}

export function TicketRow({ t, to, showUser = false }: { t: Ticket; to: string; showUser?: boolean }) {
  return (
    <Link to={to} className="tk-row">
      <span className="tk-row-id">#{t.id}</span>
      <div className="tk-row-main">
        <b>{t.subject}</b>
        <small>
          {showUser && <>{t.user.name} · {t.user.email} · </>}
          <span className="tk-cat">{t.category}</span> · {t.messageCount} message{t.messageCount === 1 ? "" : "s"} ·
          updated {formatDateTime(t.updatedAt)}
        </small>
      </div>
      <PriorityTag p={t.priority} />
      <TicketBadge status={t.status} />
    </Link>
  );
}

export function TicketThread({ admin = false, staff = false }: { admin?: boolean; staff?: boolean }) {
  const { id } = useParams();
  const apiBase = admin ? "/admin/tickets" : "/portal/tickets";
  const backTo = staff ? "/portal/staff/tickets" : admin ? "/portal/admin/tickets" : "/portal/support";

  const { data, error, loading, reload } = useFetch<{ ticket: Ticket; messages: TicketMessage[] }>(`${apiBase}/${id}`);

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    const timer = setInterval(() => reloadRef.current(), 10_000);
    return () => clearInterval(timer);
  }, []);

  const count = data?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [count]);

  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const { ticket: t, messages } = data;

  const send = async () => {
    if (msg.trim().length < 2 || busy) return;
    setBusy(true);
    setErr("");
    try {
      await api(`${apiBase}/${t.id}/reply`, { method: "POST", body: JSON.stringify({ message: msg }) });
      setMsg("");
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: TicketStatus) => {
    setBusy(true);
    try {
      if (admin) {
        await api(`${apiBase}/${t.id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      } else {
        await api(`${apiBase}/${t.id}/close`, { method: "POST" });
      }
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tk-wrap">
      <div className="tk-head px-card">
        <Link to={backTo} className="tk-back">← All tickets</Link>
        <div className="tk-head-main">
          <div>
            <p className="tk-head-id">
              Ticket #{t.id} · <span className="tk-cat">{t.category}</span> · <PriorityTag p={t.priority} />
            </p>
            <h1>{t.subject}</h1>
            {(admin || staff) && (
              <p className="tk-head-user">
                From <b>{t.user.name}</b> ({t.user.email})
              </p>
            )}
          </div>
          <div className="tk-head-actions">
            <TicketBadge status={t.status} />
            {t.status !== "closed" ? (
              <button type="button" className="tk-btn ghost" disabled={busy} onClick={() => setStatus("closed")}>
                Close ticket
              </button>
            ) : (
              admin && (
                <button type="button" className="tk-btn ghost" disabled={busy} onClick={() => setStatus("open")}>
                  Reopen
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="tk-thread px-card">
        {messages.map((m) => {
          const mine = admin ? m.isStaff : !m.isStaff;
          return (
            <div key={m.id} className={`tk-msg ${mine ? "mine" : ""} ${m.isStaff ? "staff" : ""}`}>
              <div className="tk-msg-meta">
                <b>{m.author}</b>
                {m.isStaff && <span className="tk-staff">Staff</span>}
                <small>{formatDateTime(m.createdAt)}</small>
              </div>
              <div className="tk-bubble">{m.body}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="tk-compose px-card">
        {t.status === "closed" && !admin && (
          <p className="tk-note">This ticket is closed. Sending a reply will reopen it.</p>
        )}
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          placeholder={admin || staff ? "Reply as staff…" : "Write a reply…"}
          rows={4}
          maxLength={5000}
        />
        {err && <p className="tk-err">{err}</p>}
        <div className="tk-compose-foot">
          <small>Ctrl + Enter to send</small>
          <button type="button" className="tk-btn" disabled={busy || msg.trim().length < 2} onClick={send}>
            {busy ? "Sending…" : admin || staff ? "Send staff reply" : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
