import { useState } from "react";
import type { Plan } from "../../lib/types";
import CheckoutModal from "../../components/portal/CheckoutModal";
import { ErrorBox, I, PageHead, Skeleton } from "../../components/portal/ui";
import { useFetch } from "../../lib/useFetch";

export default function Store() {
  const { data, loading, error, reload } = useFetch<{ plans: Plan[] }>("/portal/plans");
  const [selected, setSelected] = useState<Plan | null>(null);

  return <>
    <PageHead eyebrow="PLANS" title="Choose a Plan" sub="Choose your network and package, then select a payment method." />
    {error && <ErrorBox message={error} onRetry={reload} />}
    {loading && !data ? <div className="store-grid">{[0, 1, 2].map((index) => <Skeleton key={index} height={380} />)}</div> : (
      <div className="store-grid stagger">
        {data?.plans.map((plan) => {
          const popular = plan.dataGb === 0;
          return <article key={plan.id} className={`dash-card hover store-card ${popular ? "popular" : ""}`}>
            {popular && <span className="store-tag">MOST POPULAR</span>}
            <span className="chip">{plan.protocols}</span>
            <h3>{plan.name}</h3>
            <p className="dash-muted">{plan.description}</p>
            <div className="store-price"><span>LKR</span><b>{plan.price}</b><span>/ {plan.days} days</span></div>
            <ul className="store-feats">
              <li>{I.zap} {plan.dataGb ? `${plan.dataGb} GB High Speed Data` : "Unlimited Bandwidth"}</li>
              <li>{I.check} {plan.days} Days Validity</li>
              <li>{I.check} Choose from available network packages</li>
              <li>{I.check} Pay with wallet for instant activation</li>
            </ul>
            <button type="button" className={`dash-btn ${popular ? "primary" : ""}`} onClick={() => setSelected(plan)}>
              Purchase Now {I.arrow}
            </button>
          </article>;
        })}
      </div>
    )}
    {selected && <CheckoutModal plan={selected} onClose={() => setSelected(null)} />}
  </>;
}
