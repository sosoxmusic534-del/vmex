import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useAuth, type OtpChallenge } from "../../context/AuthContext";
import { FormError } from "./AuthLayout";

const LEN = 6;
const COOLDOWN = 60;

type Props = { challenge: OtpChallenge; onVerified: () => void; onBack: () => void };

export default function OtpForm({ challenge, onVerified, onBack }: Props) {
  const { verifyOtp, resendOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (code: string) => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await verifyOtp(challenge.challengeId, code);
      onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
      setDigits(Array(LEN).fill(""));
      setBusy(false);
      setTimeout(() => refs.current[0]?.focus(), 0);
    }
  };

  const fillFrom = (i: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    const next = [...digits];
    if (!clean) {
      next[i] = "";
      setDigits(next);
      return;
    }
    let j = i;
    for (const ch of clean) {
      if (j >= LEN) break;
      next[j++] = ch;
    }
    setDigits(next);
    refs.current[Math.min(j, LEN - 1)]?.focus();
    if (next.every(Boolean) && !busy) submit(next.join(""));
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fillFrom(0, e.clipboardData.getData("text"));
  };

  const resend = async () => {
    setError("");
    setInfo("");
    try {
      await resendOtp(challenge.challengeId);
      setCooldown(COOLDOWN);
      setInfo("A new code is on its way. Check your inbox (and spam folder).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't resend the code.");
    }
  };

  return (
    <div className="otp">
      <div className="otp-mail">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      </div>

      <p className="otp-sent">
        We sent a 6-digit code to <b>{challenge.email}</b>. It expires in 10 minutes.
      </p>

      <FormError message={error} />
      {info && !error && <p className="otp-info">{info}</p>}

      <div key={error} className={`otp-boxes ${error ? "shake" : ""}`}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => fillFrom(i, e.target.value)}
            onKeyDown={onKeyDown(i)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LEN}
            disabled={busy}
            className={d ? "filled" : ""}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <button type="button" className="auth-submit" disabled={busy || digits.some((d) => !d)}
        onClick={() => submit(digits.join(""))}>
        {busy ? <span className="spinner small" /> : challenge.purpose === "verify" ? "Verify Email" : "Verify & Log In"}
      </button>

      <div className="otp-foot">
        <button type="button" className="otp-link" onClick={resend} disabled={cooldown > 0 || busy}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button type="button" className="otp-link" onClick={onBack} disabled={busy}>
          Go back
        </button>
      </div>
    </div>
  );
}