import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

export type User = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "staff" | "admin";
  balance: number;
  createdAt: string;
};

export type OtpChallenge = {
  challengeId: string;
  email: string;
  purpose: "login" | "verify";
};

type AuthResponse = { user: User } | ({ otpRequired: true } & OtpChallenge);

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<OtpChallenge | null>;
  register: (name: string, email: string, password: string) => Promise<OtpChallenge | null>;
  verifyOtp: (challengeId: string, code: string) => Promise<void>;
  resendOtp: (challengeId: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  /* If the server asks for a code, return the challenge; otherwise log in */
  const handle = (d: AuthResponse): OtpChallenge | null => {
    if ("otpRequired" in d && d.otpRequired) {
      return { challengeId: d.challengeId, email: d.email, purpose: d.purpose };
    }
    setUser((d as { user: User }).user);
    return null;
  };

  const login = async (email: string, password: string) =>
    handle(await api<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));

  const register = async (name: string, email: string, password: string) =>
    handle(await api<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }));

  const verifyOtp = async (challengeId: string, code: string) => {
    const d = await api<{ user: User }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ challengeId, code }),
    });
    setUser(d.user);
  };

  const resendOtp = async (challengeId: string) => {
    await api("/auth/otp/resend", { method: "POST", body: JSON.stringify({ challengeId }) });
  };

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}