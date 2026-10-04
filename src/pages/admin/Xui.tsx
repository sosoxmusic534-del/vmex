import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatBytes } from "../../lib/format";
import type { Plan } from "../../lib/types";
import { Empty, I, Notice, PageHead, Progress, Skeleton, Spinner, errMsg, toast } from "../../components/portal/ui";

type XuiSettings = {
  url: string;
  authMode: "password" | "token";
  username: string;
  hasPassword: boolean;
  hasToken: boolean;
  subUrl: string;
  insecure: boolean;
};
type Inbound = {
  id: number; remark: string; protocol: string; port: number;
  enable: boolean; up: number; down: number; total: number; clients: number;
};

export default function AdminXui() {
  const settings = useFetch<XuiSettings>("/admin/xui");
  const inbounds = useFetch<{ inbounds: Inbound[] }>("/admin/inbounds");
  const plans = useFetch<{ plans: Plan[] }>("/admin/plans");

  const [form, setForm] = useState({
    url: "",
    authMode: "password" as "password" | "token",
    username: "",
    password: "",
    token: "",
    subUrl: "",
    insecure: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (settings.data) {
      const { url, authMode, username, subUrl, insecure } = settings.data;
      setForm((f) => ({ ...f, url, authMode, username, subUrl, insecure, password: "", token: "" }));
    }
  }, [settings.data]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const r = await api<{ inbounds: number }>("/admin/xui/test", { method: "POST" });
      setStatus({ ok: true, msg: `Connected · ${r.inbounds} inbound${r.inbounds === 1 ? "" : "s"} found` });
      inbounds.reload();
    } catch (e) {
      setStatus({ ok: false, msg: errMsg(e) });
    } finally {
      setTesting(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/admin/xui", { method: "PUT", body: JSON.stringify(form) });
      toast("X-UI settings saved");
      settings.reload();
      await test();
    } catch (err) {
      toast(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const maxTraffic = Math.max(1, ...(inbounds.data?.inbounds.map((i) => i.up + i.down) ?? [1]));

  return (
    <>
      <PageHead eyebrow="ADMIN · 3X-UI" title="X-UI Panel" sub="Connect your 3x-ui panel so configs are created automatically." />

      <div className="dash-stack stagger">
        {/* Connection */}
        <form className="dash-card" onSubmit={save}>
          <div className="dash-card-head">
            <h3 className="dash-h3">{I.plug} Panel Connection</h3>
            <span className={`conn ${status ? (status.ok ? "ok" : "bad") : "idle"}`}>
              <i /> {status ? (status.ok ? "Connected" : "Failed") : "Not tested"}
            </span>
          </div>

          {settings.loading && !settings.data ? (
            <Skeleton height={200} />
          ) : (
            <>
              <div className="form-grid">
                <label className="dash-field full">
                  <span>Panel URL (including base path)</span>
                  <input className="dash-input" value={form.url} onChange={set("url")}
                    placeholder="https://your-server-ip:2053/your-base-path" required />
                  <small>The same address you open the 3x-ui panel with, without /panel at the end.</small>
                </label>
                <div className="dash-field full">
                  <span>Login method</span>
                  <div className="tabs" style={{ marginBottom: 0, alignSelf: "flex-start" }}>
                    <button type="button"
                      className={`tab ${form.authMode === "password" ? "active" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, authMode: "password" }))}>
                      Username &amp; Password
                    </button>
                    <button type="button"
                      className={`tab ${form.authMode === "token" ? "active" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, authMode: "token" }))}>
                      API Token
                    </button>
                  </div>
                </div>

                {form.authMode === "password" ? (
                  <>
                    <label className="dash-field">
                      <span>Username</span>
                      <input className="dash-input" value={form.username} onChange={set("username")}
                        autoComplete="off" required />
                    </label>
                    <label className="dash-field">
                      <span>Password</span>
                      <input className="dash-input" type="password" value={form.password} onChange={set("password")}
                        autoComplete="new-password"
                        placeholder={settings.data?.hasPassword ? "Saved (leave blank to keep)" : ""} />
                    </label>
                  </>
                ) : (
                  <label className="dash-field full">
                    <span>API Token</span>
                    <input className="dash-input" type="password" value={form.token} onChange={set("token")}
                      autoComplete="off"
                      placeholder={settings.data?.hasToken ? "Saved (leave blank to keep)" : "Paste your 3x-ui API token"} />
                    <small>Sent as <code>Authorization: Bearer &lt;token&gt;</code>. No login request is made.</small>
                  </label>
                )}
                <label className="dash-field full">
                  <span>Subscription URL</span>
                  <input className="dash-input" value={form.subUrl} onChange={set("subUrl")}
                    placeholder="https://your-server-ip:2096/sub" />
                  <small>From 3x-ui → Panel Settings → Subscription. Customers get this URL + their sub ID.</small>
                </label>
              </div>

              <div className="form-actions">
                <label className="switch">
                  <input type="checkbox" checked={form.insecure} onChange={set("insecure")} />
                  <i />
                  Allow self-signed / IP-address SSL (turn off if your panel uses a real domain certificate)
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="dash-btn primary" disabled={saving}>
                  {saving ? <Spinner /> : <>{I.check} Save & Connect</>}
                </button>
                <button type="button" className="dash-btn" onClick={test} disabled={testing || !settings.data?.url}>
                  {testing ? <Spinner /> : <>{I.pulse} Test Connection</>}
                </button>
                {status && <span className={`conn-msg ${status.ok ? "ok" : "bad"}`}>{status.msg}</span>}
              </div>
            </>
          )}
        </form>

        {/* Inbounds */}
        <div className="dash-card">
          <div className="dash-card-head">
            <h3 className="dash-h3">{I.server} Inbounds</h3>
            <button type="button" className="dash-btn sm" onClick={inbounds.reload}>{I.refresh} Refresh</button>
          </div>

          {inbounds.error ? (
            <Notice tone="warn"><p>{inbounds.error}</p></Notice>
          ) : inbounds.loading && !inbounds.data ? (
            <Skeleton height={140} />
          ) : inbounds.data?.inbounds.length ? (
            <div className="inb-list">
              {inbounds.data.inbounds.map((ib, i) => (
                <div key={ib.id} className={`inb ${ib.enable ? "" : "off"}`} style={{ animationDelay: `${i * 0.06}s` }}>
                  <div>
                    <b>#{ib.id} · {ib.remark || "Untitled"}</b>
                    <small><span className="chip">{ib.protocol}</span> Port {ib.port} · {ib.clients} clients</small>
                  </div>
                  <div className="inb-traffic">
                    <small><span>↑ {formatBytes(ib.up)} · ↓ {formatBytes(ib.down)}</span><b>{formatBytes(ib.up + ib.down)}</b></small>
                    <Progress value={((ib.up + ib.down) / maxTraffic) * 100} small />
                  </div>
                  <span className={`conn ${ib.enable ? "ok" : "bad"}`}><i /> {ib.enable ? "Enabled" : "Disabled"}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={I.server} title="No inbounds found" text="Create a VLESS, VMess or Trojan inbound in your 3x-ui panel first." />
          )}
        </div>

        {/* Plan mapping */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-h3">{I.store} Plans → Inbounds</h3>
              <p className="dash-muted">
                Tick one or more inbounds (e.g. your SG and IN inbounds). The customer gets one client on all of them,
                with one subscription link and one shared data quota. Data 0 = unlimited.
              </p>
            </div>
          </div>

          {plans.loading && !plans.data ? (
            <Skeleton height={160} />
          ) : (
            <div className="table-wrap flat" data-lenis-prevent>
              <table className="dash-table">
                <thead>
                  <tr><th>Plan</th><th>Inbounds</th><th>Price (LKR)</th><th>Data (GB)</th><th>Days</th><th>Active</th><th /></tr>
                </thead>
                <tbody>
                  {plans.data?.plans.map((p) => (
                    <PlanRow key={p.id} plan={p} inbounds={inbounds.data?.inbounds ?? []} onSaved={plans.reload} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PlanRow({ plan, inbounds, onSaved }: { plan: Plan; inbounds: Inbound[]; onSaved: () => void }) {
  const [f, setF] = useState({
    inboundIds: plan.inboundIds ?? [],
    price: plan.price,
    dataGb: plan.dataGb,
    days: plan.days,
    active: plan.active ?? true,
  });
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) =>
    setF((state) => ({
      ...state,
      inboundIds: state.inboundIds.includes(id) ? state.inboundIds.filter((value) => value !== id) : [...state.inboundIds, id],
    }));

  const save = async () => {
    setBusy(true);
    try {
      await api(`/admin/plans/${plan.id}`, { method: "PUT", body: JSON.stringify(f) });
      toast(`${plan.name} saved`);
      onSaved();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const num = (k: "price" | "dataGb" | "days") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: Number(e.target.value) }));

  return (
    <tr>
      <td><b>{plan.name}</b></td>
      <td>
        <div className="inb-pick">
          {inbounds.length ? inbounds.map((ib) => {
            const selected = f.inboundIds.includes(ib.id);
            return (
              <button key={ib.id} type="button" className={`inb-chip ${selected ? "on" : ""}`}
                onClick={() => toggle(ib.id)} title={`${ib.protocol} · port ${ib.port}`}>
                {selected && I.check} #{ib.id} {ib.remark || ib.protocol}
              </button>
            );
          }) : <span className="sub">Connect X-UI to load inbounds</span>}
        </div>
      </td>
      <td><input className="dash-input" type="number" min={0} value={f.price} onChange={num("price")} /></td>
      <td><input className="dash-input" type="number" min={0} value={f.dataGb} onChange={num("dataGb")} /></td>
      <td><input className="dash-input" type="number" min={1} value={f.days} onChange={num("days")} /></td>
      <td>
        <label className="switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF((s) => ({ ...s, active: e.target.checked }))} />
          <i />
        </label>
      </td>
      <td>
        <button type="button" className="dash-btn sm primary" onClick={save} disabled={busy}>
          {busy ? <Spinner /> : "Save"}
        </button>
      </td>
    </tr>
  );
}