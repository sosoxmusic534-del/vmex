import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GiftCardArt from "../components/GiftCardArt";
import GiftIcon from "../components/GiftIcon";
import { gapi, lkr, refreshUser } from "../lib/gifts";
import type { GiftView } from "../lib/gifts";

export default function GiftClaim() {
  const { token = "" } = useParams();
  const auth = useAuth();
  const user = auth.user;
  const navigate = useNavigate();

  const [gift, setGift] = useState<GiftView | null>(null);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);

  useEffect(() => {
    gapi<{ gift: GiftView }>(`/gifts/claim/${encodeURIComponent(token)}`)
      .then((r) => {
        setGift(r.gift);
        if (r.gift.status !== "available") setOpened(true);
        document.title = `${lkr(r.gift.amount)} VMEX Gift Card`;
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const back = { from: `/gift/${token}` };

  const claim = async () => {
    if (!user) {
      navigate("/portal/login", { state: back });
      return;
    }
    setClaiming(true);
    setError("");
    try {
      const r = await gapi<{ amount: number }>(`/gifts/claim/${encodeURIComponent(token)}`, { method: "POST" });
      setClaimed(r.amount);
      refreshUser(auth);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  const status = claimed !== null ? "claimed" : gift?.status ?? "available";

  return (
    <div className="gfc">
      <div className="gfc-bg" aria-hidden="true"><span /><span /><span /></div>

      <header className="gfc-top">
        <Link to="/" className="gfc-brand"><img src="/logo.png" alt="" />VMEX</Link>
        {user ? (
          <Link to="/portal" className="gfc-pill">Dashboard</Link>
        ) : (
          <Link to="/portal/login" state={back} className="gfc-pill">Log in</Link>
        )}
      </header>

      <main className="gfc-main">
        {!gift && !error && <div className="gfc-loading"><span /> Opening your gift…</div>}

        {!gift && error && (
          <div className="gfc-missing">
            <GiftIcon className="gfc-missing-icon" />
            <h1 className="gfc-title">Gift not found</h1>
            <p className="gfc-small">{error}</p>
            <Link to="/" className="gfc-btn">Go to VMEX</Link>
          </div>
        )}

        {gift && (
          <>
            <span className="gfc-kicker">
              <GiftIcon /> {gift.fromName ? `${gift.fromName} sent you a gift` : "You've received a gift"}
            </span>
            <h1 className="gfc-title">
              {claimed !== null ? <>It's <em>yours</em></> : opened ? <><em>{lkr(gift.amount)}</em> of fast internet</> : <>Something's <em>waiting</em> for you</>}
            </h1>

            <div className={`gfc-stage${opened ? " is-open" : ""}`}>
              <button type="button" className="gfc-wrap" onClick={() => setOpened(true)} aria-label="Open your gift">
                <span className="gfc-ribbon-v" />
                <span className="gfc-ribbon-h" />
                <span className="gfc-bow" />
                <span className="gfc-wrap-label">Tap to open</span>
              </button>
              <div className="gfc-reveal">
                <GiftCardArt design={gift.design} amount={gift.amount} toName={gift.toName}
                  fromName={gift.fromName} size="lg" tilt status={status} />
              </div>
              {claimed !== null && (
                <div className="gft-confetti" aria-hidden="true">
                  {Array.from({ length: 40 }).map((_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
                </div>
              )}
            </div>

            {opened && (
              <div className="gfc-actions">
                {gift.message && (
                  <blockquote className="gfc-message">
                    “{gift.message}”
                    <cite>— {gift.fromName || "Your friend"}</cite>
                  </blockquote>
                )}

                {claimed !== null ? (
                  <>
                    <p className="gfc-success">{lkr(claimed)} added to your balance</p>
                    <div className="gfc-row">
                      <Link to="/portal/store" className="gfc-btn">Buy a plan</Link>
                      <Link to="/portal" className="gfc-btn ghost">Go to dashboard</Link>
                    </div>
                  </>
                ) : gift.status === "available" ? (
                  <>
                    <button type="button" className="gfc-btn" onClick={claim} disabled={claiming}>
                      {claiming ? "Claiming…" : user ? `Claim ${lkr(gift.amount)}` : "Log in to claim"}
                    </button>
                    {!user && (
                      <p className="gfc-small">
                        New to VMEX? <Link to="/portal/register" state={back}>Create a free account</Link> to claim it.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="gfc-small">
                      {gift.status === "claimed" ? "This gift card has already been claimed." : "This gift card is no longer available."}
                    </p>
                    <Link to="/" className="gfc-btn ghost">Explore VMEX</Link>
                  </>
                )}
                {error && <p className="gfc-error">{error}</p>}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="gfc-foot">VMEX · Fast, private V2Ray</footer>
    </div>
  );
}