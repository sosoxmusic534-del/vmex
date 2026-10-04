type Props = {
  message?: string;
  overlay?: boolean;
  leaving?: boolean;
};

export default function PortalLoader({ message = "Loading…", overlay = false, leaving = false }: Props) {
  return (
    <div
      className={`pl-loader ${overlay ? "overlay" : ""} ${leaving ? "leaving" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="pl-glow" />
      <div className="pl-box">
        <div className="pl-ring">
          <span className="pl-orbit"><i /></span>
          <img src="/logo.png" alt="" />
        </div>
        <div className="pl-brand">VM<b>EX</b></div>
        <div className="pl-bar"><span /></div>
        <p className="pl-msg">{message}</p>
      </div>
    </div>
  );
}