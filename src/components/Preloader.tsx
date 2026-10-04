export default function Preloader({ done }: { done: boolean }) {
  return (
    <div className={`preloader ${done ? "hide" : ""}`} aria-hidden={done}>
      <div className="preloader-box">
        <img src="/logo.png" alt="" className="preloader-logo" />

        <div className="preloader-word">
          {"VMEX".split("").map((c, i) => (
            <span
              key={i}
              className={i >= 2 ? "accent" : ""}
              style={{ "--i": i } as React.CSSProperties}
            >
              {c}
            </span>
          ))}
        </div>

        <div className="preloader-bar">
          <span />
        </div>
        <p className="preloader-text">Connecting to secure servers…</p>
      </div>
    </div>
  );
}