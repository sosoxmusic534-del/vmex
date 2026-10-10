import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFetch } from "../../lib/useFetch";
import GiftCardArt from "../../components/GiftCardArt";
import GiftIcon from "../../components/GiftIcon";
import { toast } from "../../components/portal/ui";
import {
  GIFT_DESIGNS, GIFT_MAX, GIFT_MIN, PRESET_AMOUNTS, STATUS_LABEL, gapi, lkr, refreshUser, toDate,
} from "../../lib/gifts";
import type { GiftDesign, MyGift } from "../../lib/gifts";

export default function Gifts() {
  const auth = useAuth();
  const user = auth.user as { name?: string; balance?: number } | null;
  const credit = useFetch<{ balance: number }>("/account/credit");
  const balance = Number(credit.data?.balance ?? user?.balance ?? 0);

  const [design, setDesign] = useState<GiftDesign>("aurora");
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState(user?.name ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<MyGift | null>(null);
  const [mine, setMine] = useState<MyGift[] | null>(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const value = custom ? Math.round(Number(custom)) || 0 : amount;
  const valid = value >= GIFT_MIN && value <= GIFT_MAX;
  const enough = balance >= value;

  const loadMine = () =>
    gapi<{ gifts: MyGift[] }>("/gifts/mine").then((r) => setMine(r.gifts)).catch(() => setMine([]));

  useEffect(() => {
    loadMine();
  }, []);

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(() => toast(`${what} copied!`)).catch(() => toast("Couldn't copy", "error"));

  const buy = async () => {
    if (!valid) return toast(`Choose between ${lkr(GIFT_MIN)} and ${lkr(GIFT_MAX)}`, "error");
    if (!enough) return toast("Not enough balance — top up first", "error");
    setBusy(true);
    try {
      const r = await gapi<{ gift: MyGift }>("/gifts", {
        method: "POST",
        body: { amount: value, design, toName, fromName, message },
      });
      setReady(r.gift);
      setToName("");
      setMessage("");
      refreshUser(auth);
      credit.reload();
      loadMine();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const redeem = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const r = await gapi<{ amount: number }>("/gifts/redeem", { method: "POST", body: { code } });
      toast(`${lkr(r.amount)} added to your balance!`);
      setCode("");
      refreshUser(auth);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="gft">
      {/* Hero */}
      <header className="gft-hero">
        <div>
          <span className="gft-kicker"><GiftIcon /> Gift cards</span>
          <h1>Give the gift of <em>fast, private</em> internet.</h1>
          <p>Buy a VMEX gift card with your balance and send it as a link or a code. They open it, tap claim, and it lands in their wallet.</p>
          <div className="gft-steps">
            <span><b>1</b> Pick a design</span>
            <span><b>2</b> Choose an amount</span>
            <span><b>3</b> Share the link</span>
          </div>
        </div>
        <div className="gft-fan" aria-hidden="true">
          <GiftCardArt design="neon" amount={2500} toName="Kasun" size="sm" />
          <GiftCardArt design="sunset" amount={5000} toName="Nethmi" size="sm" />
          <GiftCardArt design="aurora" amount={1000} toName="You" size="sm" />
        </div>
      </header>

      {/* Designer */}
      <section className="dash-card gft-builder">
        <div className="gft-form">
          <div>
            <span className="gft-label">Design</span>
            <div className="gft-designs">
              {GIFT_DESIGNS.map((d) => (
                <button key={d.id} type="button" onClick={() => setDesign(d.id)}
                  className={`gft-design gft-design--${d.id}${design === d.id ? " is-active" : ""}`}>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="gft-label">Amount</span>
            <div className="gft-amounts">
              {PRESET_AMOUNTS.map((a) => (
                <button key={a} type="button" className={`gft-amount${!custom && amount === a ? " is-active" : ""}`}
                  onClick={() => { setAmount(a); setCustom(""); }}>
                  {lkr(a)}
                </button>
              ))}
              <input className={`gft-input gft-custom${custom ? " is-active" : ""}`} inputMode="numeric"
                placeholder="Custom" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            </div>
            {custom && !valid && <small className="gft-hint">Between {lkr(GIFT_MIN)} and {lkr(GIFT_MAX)}</small>}
          </div>

          <div className="gft-row">
            <label>
              <span className="gft-label">To</span>
              <input className="gft-input" maxLength={32} placeholder="Their name" value={toName} onChange={(e) => setToName(e.target.value)} />
            </label>
            <label>
              <span className="gft-label">From</span>
              <input className="gft-input" maxLength={32} placeholder="Your name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </label>
          </div>

          <label>
            <span className="gft-label">Message (optional)</span>
            <textarea className="gft-input" maxLength={140} rows={3} placeholder="Enjoy fast internet on me"
              value={message} onChange={(e) => setMessage(e.target.value)} />
            <small className="gft-count">{message.length}/140</small>
          </label>
        </div>

        <aside className="gft-preview">
          <GiftCardArt design={design} amount={value} toName={toName} fromName={fromName} size="lg" tilt />
          <div className="gft-summary">
            <div><span>Gift card</span><b>{lkr(value)}</b></div>
            <div><span>Your balance</span><b>{lkr(balance)}</b></div>
            <div className={enough ? "" : "is-low"}><span>After purchase</span><b>{lkr(balance - value)}</b></div>
          </div>
          <button type="button" className="gft-buy" onClick={buy} disabled={busy || !valid || !enough}>
            {busy ? "Creating your gift…" : `Buy for ${lkr(value)}`}
          </button>
          {!enough && <Link to="/portal/account" className="gft-topup">Not enough balance — top up your wallet →</Link>}
        </aside>
      </section>

      {/* Redeem */}
      <section className="dash-card gft-redeem">
        <div>
          <h3 className="dash-h3"><GiftIcon /> Got a code?</h3>
          <p className="dash-muted">Redeem a gift card code to add it to your balance.</p>
        </div>
        <form onSubmit={redeem}>
          <input className="gft-input gft-code-input" placeholder="VMEX-XXXX-XXXX-XXXX" maxLength={24}
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button type="submit" className="dash-btn primary" disabled={redeeming || !code.trim()}>
            {redeeming ? "Checking…" : "Redeem"}
          </button>
        </form>
      </section>

      {/* Your gift cards */}
      <section className="dash-card">
        <div className="dash-card-head">
          <div>
            <h3 className="dash-h3">Your gift cards</h3>
            <p className="dash-muted">Gift cards you've bought. Each one can be claimed once.</p>
          </div>
        </div>
        {mine === null ? (
          <div className="skeleton" style={{ height: 120 }} />
        ) : mine.length === 0 ? (
          <p className="gft-empty">You haven't sent any gift cards yet. Make your first one above </p>
        ) : (
          <ul className="gft-list">
            {mine.map((g) => (
              <li key={g.id} className="gft-item">
                <GiftCardArt design={g.design} amount={g.amount} toName={g.toName} size="sm" status={g.status} />
                <div className="gft-item-info">
                  <b>{lkr(g.amount)}</b>
                  <span>For {g.toName || "anyone"} · {toDate(g.createdAt)}</span>
                  <span className={`gft-badge is-${g.status}`}>
                    {STATUS_LABEL[g.status]}{g.claimedAt ? ` · ${toDate(g.claimedAt)}` : ""}
                  </span>
                </div>
                {g.status === "available" && (
                  <div className="gft-actions">
                    {g.claimUrl && <button type="button" className="gft-mini" onClick={() => copy(g.claimUrl!, "Link")}>Copy link</button>}
                    <button type="button" className="gft-mini" onClick={() => copy(g.code, "Code")}>Copy code</button>
                    <button type="button" className="gft-mini accent" onClick={() => setReady(g)}>Share</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {ready && <GiftReady gift={ready} onClose={() => setReady(null)} copy={copy} />}
    </div>
  );
}

function GiftReady({ gift, onClose, copy }: { gift: MyGift; onClose: () => void; copy: (t: string, w: string) => void }) {
  const text = `🎁 I sent you a ${lkr(gift.amount)} VMEX gift card! Claim it here: ${gift.claimUrl ?? gift.code}`;
  const canShare = typeof navigator.share === "function";

  return (
    <div className="gft-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="gft-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="gft-confetti" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
        </div>
        <span className="gft-kicker"><GiftIcon /> Gift card ready</span>
        <h2>Your gift is ready to send</h2>
        <GiftCardArt design={gift.design} amount={gift.amount} toName={gift.toName} fromName={gift.fromName} size="md" tilt />

        {gift.claimUrl && (
          <div className="gft-copy">
            <small>Claim link</small>
            <div>
              <code>{gift.claimUrl}</code>
              <button type="button" className="gft-mini accent" onClick={() => copy(gift.claimUrl!, "Link")}>Copy</button>
            </div>
          </div>
        )}
        <div className="gft-copy">
          <small>Gift code</small>
          <div>
            <code>{gift.code}</code>
            <button type="button" className="gft-mini" onClick={() => copy(gift.code, "Code")}>Copy</button>
          </div>
        </div>

        <div className="gft-share">
          <a className="gft-wa" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          {canShare && (
            <button type="button" className="gft-mini accent"
              onClick={() => navigator.share({ title: "VMEX gift card", text, url: gift.claimUrl ?? undefined }).catch(() => {})}>
              Share…
            </button>
          )}
          <button type="button" className="gft-mini" onClick={onClose}>Done</button>
        </div>
        <p className="gft-note">Anyone with this link or code can claim it once. Keep it private until you send it.</p>
      </div>
    </div>
  );
}