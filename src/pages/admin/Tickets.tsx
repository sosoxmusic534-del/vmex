import { useState } from "react";
import { TicketRow } from "../../components/portal/tickets";
import { ErrorBox, PageSkeleton } from "../../components/portal/ui";
import { useFetch } from "../../lib/useFetch";
import type { Ticket } from "../../lib/types";

const TABS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "closed", label: "Closed" },
] as const;

export default function AdminTickets({ staff = false }: { staff?: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const { data, error, loading, reload } = useFetch<{ tickets: Ticket[]; counts: Record<string, number> }>(`/admin/tickets?status=${tab}`);

  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="tk-wrap">
      <div className="tk-page-head">
        <div>
          <p className="px-label">{staff ? "STAFF" : "ADMIN · SUPPORT"}</p>
          <h1>Support Tickets</h1>
          <p className="px-sub">{counts.open ?? 0} waiting for a staff reply.</p>
        </div>
        <button type="button" className="tk-btn ghost" onClick={reload}>Refresh</button>
      </div>

      <div className="px-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="tk-count">{t.key === "all" ? total : counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <PageSkeleton />
      ) : (
        <div className="tk-list">
          {(data?.tickets ?? []).length === 0 ? (
            <div className="px-card tk-empty"><b>No tickets here</b></div>
          ) : (
            data!.tickets.map((t) => (
              <TicketRow key={t.id} t={t} to={`${staff ? "/portal/staff" : "/portal/admin"}/tickets/${t.id}`} showUser />
            ))
          )}
        </div>
      )}
    </div>
  );
}
