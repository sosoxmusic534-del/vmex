import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useFetch } from "../../lib/useFetch";
import type { Service } from "../../lib/types";
import { Empty, ErrorBox, I, Notice, PageHead, Skeleton, StatusBadge, toast } from "../../components/portal/ui";

type ConfigService = Service & { links: string[]; linksError: string | null };

/* Read protocol + display name from a v2ray link */
function parseLink(link: string) {
  const protocol = link.split("://")[0].toLowerCase();
  let name = "";

  if (protocol === "vmess") {
    try {
      let b64 = link.slice(8).trim().replace(/-/g, "+").replace(/_/g, "/");
      b64 += "=".repeat((4 - (b64.length % 4)) % 4);
      name = JSON.parse(atob(b64)).ps ?? "";
    } catch {
      /* ignore */
    }
  } else {
    const hash = link.indexOf("#");
    if (hash >= 0) {
      const raw = link.slice(hash + 1);
      try {
        name = decodeURIComponent(raw);
      } catch {
        name = raw;
      }
    }
  }

  const flag = /\b(sg|singapore)\b/i.test(name) ? "sg" : /\b(in|india|mumbai)\b/i.test(name) ? "in" : null;
  return { protocol, name: name || protocol.toUpperCase(), flag };
}

const copy = (text: string, msg = "Config copied!") =>
  navigator.clipboard
    .writeText(text)
    .then(() => toast(msg))
    .catch(() => toast("Couldn't copy. Please copy it manually.", "error"));

function ConfigItem({ link, index }: { link: string; index: number }) {
  const [showQr, setShowQr] = useState(index === 0);
  const { protocol, name, flag } = parseLink(link);

  return (
    <div className="cfg-item" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="cfg-item-head">
        <div className="cfg-item-title">
          {flag && <img src={`https://flagcdn.com/w40/${flag}.png`} alt="" className="cfg-flag" />}
          <div>
            <b>{name}</b>
            <span className="chip">{protocol}</span>
          </div>
        </div>
        <div className="cfg-item-actions">
          <button type="button" className={`dash-btn sm ${showQr ? "active-qr" : ""}`}
            onClick={() => setShowQr((s) => !s)} aria-expanded={showQr}>
            {I.grid} QR
          </button>
          <button type="button" className="dash-btn sm primary" onClick={() => copy(link)}>
            {I.copy} Copy
          </button>
        </div>
      </div>

      <code className="cfg-code" onClick={() => copy(link)} title="Click to copy">
        {link}
      </code>

      <div className={`cfg-qr-wrap ${showQr ? "open" : ""}`}>
        <div className="cfg-qr-inner">
          <div className="cfg-qr">
            <QRCodeSVG value={link} size={190} level="L" fgColor="#0a1f4d" bgColor="#ffffff" />
          </div>
          <p className="dash-muted">Scan with v2rayNG, Shadowrocket or v2rayN to import this config.</p>
        </div>
      </div>
    </div>
  );
}

export default function Configs() {
  const { data, loading, error, reload } = useFetch<{ configs: ConfigService[] }>("/portal/configs");

  return (
    <>
      <PageHead
        eyebrow="CONFIGS"
        title="My Configs"
        sub="Copy a config or scan its QR code in your V2Ray app."
        actions={<button type="button" className="dash-btn" onClick={reload}>{I.refresh} Refresh</button>}
      />

      {error && <ErrorBox message={error} onRetry={reload} />}

      {loading && !data ? (
        <Skeleton height={320} />
      ) : data?.configs.length ? (
        <div className="dash-stack stagger">
          {data.configs.map((s) => (
            <section key={s.id} className="dash-card cfg-service">
              <div className="dash-card-head">
                <div>
                  <h3 className="dash-h3">{I.sliders} {s.name}</h3>
                  <p className="dash-muted">
                    {s.links.length} config{s.links.length === 1 ? "" : "s"} available
                  </p>
                </div>
                <div className="cfg-item-actions">
                  <StatusBadge status={s.status} />
                  {s.links.length > 1 && (
                    <button type="button" className="dash-btn sm" onClick={() => copy(s.links.join("\n"), "All configs copied!")}>
                      {I.copy} Copy all
                    </button>
                  )}
                </div>
              </div>

              {s.status !== "active" && (
                <Notice tone="warn">
                  <p>This service is <b>{s.status}</b>, so these configs won't connect until it's renewed.</p>
                </Notice>
              )}

              {s.linksError ? (
                <Notice tone="error"><p>{s.linksError}</p></Notice>
              ) : s.links.length ? (
                <div className="cfg-list">
                  {s.links.map((link, i) => (
                    <ConfigItem key={link} link={link} index={i} />
                  ))}
                </div>
              ) : (
                <Empty icon={I.sliders} title="No configs found" text="Please contact support if this doesn't update soon." />
              )}

              <p className="cfg-steps">
                Import in <b>v2rayNG</b> (Android), <b>v2rayN</b> (Windows) or <b>Shadowrocket</b> (iOS).
                Need help? <Link to="/#how-it-works">View setup guides</Link>.
              </p>
            </section>
          ))}
        </div>
      ) : (
        !error && (
          <div className="dash-card">
            <Empty
              icon={I.sliders}
              title="No configs yet"
              text="Your configs appear here after your first plan is activated."
              action={<Link to="/portal/store" className="dash-btn primary sm">Browse plans {I.arrow}</Link>}
            />
          </div>
        )
      )}
    </>
  );
}