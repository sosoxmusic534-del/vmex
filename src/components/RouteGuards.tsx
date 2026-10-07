import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PortalLoader from "./portal/PortalLoader";

function Loading() {
  return <PortalLoader message="Checking your session…" />;
}

/* Logged-in users only */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/portal/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/* Logged-out users only (login / register pages) */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (user) return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

/* Admins only */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (user?.role !== "admin") return <Navigate to="/portal" replace />;
  return <>{children}</>;
}

/* Staff or admins */
export function StaffRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (user?.role !== "staff" && user?.role !== "admin") return <Navigate to="/portal" replace />;
  return <>{children}</>;
}