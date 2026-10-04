import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, type OtpChallenge } from "../../context/AuthContext";
import AuthLayout, { Field, PasswordField, FormError, icons } from "./AuthLayout";
import OtpForm from "./OtpForm";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const ch = await login(email, password);
      if (ch) {
        setChallenge(ch);   // show the code screen
        setBusy(false);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  };

  if (challenge) {
    return (
      <AuthLayout
        variant="otp"
        title={challenge.purpose === "verify" ? "Verify your email" : "Check your email"}
        subtitle={challenge.purpose === "verify" ? "Confirm your email to activate your account." : "Enter the code to finish logging in."}
        footer={<>Didn't get it? Check your spam folder.</>}
      >
        <OtpForm
          challenge={challenge}
          onVerified={() => navigate(from, { replace: true })}
          onBack={() => { setChallenge(null); setPassword(""); }}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your VMEX plans and configs."
      footer={<>Don't have an account? <Link to="/portal/register">Create one</Link></>}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <FormError message={error} />

        <Field label="Email address" icon={icons.mail} type="email" placeholder="you@example.com"
          autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <PasswordField label="Password" placeholder="Enter your password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit" className="auth-submit" disabled={busy || !email || !password}>
          {busy ? <span className="spinner small" /> : "Continue"}
        </button>
      </form>
    </AuthLayout>
  );
}