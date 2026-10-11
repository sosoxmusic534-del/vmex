import { useEffect, useMemo, useState } from "react";
import "./DownloadApp.css";

/* ===================== EDIT THESE ===================== */
const GITHUB_OWNER = "YOUR-GITHUB-NAME"; // e.g. "hnood"
const GITHUB_REPO = "vmex-client";
/* ====================================================== */

const REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
const RELEASES_URL = `${REPO_URL}/releases/latest`;

type Asset = { name: string; size: number; browser_download_url: string; download_count: number };
type Release = { tag_name: string; published_at: string; html_url: string; assets: Asset[] };

const SHOTS = [
  { id: "home", label: "Connect", src: "/app/home.webp", text: "One tap to connect. Live speed, ping and data used." },
  { id: "servers", label: "Servers", src: "/app/servers.webp", text: "Import any V2Ray link or subscription. Ping every server." },
  { id: "apps", label: "Apps", src: "/app/apps.webp", text: "Pick the games and apps that use VMEX. The rest stays direct." },
  { id: "account", label: "Account", src: "/app/account.webp", text: "Optional login: your VMEX plans appear automatically." },
  { id: "settings", label: "Settings", src: "/app/settings.webp", text: "Smart routing, auto-connect, start with Windows." },
  { id: "logs", label: "Logs", src: "/app/logs.webp", text: "Clear logs when you need help from support." },
];

const FEATURES = [
  { title: "Any V2Ray config", text: "VLESS, VMess, Trojan, Shadowsocks. Reality, WS, gRPC, XHTTP." },
  { title: "No login needed", text: "Paste a link and connect. Sign in only if you want your plans synced." },
  { title: "Whole PC or per app", text: "Route every game through VMEX, or only the apps you choose." },
  { title: "Smart routing", text: "Sri Lankan .lk sites and your local network stay direct." },
];

const mb = (b: number) => `${(b / 1048576).toFixed(0)} MB`;
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function DownloadApp() {
  const [release, setRelease] = useState<Release | null>(null);
  const [shot, setShot] = useState(0);
  const [zoom, setZoom] = useState(false);

  // Latest release from GitHub (falls back to the releases page if the API is unavailable)
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Release | null) => data && setRelease(data))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  // Auto-advance the screenshots until the visitor picks one
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setShot((s) => (s + 1) % SHOTS.length), 4500);
    return () => clearInterval(t);
  }, [auto]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const { installer, portable, downloads } = useMemo(() => {
    const assets = release?.assets ?? [];
    return {
      installer: assets.find((a) => /\.exe$/i.test(a.name) && !/portable/i.test(a.name)),
      portable: assets.find((a) => /portable.*\.exe$/i.test(a.name)),
      downloads: assets.reduce((n, a) => n + (a.download_count || 0), 0),
    };
  }, [release]);

  const pick = (i: number) => {
    setAuto(false);
    setShot(i);
  };

  return (
    <section className="vdl" id="download">
      <div className="vdl-glow" aria-hidden />
      <div className="vdl-inner">
        <div className="vdl-copy">
          <span className="vdl-eyebrow">
            <WindowsIcon /> VMEX for Windows
          </span>
          <h2 className="vdl-title">
            Our own app.<br />
            <span>Connect in one tap.</span>
          </h2>
          <p className="vdl-lead">
            A fast desktop client built for VMEX servers. Import any V2Ray config, route your whole PC or just your
            games, and watch your live speed. Free to download.
          </p>

          <div className="vdl-actions">
            <a className="vdl-btn vdl-btn--primary" href={installer?.browser_download_url ?? RELEASES_URL}>
              <DownloadIcon />
              <span>
                Download for Windows
                <small>{installer ? `Installer · ${mb(installer.size)}` : "Installer · 64-bit"}</small>
              </span>
            </a>
            <a className="vdl-btn vdl-btn--ghost" href={portable?.browser_download_url ?? RELEASES_URL}>
              <span>
                Portable .exe
                <small>{portable ? `No install · ${mb(portable.size)}` : "No install needed"}</small>
              </span>
            </a>
          </div>

          <div className="vdl-meta">
            <span>{release ? `Version ${release.tag_name.replace(/^v/, "")}` : "Latest version"}</span>
            {release && <span>Released {date(release.published_at)}</span>}
            {downloads > 0 && <span>{downloads.toLocaleString()} downloads</span>}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <GitHubIcon /> GitHub
            </a>
          </div>

          <ul className="vdl-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <CheckIcon />
                <div>
                  <b>{f.title}</b>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="vdl-showcase">
          <div className="vdl-window">
            <button type="button" className="vdl-screen" onClick={() => setZoom(true)} aria-label="Open full screenshot">
              {SHOTS.map((s, i) => (
                <img
                  key={s.id}
                  src={s.src}
                  alt={`VMEX app: ${s.label}`}
                  className={i === shot ? "is-active" : ""}
                  loading={i === 0 ? "eager" : "lazy"}
                  width={1600}
                  height={1030}
                />
              ))}
            </button>
          </div>

          <p className="vdl-caption" key={SHOTS[shot].id}>{SHOTS[shot].text}</p>

          <div className="vdl-tabs" role="tablist">
            {SHOTS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === shot}
                className={i === shot ? "is-active" : ""}
                onClick={() => pick(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="vdl-note">
        Windows 10 / 11, 64-bit. If Windows SmartScreen shows a warning, click <b>More info</b> then <b>Run anyway</b>.
      </p>

      {zoom && (
        <div className="vdl-lightbox" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <img src={SHOTS[shot].src} alt={`VMEX app: ${SHOTS[shot].label}`} />
          <button type="button" aria-label="Close">×</button>
        </div>
      )}
    </section>
  );
}

/* ---------- icons ---------- */
function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M3 5.5 10.5 4.5v7H3zM11.5 4.4 21 3v8.5h-9.5zM3 12.5h7.5v7L3 18.5zM11.5 12.5H21V21l-9.5-1.4z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
