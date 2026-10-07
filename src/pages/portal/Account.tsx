import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, apiUpload } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate, formatLKR, toDate } from "../../lib/format";
import { getRank, RANKS } from "../../lib/ranks";
import type { CreditTx, Topup } from "../../lib/types";
import { useAuth, type User } from "../../context/AuthContext";
import UserAvatar from "../../components/portal/UserAvatar";
import ReceiptPicker from "../../components/portal/ReceiptPicker";
import TopupModal from "../../components/portal/TopupModal";
import DiscordLinkCard from "../../components/portal/DiscordLinkCard";
import { CountUp, Empty, ErrorBox, I, Notice, PageSkeleton, Progress, Spinner, StatusBadge, errMsg, toast } from "../../components/portal/ui";

type AccountData = {
  user: User;
  stats: { completedOrders: number; totalSpent: number; activeServices: number; openTickets: number };
};

const rankIcon: Record<string, ReactNode> = {
  bronze: I.medal, silver: I.star, gold: I.trophy, platinum: I.gem, diamond: I.crown,
};
const txLabel: Record<CreditTx["type"], string> = {
  topup: "Top-up", purchase: "Purchase", refund: "Refund", admin: "Adjustment",
};

function TopupRow({ t, onChanged }: { t: Topup; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!t.hasReceipt || t.status === "rejected");
  const actionable = t.status === "pending" || t.status === "rejected";

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("receipt", file);
      await apiUpload(`/account/topups/${t.id}/receipt`, form);
      toast("Slip uploaded — we'll check it soon");
      setFile(null);
      setOpen(false);
      onChanged();
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!confirm(`Cancel top-up #${t.reference}?`)) return;
    try {
      await api(`/account/topups/${t.id}/cancel`, { method: "POST" });
      toast("Top-up cancelled");
      onChanged();
    } catch (cause) {
      toast(errMsg(cause), "error");
    }
  };

  return (
    <div className={`topup-row ${t.status}`}>
      <div className="topup-row-head">
        <div><b>#{t.reference}</b><small>{formatDate(t.createdAt)} · {t.paymentMethod ?? "—"}</small></div>
        <div className="topup-row-side"><b>{formatLKR(t.amount)}</b><StatusBadge status={t.status} /></div>
      </div>
      {t.status === "rejected" && t.rejectReason && <Notice tone="error"><p><b>Reason:</b> {t.rejectReason}</p></Notice>}
      {actionable && t.hasReceipt && !open && (
        <div className="receipt-status">
          {I.check}<span>Slip received — waiting for approval.</span>
          {t.receiptUrl && <a className="dash-btn sm" href={t.receiptUrl} target="_blank" rel="noreferrer">{I.eye} View</a>}
          <button type="button" className="dash-btn sm" onClick={() => setOpen(true)}>Replace</button>
        </div>
      )}
      {actionable && open && (
        <div className="topup-upload">
          {t.instructions && <pre className="pay-instructions">{t.instructions}</pre>}
          <ReceiptPicker file={file} onChange={setFile} />
          <div className="form-actions">
            <button type="button" className="dash-btn primary sm" onClick={upload} disabled={!file || busy}>
              {busy ? <Spinner /> : <>{I.upload} Upload slip</>}
            </button>
            {t.status === "pending" && <button type="button" className="dash-btn sm danger" onClick={cancel}>Cancel top-up</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Account() {
  const { refresh } = useAuth();
  const account = useFetch<AccountData>("/account");
  const credit = useFetch<{ balance: number; transactions: CreditTx[] }>("/account/credit");
  const topups = useFetch<{ topups: Topup[] }>("/account/topups");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  const reloadAll = () => {
    account.reload();
    credit.reload();
    topups.reload();
    refresh();
  };

  if (account.error) return <ErrorBox message={account.error} onRetry={account.reload} />;
  if (account.loading && !account.data) return <PageSkeleton />;
  if (!account.data) return null;

  const { user, stats } = account.data;
  const rank = getRank(stats.completedOrders);
  const balance = credit.data?.balance ?? user.balance;
  const memberSince = toDate(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const saveName = async () => {
    setSavingName(true);
    try {
      await api("/account", { method: "PATCH", body: JSON.stringify({ name }) });
      toast("Name updated");
      setEditing(false);
      reloadAll();
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (pw.next !== pw.confirm) return toast("New passwords don't match", "error");
    setSavingPw(true);
    try {
      await api("/account/password", { method: "POST", body: JSON.stringify({ current: pw.current, next: pw.next }) });
      toast("Password changed");
      setPw({ current: "", next: "", confirm: "" });
    } catch (cause) {
      toast(errMsg(cause), "error");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="dash-stack stagger">
      <div className="dash-card acc-head">
        <div className="acc-banner" />
        <div className="acc-head-body">
          <UserAvatar seed={user.email} name={user.name} size="xl" />
          <div className="acc-head-info">
            <div className="acc-name-row">
              {editing ? (
                <div className="acc-name-edit">
                  <input className="dash-input" value={name} maxLength={50} autoFocus onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") saveName(); if (event.key === "Escape") setEditing(false); }} />
                  <button type="button" className="dash-btn sm primary" onClick={saveName} disabled={savingName || name.trim().length < 2}>{savingName ? <Spinner /> : "Save"}</button>
                  <button type="button" className="dash-btn sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              ) : <>
                <h1>{user.name}</h1>
                <button type="button" className="acc-edit" aria-label="Edit name" onClick={() => { setName(user.name); setEditing(true); }}>{I.edit}</button>
                <span className={`rank-badge ${rank.current.key}`}>{rankIcon[rank.current.key]} {rank.current.name}</span>
                {user.role !== "customer" && <span className={`role-tag ${user.role}`}>{user.role}</span>}
              </>}
            </div>
            <p className="acc-meta">{I.history} Member since {memberSince}</p>
            <p className="acc-meta">{I.mail} {user.email}</p>
          </div>
        </div>
      </div>

      <div className="acc-grid">
        <div className="dash-card">
          <h3 className="dash-h3">{I.trophy} Rank Progress</h3>
          <div className="rank-now">
            <span className={`rank-icon ${rank.current.key}`}>{rankIcon[rank.current.key]}</span>
            <div><b className={`rank-text ${rank.current.key}`}>{rank.current.name}</b><small>Current rank</small></div>
            {rank.next && <div className="rank-next"><b>{rankIcon[rank.next.key]} {rank.next.name}</b><small>Next rank</small></div>}
          </div>
          <div className="rank-bar-labels"><span className={`rank-text ${rank.current.key}`}>{rank.current.name}</span><span>{rank.next?.name ?? "Max rank"}</span></div>
          <Progress value={rank.progress} small />
          <p className="rank-hint">{rank.next ? `${rank.remaining} more purchase${rank.remaining === 1 ? "" : "s"} to reach ${rank.next.name}` : "You've reached the highest rank 🎉"}</p>
          <div className="rank-all"><small>All ranks</small><div>{RANKS.map((item) => (
            <span key={item.key} className={`rank-chip ${item.key} ${item.key === rank.current.key ? "on" : ""}`}>{rankIcon[item.key]} {item.name} <em>({item.min}+)</em></span>
          ))}</div></div>
        </div>

        <div className="dash-card">
          <h3 className="dash-h3">{I.chart} Statistics</h3>
          <div className="stat-tiles">
            <div><b><CountUp value={stats.completedOrders} /></b><span>Completed orders</span></div>
            <div><b><CountUp value={stats.activeServices} /></b><span>Active services</span></div>
            <div><b><CountUp value={stats.totalSpent} format={(value) => formatLKR(value).replace(".00", "")} /></b><span>Total spent</span></div>
            <div><b><CountUp value={stats.openTickets} /></b><span>Open tickets</span></div>
          </div>
          <div className="credit-wrap">
            <div className="credit-card">
              <div className="credit-top"><small>STORE CREDIT</small><span className="credit-logo">VM</span></div>
              <small className="credit-label">BALANCE</small>
              <b className="credit-amount"><CountUp value={balance} format={(value) => formatLKR(value)} /></b>
              <div className="credit-foot"><div><small>HOLDER</small><span>{user.name}</span></div><div><small>SINCE</small><span>{toDate(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div></div>
            </div>
            <div className="credit-actions">
              <button type="button" className="dash-btn primary" onClick={() => setTopupOpen(true)}>{I.wallet} Top up credit</button>
              <a href="#credit-history" className="dash-btn">{I.history} Credit history</a>
              <Link to="/portal/invoices" className="dash-btn">{I.file} Purchase history</Link>
              <Link to="/portal/store" className="dash-btn">{I.store} Buy a plan</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-head"><h3 className="dash-h3">{I.wallet} My Top-ups</h3><button type="button" className="dash-btn sm primary" onClick={() => setTopupOpen(true)}>{I.plus} New top-up</button></div>
        {topups.data?.topups.length ? <div className="topup-list">{topups.data.topups.map((item) => <TopupRow key={item.id} t={item} onChanged={reloadAll} />)}</div>
          : <Empty icon={I.wallet} title="No top-ups yet" text="Add credit to buy plans instantly with your balance." />}
      </div>

      <div className="dash-card" id="credit-history">
        <h3 className="dash-h3" style={{ marginBottom: 18 }}>{I.history} Credit History</h3>
        {credit.data?.transactions.length ? <div className="table-wrap flat" data-lenis-prevent><table className="dash-table"><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th><th>Balance</th></tr></thead><tbody>
          {credit.data.transactions.map((item, index) => <tr key={item.id} style={{ animationDelay: `${index * 0.03}s` }}><td>{formatDate(item.createdAt)}</td><td><span className={`tx-type ${item.type}`}>{txLabel[item.type]}</span></td><td>{item.note || "—"}</td><td><b className={`tx-amount ${item.amount >= 0 ? "pos" : "neg"}`}>{item.amount >= 0 ? "+" : "−"}{formatLKR(Math.abs(item.amount))}</b></td><td>{formatLKR(item.balanceAfter)}</td></tr>)}
        </tbody></table></div> : <Empty icon={I.history} title="No credit activity yet" text="Top-ups and balance purchases will show here." />}
      </div>

      <DiscordLinkCard />

      <form className="dash-card" onSubmit={changePassword}>
        <h3 className="dash-h3">{I.key} Change Password</h3>
        <div className="form-grid" style={{ marginTop: 18 }}>
          <label className="dash-field full"><span>Current password</span><input className="dash-input" type="password" autoComplete="current-password" value={pw.current} onChange={(event) => setPw({ ...pw, current: event.target.value })} /></label>
          <label className="dash-field"><span>New password</span><input className="dash-input" type="password" autoComplete="new-password" value={pw.next} onChange={(event) => setPw({ ...pw, next: event.target.value })} /></label>
          <label className="dash-field"><span>Confirm new password</span><input className="dash-input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(event) => setPw({ ...pw, confirm: event.target.value })} /></label>
        </div>
        <div className="form-actions"><button type="submit" className="dash-btn primary" disabled={savingPw || !pw.current || pw.next.length < 8}>{savingPw ? <Spinner /> : <>{I.key} Update password</>}</button></div>
      </form>
      {topupOpen && <TopupModal onClose={() => setTopupOpen(false)} onDone={reloadAll} />}
    </div>
  );
}
