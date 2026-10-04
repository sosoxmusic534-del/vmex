import { useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Carrier, Inbound, SniPackage } from "../../lib/types";
import { Empty, ErrorBox, I, Notice, PageHead, Skeleton, Spinner, errMsg, toast } from "../../components/portal/ui";

function CarrierRow({ carrier, onDone }: { carrier?: Carrier; onDone: () => void }) {
  const [form, setForm] = useState({ name: carrier?.name ?? "", logo: carrier?.logo ?? "/logos/", sort: carrier?.sort ?? 0, active: carrier?.active ?? true });
  const [busy, setBusy] = useState(false);
  const [imageOk, setImageOk] = useState(true);

  const save = async () => {
    setBusy(true);
    try {
      await api(carrier ? `/admin/carriers/${carrier.id}` : "/admin/carriers", {
        method: carrier ? "PUT" : "POST", body: JSON.stringify(form),
      });
      toast(`${form.name} saved`);
      onDone();
    } catch (error) { toast(errMsg(error), "error"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!carrier) return onDone();
    if (!confirm(`Delete ${carrier.name} and all of its packages?`)) return;
    try {
      await api(`/admin/carriers/${carrier.id}`, { method: "DELETE" });
      toast(`${carrier.name} deleted`);
      onDone();
    } catch (error) { toast(errMsg(error), "error"); }
  };

  return <tr>
    <td><div className="logo-preview">{form.logo && imageOk ? <img src={form.logo} alt="" onError={() => setImageOk(false)} onLoad={() => setImageOk(true)} /> : <span>—</span>}</div></td>
    <td><input className="dash-input" value={form.name} placeholder="Dialog" onChange={(event) => setForm({ ...form, name: event.target.value })} /></td>
    <td><input className="dash-input" value={form.logo} placeholder="/logos/dialog.png" onChange={(event) => { setImageOk(true); setForm({ ...form, logo: event.target.value }); }} /></td>
    <td><input className="dash-input" type="number" value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) })} /></td>
    <td><label className="switch"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><i /></label></td>
    <td><div className="row-actions">
      <button type="button" className="dash-btn sm primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : carrier ? "Save" : "Add"}</button>
      <button type="button" className="dash-btn sm danger" onClick={remove} aria-label="Delete">{carrier ? I.trash : I.x}</button>
    </div></td>
  </tr>;
}

function PackageRow({ pkg, carriers, inbounds, onDone }: { pkg?: SniPackage; carriers: Carrier[]; inbounds: Inbound[]; onDone: () => void }) {
  const [form, setForm] = useState({
    carrierId: pkg?.carrierId ?? carriers[0]?.id ?? 0,
    device: pkg?.device ?? "both", name: pkg?.name ?? "", sni: pkg?.sni ?? "", tag: pkg?.tag ?? "",
    inboundIds: pkg?.inboundIds ?? [], sort: pkg?.sort ?? 0, active: pkg?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const toggleInbound = (id: number) => setForm((current) => ({
    ...current, inboundIds: current.inboundIds.includes(id) ? current.inboundIds.filter((item) => item !== id) : [...current.inboundIds, id],
  }));

  const save = async () => {
    setBusy(true);
    try {
      await api(pkg ? `/admin/packages/${pkg.id}` : "/admin/packages", {
        method: pkg ? "PUT" : "POST", body: JSON.stringify(form),
      });
      toast(`${form.name} saved`);
      onDone();
    } catch (error) { toast(errMsg(error), "error"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!pkg) return onDone();
    if (!confirm(`Delete package "${pkg.name}"?`)) return;
    try {
      await api(`/admin/packages/${pkg.id}`, { method: "DELETE" });
      toast("Package deleted");
      onDone();
    } catch (error) { toast(errMsg(error), "error"); }
  };

  return <tr>
    <td><select className="dash-input" value={form.carrierId} onChange={(event) => setForm({ ...form, carrierId: Number(event.target.value) })}>{carriers.map((carrier) => <option key={carrier.id} value={carrier.id}>{carrier.name}</option>)}</select></td>
    <td><select className="dash-input" value={form.device} onChange={(event) => setForm({ ...form, device: event.target.value as SniPackage["device"] })}><option value="both">Both</option><option value="router">Router</option><option value="sim">SIM</option></select></td>
    <td><input className="dash-input" value={form.name} placeholder="Dialog Zoom" onChange={(event) => setForm({ ...form, name: event.target.value })} /></td>
    <td><input className="dash-input mono-input" value={form.sni} placeholder="sni.example.com" onChange={(event) => setForm({ ...form, sni: event.target.value })} /></td>
    <td><input className="dash-input" value={form.tag} placeholder="Popular" onChange={(event) => setForm({ ...form, tag: event.target.value })} /></td>
    <td><div className="inb-pick">{inbounds.length ? inbounds.map((inbound) => {
      const active = form.inboundIds.includes(inbound.id);
      return <button key={inbound.id} type="button" className={`inb-chip ${active ? "on" : ""}`} onClick={() => toggleInbound(inbound.id)} title={`${inbound.protocol} · port ${inbound.port}`}>
        {active && I.check} #{inbound.id} {inbound.remark || inbound.protocol}
      </button>;
    }) : <span className="sub">Connect X-UI first</span>}</div></td>
    <td><input className="dash-input" type="number" value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) })} /></td>
    <td><label className="switch"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><i /></label></td>
    <td><div className="row-actions">
      <button type="button" className="dash-btn sm primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : pkg ? "Save" : "Add"}</button>
      <button type="button" className="dash-btn sm danger" onClick={remove} aria-label="Delete">{pkg ? I.trash : I.x}</button>
    </div></td>
  </tr>;
}

