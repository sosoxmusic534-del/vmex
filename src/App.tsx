import { useEffect, useState } from "react";
import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import { ProtectedRoute, GuestOnly, AdminRoute, StaffRoute } from "./components/RouteGuards";

import PortalLayout from "./components/portal/PortalLayout";
import PortalTransition from "./components/portal/PortalTransition";
import PortalLogin from "./pages/portal/Login";
import PortalRegister from "./pages/portal/Register";
import PortalDashboard from "./pages/portal/Dashboard";
import Services from "./pages/portal/Services";
import Configs from "./pages/portal/Configs";
import Store from "./pages/portal/Store";
import Invoices from "./pages/portal/Invoices.tsx";
import Support from "./pages/portal/Support";
import Account from "./pages/portal/Account";
import { TicketThread } from "./components/portal/tickets";

import AdminOverview from "./pages/admin/Overview";
import AdminXui from "./pages/admin/Xui";
import AdminInvoices from "./pages/admin/Invoices.tsx";
import AdminTopups from "./pages/admin/Topups";
import AdminUsers from "./pages/admin/Users";
import AdminNetwork from "./pages/admin/Network";
import AdminPayments from "./pages/admin/Payments";
import AdminTickets from "./pages/admin/Tickets";
import AdminSettings from "./pages/admin/Settings";

import Background from "./components/layout/Background";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Delivery from "./components/Delivery";
import Guide from "./components/Guide";
import Packages from "./components/Packages";
import Plans from "./components/Plans";
import Team from "./components/Team";
import Faq from "./components/Faq";
import Cta from "./components/Cta";
import Footer from "./components/Footer";
import Preloader from "./components/Preloader";
import ScrollManager from "./components/ScrollManager";
import RouteMeta from "./components/RouteMeta";

import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import About from "./pages/About";

import useSmoothScroll from "./hooks/useSmoothScroll";
import useScrollReveal from "./hooks/useScrollReveal";
import "./App.css";
import "./portal-rail.css";

function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Delivery />
      <Guide />
      <Packages />
      <Plans />
      <Team />
      <Faq />
      <Cta />
    </>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const { pathname } = useLocation();
  const isPortal = pathname.startsWith("/portal");

  useEffect(() => {
    const minTime = new Promise((r) => setTimeout(r, 1800));
    const pageLoad =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((r) => window.addEventListener("load", r, { once: true }));
    Promise.all([minTime, pageLoad]).then(() => setLoaded(true));
  }, []);

  useEffect(() => {
    document.body.style.overflow = loaded ? "" : "hidden";
  }, [loaded]);

  useSmoothScroll(loaded);
  useScrollReveal(loaded, pathname);

  return (
    <div className={`app ${loaded ? "is-loaded" : ""}`}>
      <Background />
      <Preloader done={loaded} />
      <PortalTransition />
      <ScrollManager />
      <RouteMeta />

      {!isPortal && <Navbar />}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/about" element={<About />} />
          <Route path="/fair-use" element={<Home />} />

          <Route path="/portal/login" element={<GuestOnly><PortalLogin /></GuestOnly>} />
          <Route path="/portal/register" element={<GuestOnly><PortalRegister /></GuestOnly>} />

          <Route path="/portal" element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route index element={<PortalDashboard />} />
            <Route path="services" element={<Services />} />
            <Route path="configs" element={<Configs />} />
            <Route path="store" element={<Store />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="account" element={<Account />} />
            <Route path="support" element={<Support />} />
            <Route path="support/:id" element={<TicketThread />} />

            <Route path="staff" element={<StaffRoute><Outlet /></StaffRoute>}>
              <Route path="tickets" element={<AdminTickets staff />} />
              <Route path="tickets/:id" element={<TicketThread admin staff />} />
            </Route>

            <Route path="admin" element={<AdminRoute><Outlet /></AdminRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="xui" element={<AdminXui />} />
              <Route path="network" element={<AdminNetwork />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="topups" element={<AdminTopups />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="tickets/:id" element={<TicketThread admin />} />
            </Route>
          </Route>

          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {!isPortal && <Footer />}
    </div>
  );
}