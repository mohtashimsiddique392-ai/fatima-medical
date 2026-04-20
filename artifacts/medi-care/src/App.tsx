import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

import Landing from "@/pages/Landing";
import CustomerLogin from "@/pages/CustomerLogin";
import CustomerRegister from "@/pages/CustomerRegister";
import AdminLogin from "@/pages/AdminLogin";
import Store from "@/pages/Store";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedCustomer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "customer") return <Redirect to="/admin" />;
  return <>{children}</>;
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
        <Route path="/" component={Landing} />
        <Route path="/login" component={CustomerLogin} />
        <Route path="/register" component={CustomerRegister} />
        <Route path="/admin-login" component={AdminLogin} />

        <Route path="/store">
          <ProtectedCustomer><Store /></ProtectedCustomer>
        </Route>
        <Route path="/cart">
          <Cart />
        </Route>
        <Route path="/orders">
          <ProtectedCustomer><Orders /></ProtectedCustomer>
        </Route>
        <Route path="/referrals">
          <ProtectedCustomer><Referrals /></ProtectedCustomer>
        </Route>
        <Route path="/chat">
          <Chatbot />
        </Route>
        <Route path="/family">
          <ProtectedCustomer><FamilyMembers /></ProtectedCustomer>
        </Route>
        <Route path="/health">
          <ProtectedCustomer><HealthRecords /></ProtectedCustomer>
        </Route>

        <Route path="/admin">
          <ProtectedAdmin><AdminDashboard /></ProtectedAdmin>
        </Route>
        <Route path="/admin/catalogue">
          <ProtectedAdmin><AdminCatalogue /></ProtectedAdmin>
        </Route>
        <Route path="/admin/orders">
          <ProtectedAdmin><AdminOrders /></ProtectedAdmin>
        </Route>
        <Route path="/admin/customers">
          <ProtectedAdmin><AdminCustomers /></ProtectedAdmin>
        </Route>
        <Route path="/admin/change-password">
          <ProtectedAdmin><ChangePassword /></ProtectedAdmin>
        </Route>
        <Route path="/admin/expiry">
          <ProtectedAdmin><ExpiryAlerts /></ProtectedAdmin>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
