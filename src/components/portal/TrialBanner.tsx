import { useEffect, useState } from "react";
import GiftIcon from "../GiftIcon";
import { gapi } from "../../lib/gifts";

type Carrier = { id: number; name: string; logo: string };
type Pkg = { id: number; carrier_id: number; device: string; name: string; tag: string };
type TrialInfo = {
  state: "eligible" | "pending" | "active" | "used" | "not_new" | "blocked";
  reason?: string;
  trial: { gb: number; days: number };
  options?: { carriers: Carrier[]; packages: Pkg[] };
};

const HIDE_KEY = "vmex_trial_hidden";

export default function TrialBanner() {
  const [info, setInfo] = useState<TrialInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const load = () => gapi<TrialInfo>("/trial").then(setInfo).catch(() => setInfo(null));
  useEffect(() => {
    load();
  }, []);

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!info) return null;

  if (info.state === "pending") {
    return (
      <div className="trl-banner is-pending">
        <span className="trl-icon"><GiftIcon /></span>
        <div className="trl-text">
          <b>Your free trial is being activated</b>
          <span>We're setting up your {info.trial.gb}GB trial. It will appear in Services and Configs once it's ready.</span>
        </div>
      </div>
    );
  }

  if (info.state !== "eligible" || hidden) return null;

  return (
    <>
      <div className="trl-banner">
        <span className="trl-glow" aria-hidden="true" />
        <span className="trl-icon"><GiftIcon /></span>
        <div className="trl-text">
          <b>New here? Get {info.trial.gb}GB free</b>
          <span>Try VMEX free for {info.trial.days} days. No payment needed, one trial per customer.</span>
        </div>
        <div className="trl-actions">
          <button type="button" className="trl-btn" onClick={() => setOpen(true)}>Claim free trial</button>
          <button type="button" className="trl-close" onClick={hide} aria-label="Hide">×</button>
        </div>
      </div>
      {open && info.options && (
        <TrialModal info={info} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
      )}
    </>
  );
}

function TrialModal({ info, onClose, onDone }: { info: TrialInfo; onClose: () => void; onDone: () => void }) {
  const { carriers, packages } = info.options!;
  const [device, setDevice] = useState<"sim" | "router">("sim");
  const [carrierId, setCarrierId] = useState<number | null>(carriers[0]?.id ?? null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const list = packages.filter(
    (p) => p.carrier_id === carrierId && (p.device === "both" || p.device === device)
  );

  const claim = async () => {
    if (!packageId) return setError("Choose your package.");
    setBusy(true);
    setError("");
    try {
      await gapi("/trial", { method: "POST", body: { device, packageId } });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="trl-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="trl-box" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="trl-done">
            <span className="trl-icon big"><GiftIcon /></span>
            <h2>Trial requested</h2>
            <p>Your {info.trial.gb}GB free trial is being activated. You'll find your config in Configs as soon as it's ready.</p>
            <button type="button" className="trl-btn" onClick={onDone}>Got it</button>
          </div>
        ) : (
          <>
            <h2>Claim your {info.trial.gb}GB free trial</h2>
            <p className="trl-sub">Valid for {info.trial.days} days. Pick the network you'll use it on.</p>

            <span className="trl-label">Device</span>
            <div className="trl-seg">
              <button type="button" className={device === "sim" ? "is-active" : ""} onClick={() => { setDevice("sim"); setPackageId(null); }}>Phone (SIM)</button>
              <button type="button" className={device === "router" ? "is-active" : ""} onClick={() => { setDevice("router"); setPackageId(null); }}>Router / Wi-Fi</button>
            </div>

            <span className="trl-label">Network</span>
            <div className="trl-carriers">
              {carriers.map((c) => (
                <button key={c.id} type="button" className={`trl-carrier${carrierId === c.id ? " is-active" : ""}`}
                  onClick={() => { setCarrierId(c.id); setPackageId(null); }}>
                  {c.logo && <img src={c.logo} alt="" />}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            <span className="trl-label">Package</span>
            <div className="trl-packages">
              {list.length === 0 && <p className="trl-sub">No packages for this network yet.</p>}
              {list.map((p) => (
                <button key={p.id} type="button" className={`trl-pkg${packageId === p.id ? " is-active" : ""}`} onClick={() => setPackageId(p.id)}>
                  <span>{p.name}</span>
                  {p.tag && <small>{p.tag}</small>}
                </button>
              ))}
            </div>

            {error && <p className="trl-error">{error}</p>}
            <div className="trl-foot">
              <button type="button" className="trl-ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="trl-btn" onClick={claim} disabled={busy || !packageId}>
                {busy ? "Checking…" : "Claim free trial"}
              </button>
            </div>
            <p className="trl-note">One free trial per customer, device and network. Please turn off any VPN while claiming.</p>
          </>
        )}
      </div>
    </div>
  );
}