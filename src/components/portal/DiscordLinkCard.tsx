import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import { formatDate } from "../../lib/format";
import { I, Notice, Spinner, errMsg, toast } from "./ui";

type DiscordInfo = {
  available: boolean;
  linked: boolean;
  discord: { id: string; username: string; avatarUrl: string; showing: string | null; linkedAt: string } | null;
};

const discordLogo = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 4.5A18 18 0 0 0 15.6 3l-.6 1.2a16.6 16.6 0 0 0-6 0L8.4 3A18 18 0 0 0 4 4.5C1.4 8.4.7 12.2 1 16a18 18 0 0 0 5.5 2.8l1.2-1.9a11.6 11.6 0 0 1-1.9-.9l.5-.4a12.9 12.9 0 0 0 11.4 0l.5.4c-.6.4-1.2.7-1.9.9l1.2 1.9A18 18 0 0 0 23 16c.4-4.4-.7-8.2-3-11.5zM8.7 13.7c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2zm6.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2z" />
  </svg>
);

export default function DiscordLinkCard() {
  const { data, loading, reload } = useFetch<DiscordInfo>("/discord/me");
  const [busy, setBusy] = useState(false);
  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const p = params.get("discord");
    if (!p) return;
    if (p === "link") {
      window.location.href = "/api/discord/link";
      return;
    }
    const reason = params.get("reason");
    if (p === "linked") toast("Discord connected!");
    if (p === "error") toast(`Discord error: ${reason ?? "please try again"}`, "error");
    if (p === "cancelled") toast("You cancelled the Discord approval", "error");
    navigate("/portal/account#discord", { replace: true });
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const sync = async () => {
    setBusy(true);
    try {
      await api("/discord/sync", { method: "POST" });
      toast("Discord updated");
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!confirm("Disconnect your Discord account from VMEX?")) return;
    try {
      await api("/discord/link", { method: "DELETE" });
      toast("Discord disconnected");
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const d = data?.discord;

  return (
    <div className="dash-card dl-card" id="discord">
      <div className="dash-card-head">
        <div>
          <h3 className="dash-h3"><span className="dl-mark">{discordLogo}</span> Discord</h3>
          <p className="dash-muted">Show VMEX on your Discord profile and get customer roles automatically.</p>
        </div>
        {data?.linked && <span className="conn ok"><i /> Connected</span>}
      </div>

      {loading && !data ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : !data?.available ? (
        <Notice tone="warn"><p>Discord linking isn't set up on this site yet.</p></Notice>
      ) : data.linked && d ? (
        <>
          <div className="dl-linked">
            <div className="dl-profile">
              <img src={d.avatarUrl} alt="" />
              <div>
                <b>{d.username}</b>
                <small>Linked {formatDate(d.linkedAt)}</small>
              </div>
            </div>
            <div className="dl-preview">
              <small>PROFILE CONNECTION</small>
              <div className="dl-conn">
                <img src="/logo.png" alt="" />
                <div>
                  <b>VMEX</b>
                  <span>{d.showing ?? "Updating…"}</span>
                </div>
                <span className="dl-verified">{I.check}</span>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="dash-btn sm" onClick={sync} disabled={busy}>
              {busy ? <Spinner /> : <>{I.refresh} Update now</>}
            </button>
            <button type="button" className="dash-btn sm danger" onClick={unlink}>Disconnect</button>
          </div>
        </>
      ) : (
        <div className="dl-empty">
          <ul>
            <li>{I.check} Your profile shows <b>VMEX · your plan</b> with a ✔</li>
            <li>{I.check} Get the <b>VMEX Customer</b> role in our server automatically</li>
            <li>{I.check} Want "Playing VMEX"? Use the VMEX desktop app</li>
          </ul>
          <button type="button" className="dl-btn" onClick={() => (window.location.href = "/api/discord/link")}>
            {discordLogo} Connect Discord
          </button>
        </div>
      )}
    </div>
  );
}