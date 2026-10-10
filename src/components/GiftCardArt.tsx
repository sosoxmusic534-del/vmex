import { useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { GiftDesign, GiftStatus } from "../lib/gifts";

type Props = {
  design: GiftDesign;
  amount: number;
  toName?: string;
  fromName?: string;
  code?: string;
  size?: "sm" | "md" | "lg";
  tilt?: boolean;
  status?: GiftStatus;
  className?: string;
  style?: CSSProperties;
};

export default function GiftCardArt({
  design, amount, toName, fromName, code, size = "md", tilt = false, status = "available", className = "", style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!tilt || !el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 18}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  const used = status !== "available";

  return (
    <div
      ref={ref}
      className={`gca gca--${design} gca--${size}${tilt ? " gca--tilt" : ""}${used ? " is-used" : ""} ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="gca-face">
        <span className="gca-dots" />
        <span className="gca-shine" />
        <span className="gca-glare" />

        <div className="gca-top">
          <span className="gca-brand"><img src="/logo.png" alt="" />VMEX</span>
          <span className="gca-tag">GIFT CARD</span>
        </div>
        <span className="gca-chip" />
        {code && <span className="gca-code">{code}</span>}

        <div className="gca-amount">
          <small>LKR</small>
          {Math.max(0, Math.round(amount || 0)).toLocaleString("en-US")}
        </div>

        <div className="gca-bottom">
          <div>
            <small>For</small>
            <b>{toName?.trim() || "You"}</b>
          </div>
          {fromName?.trim() && (
            <div className="gca-from">
              <small>From</small>
              <b>{fromName.trim()}</b>
            </div>
          )}
        </div>

        {used && (
          <span className="gca-stamp">{status === "claimed" ? "Claimed" : status === "expired" ? "Expired" : "Inactive"}</span>
        )}
      </div>
    </div>
  );
}