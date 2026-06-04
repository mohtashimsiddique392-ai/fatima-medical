import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { useEffect, useState } from "react";

import Landing from "@/pages/Landing";
import CustomerLogin from "@/pages/CustomerLogin";
import CustomerRegister from "@/pages/CustomerRegister";
import AdminLogin from "@/pages/AdminLogin";
import Store from "@/pages/Store";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Orders from "@/pages/Orders";
import Referrals from "@/pages/Referrals";
import Chatbot from "@/pages/Chatbot";
import FamilyMembers from "@/pages/FamilyMembers";
import HealthRecords from "@/pages/HealthRecords";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCatalogue from "@/pages/admin/Catalogue";
import AdminOrders from "@/pages/admin/Orders";
import AdminCustomers from "@/pages/admin/Customers";
import ChangePassword from "@/pages/admin/ChangePassword";
import ExpiryAlerts from "@/pages/admin/ExpiryAlerts";
import AdminBilling from "@/pages/admin/Billing";
import SubAdmins from "@/pages/admin/SubAdmins";
import StoreSettings from "@/pages/admin/StoreSettings";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import RefundPolicy from "@/pages/RefundPolicy";

const queryClient = new QueryClient();

function ProtectedCustomer({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "customer") return <Redirect to="/admin" />;
  return <>{children}</>;
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/admin-login" />;
  if (user.role !== "admin") return <Redirect to="/store" />;
  return <>{children}</>;
}

const NO_NAVBAR = ["/", "/login", "/register", "/admin-login"];

function AppRouter() {
  const [location] = useLocation();
  const showNavbar = !NO_NAVBAR.includes(location);
  return (
    <>
      {showNavbar && <Navbar />}
      <Switch>
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/refund" component={RefundPolicy} />
        <Route path="/" component={Landing} />
        <Route path="/login" component={CustomerLogin} />
        <Route path="/register" component={CustomerRegister} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/store"><ProtectedCustomer><Store /></ProtectedCustomer></Route>
        <Route path="/store/product/:id"><ProtectedCustomer><ProductDetail /></ProtectedCustomer></Route>
        <Route path="/cart"><Cart /></Route>
        <Route path="/orders"><ProtectedCustomer><Orders /></ProtectedCustomer></Route>
        <Route path="/referrals"><ProtectedCustomer><Referrals /></ProtectedCustomer></Route>
        <Route path="/chat"><Chatbot /></Route>
        <Route path="/family"><ProtectedCustomer><FamilyMembers /></ProtectedCustomer></Route>
        <Route path="/health"><ProtectedCustomer><HealthRecords /></ProtectedCustomer></Route>
        <Route path="/admin"><ProtectedAdmin><AdminDashboard /></ProtectedAdmin></Route>
        <Route path="/admin/catalogue"><ProtectedAdmin><AdminCatalogue /></ProtectedAdmin></Route>
        <Route path="/admin/orders"><ProtectedAdmin><AdminOrders /></ProtectedAdmin></Route>
        <Route path="/admin/customers"><ProtectedAdmin><AdminCustomers /></ProtectedAdmin></Route>
        <Route path="/admin/change-password"><ProtectedAdmin><ChangePassword /></ProtectedAdmin></Route>
        <Route path="/admin/expiry"><ProtectedAdmin><ExpiryAlerts /></ProtectedAdmin></Route>
        <Route path="/admin/billing"><ProtectedAdmin><AdminBilling /></ProtectedAdmin></Route>
        <Route path="/admin/sub-admins"><ProtectedAdmin><SubAdmins /></ProtectedAdmin></Route>
        <Route path="/admin/settings"><ProtectedAdmin><StoreSettings /></ProtectedAdmin></Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function AppWithMaintenance() {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState<{ mode: boolean; message: string } | null>(null);

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || "https://fatima-medical-api.onrender.com/api";
    fetch(`${BASE}/settings/public`)
      .then(r => r.json())
      .then(d => setMaintenance({ mode: d.maintenanceMode, message: d.maintenanceMessage }))
      .catch(() => setMaintenance({ mode: false, message: "" }));
  }, []);

  if (maintenance === null) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-600">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const currentPath = window.location.pathname;
  const isAdminRoute = currentPath.startsWith("/admin");

  if (maintenance.mode && user?.role !== "admin" && !isAdminRoute) {
    return <MaintenanceScreen message={maintenance.message} />;
  }
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppRouter />
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppWithMaintenance />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;