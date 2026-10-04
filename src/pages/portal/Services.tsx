import { Link } from "react-router-dom";
import { useFetch } from "../../lib/useFetch";
import { daysLeft, formatBytes, formatDate } from "../../lib/format";
import type { Service } from "../../lib/types";
import { Empty, ErrorBox, I, PageHead, Progress, Skeleton, StatusBadge } from "../../components/portal/ui";

export default function Services() {
  const { data, loading, error, reload } = useFetch<{ services: Service[] }>("/portal/services");

  return (
    <>
      <PageHead
        eyebrow="SERVICES"
        title="My Services"
        sub="Live data usage and expiry for each of your V2Ray services."
        actions={<button type="button" className="dash-btn" onClick={reload}>{I.refresh} Refresh</button>}
      />

      {error && <ErrorBox message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="svc-grid">{[0, 1].map((i) => <Skeleton key={i} height={260} />)}</div>
      ) : data?.services.length ? (
        <div className="svc-grid stagger">
          {data.services.map((s) => {
            const pct = s.totalBytes ? ((s.usedBytes ?? 0) / s.totalBytes) * 100 : 0;
            return (
              <article key={s.id} className="dash-card hover">
                <div className="svc-head">
                  <div>
                    <b>{s.name}</b>
                    <span className="chip">{s.protocol}</span>
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                <div className="svc-usage">
                  <div className="svc-usage-top">
                    <span>Data used</span>
                    <b>{formatBytes(s.usedBytes)} / {s.totalBytes ? formatBytes(s.totalBytes) : "Unlimited"}</b>
                  </div>
                  <Progress value={s.totalBytes ? pct : 100} small />
                </div>

                <div className="dash-rows">
                  <div><span>Expires</span><b>{formatDate(s.expiresAt)}</b></div>
                  <div><span>Days left</span><b>{daysLeft(s.expiresAt)}</b></div>
                  <div><span>Started</span><b>{formatDate(s.createdAt)}</b></div>
                </div>

                {!s.live && <p className="svc-note">{I.info} Live usage is temporarily unavailable.</p>}
              </article>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="dash-card">
            <Empty
              icon={I.box}
              title="No services yet"
              text="Once your payment is approved, your service shows up here."
              action={<Link to="/portal/store" className="dash-btn primary sm">Browse plans {I.arrow}</Link>}
            />
          </div>
        )
      )}
    </>
  );
}