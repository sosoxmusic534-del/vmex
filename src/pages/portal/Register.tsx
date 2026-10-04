import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type OtpChallenge } from "../../context/AuthContext";
import AuthLayout, { Field, PasswordField, FormError, icons } from "./AuthLayout";
import OtpForm from "./OtpForm";

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const score = strength(password);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) return setError("Please enter your name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!agree) return setError("Please accept the Terms & Conditions.");

    setBusy(true);
    try {
      const ch = await register(name.trim(), email, password);
      if (ch) {
        setChallenge(ch);   // show the code screen
        setBusy(false);
      } else {
        navigate("/portal", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  };

  if (challenge) {
    return (
      <AuthLayout
        variant="otp"
        title="Verify your email"
        subtitle="One last step — enter the code we just emailed you."
        footer={<>Didn't get it? Check your spam folder.</>}
      >
        <OtpForm
          challenge={challenge}
          onVerified={() => navigate("/portal", { replace: true })}
          onBack={() => setChallenge(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join VMEX and get connected in minutes."
      footer={<>Already have an account? <Link to="/portal/login">Log in</Link></>}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <FormError message={error} />

        <Field label="Full name" icon={icons.user} type="text" placeholder="Your name" autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} required />

        <Field label="Email address" icon={icons.mail} type="email" placeholder="you@example.com"
          autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <div>
          <PasswordField label="Password" placeholder="At least 8 characters" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          {password && (
            <div className={`auth-strength s${score}`}>
              <div className="auth-strength-bars">
                {[0, 1, 2, 3].map((i) => <span key={i} className={i < score ? "on" : ""} />)}
              </div>
              <small>{labels[score]}</small>
            </div>
          )}
        </div>

        <PasswordField label="Confirm password" placeholder="Repeat your password" autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        <label className="auth-check-row">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span className="auth-box" />
          <span>
            I agree to the <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </span>
        </label>

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? <span className="spinner small" /> : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}