export default function AdminNetwork() {
  const carriers = useFetch<{ carriers: Carrier[] }>("/admin/carriers");
  const packages = useFetch<{ packages: SniPackage[] }>("/admin/packages");
  const inbounds = useFetch<{ inbounds: Inbound[] }>("/admin/inbounds");
  const [addingCarrier, setAddingCarrier] = useState(false);
  const [addingPackage, setAddingPackage] = useState(false);
  const carrierList = carriers.data?.carriers ?? [];
  const inboundList = inbounds.data?.inbounds ?? [];

  return <>
    <PageHead eyebrow="ADMIN · CATALOG" title="Networks & Packages" sub="Manage checkout networks, SNI packages, and the X-UI inbounds used by each package." />
    <div className="dash-stack stagger">
      <section className="dash-card">
        <div className="dash-card-head"><div><h3 className="dash-h3">{I.globe} Carriers</h3><p className="dash-muted">Store logo files under public/logos and use their public path here.</p></div>
          <button type="button" className="dash-btn sm primary" onClick={() => setAddingCarrier(true)} disabled={addingCarrier}>{I.plus} Add carrier</button></div>
        {carriers.error && <ErrorBox message={carriers.error} onRetry={carriers.reload} />}
        {carriers.loading && !carriers.data ? <Skeleton height={160} /> : <div className="table-wrap flat" data-lenis-prevent>
          <table className="dash-table edit-table"><thead><tr><th>Logo</th><th>Name</th><th>Logo path</th><th>Sort</th><th>Active</th><th /></tr></thead>
            <tbody>{carrierList.map((carrier) => <CarrierRow key={carrier.id} carrier={carrier} onDone={() => { carriers.reload(); packages.reload(); }} />)}
              {addingCarrier && <CarrierRow onDone={() => { setAddingCarrier(false); carriers.reload(); }} />}</tbody>
          </table>
        </div>}
      </section>

      <section className="dash-card">
        <div className="dash-card-head"><div><h3 className="dash-h3">{I.link} SNI Packages</h3><p className="dash-muted">Selected inbounds create the customer on those X-UI routes; empty selections fall back to the plan inbounds.</p></div>
          <button type="button" className="dash-btn sm primary" onClick={() => setAddingPackage(true)} disabled={addingPackage || !carrierList.length}>{I.plus} Add package</button></div>
        {inbounds.error && <Notice tone="warn"><p>{inbounds.error}</p></Notice>}
        {packages.error && <ErrorBox message={packages.error} onRetry={packages.reload} />}
        {packages.loading && !packages.data ? <Skeleton height={200} /> : packages.data?.packages.length || addingPackage ? <div className="table-wrap flat" data-lenis-prevent>
          <table className="dash-table edit-table"><thead><tr><th>Carrier</th><th>Device</th><th>Name</th><th>SNI</th><th>Tag</th><th>Inbounds</th><th>Sort</th><th>Active</th><th /></tr></thead>
            <tbody>{packages.data?.packages.map((pkg) => <PackageRow key={pkg.id} pkg={pkg} carriers={carrierList} inbounds={inboundList} onDone={packages.reload} />)}
              {addingPackage && <PackageRow carriers={carrierList} inbounds={inboundList} onDone={() => { setAddingPackage(false); packages.reload(); }} />}</tbody>
          </table>
        </div> : <Empty icon={I.link} title="No packages yet" text="Add an SNI package so customers can select it at checkout." />}
      </section>
    </div>
  </>;
}
