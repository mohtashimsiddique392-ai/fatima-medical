// Same-origin by default: the frontend and API are deployed together as one
// Vercel project, so relative "/api" paths just work with no CORS and no
// separate URL to configure. Set VITE_API_URL only for split local dev
// (e.g. frontend on :5173, API on :8080).
const BASE = import.meta.env.VITE_API_URL || "/api";

async function getAuthHeader(): Promise<Record<string, string>> {
  // Staff/admin sessions use our own JWT, stored by AuthContext.
  try {
    const raw = localStorage.getItem("mc_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return { Authorization: `Bearer ${parsed.token}` };
    }
  } catch { /* ignore */ }

  // Customer sessions are Clerk sessions. @clerk/clerk-react attaches a
  // global `window.Clerk` instance once loaded.
  const clerk = (window as any).Clerk;
  if (clerk?.session) {
    try {
      const token = await clerk.session.getToken();
      if (token) return { Authorization: `Bearer ${token}` };
    } catch { /* ignore */ }
  }
  return {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeader, ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed: ${res.status}`);
  return data as T;
}

export const api = {
  // ── Admin / staff auth (separate from customer/Clerk auth) ──
  adminLogin: (body: any) => request<any>("/auth/admin/login", { method: "POST", body: JSON.stringify(body) }),
  staffLogin: (body: any) => request<any>("/billing/sub-admins/login", { method: "POST", body: JSON.stringify(body) }),
  adminChangePassword: (body: any) => request<any>("/auth/admin/change-password", { method: "PUT", body: JSON.stringify(body) }),
  adminRequestOtp: (body: any) => request<any>("/auth/admin/request-otp", { method: "POST", body: JSON.stringify(body) }),

  // ── Customer profile (backed by Clerk; call syncCustomer right after sign-up/sign-in) ──
  syncCustomer: (body: { name?: string; phone?: string; referralCode?: string }) =>
    request<any>("/customers/sync", { method: "POST", body: JSON.stringify(body) }),
  getMyProfile: () => request<any>("/customers/me"),

  getProducts: (params?: { search?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.category) q.set("category", params.category);
    return request<any>(`/products${q.toString() ? "?" + q : ""}`);
  },
  getProduct: (id: number) => request<any>(`/products/${id}`),
  getCategories: () => request<any>("/products/categories"),
  getExpiryAlerts: (days?: number) => request<any>(`/products/expiry-alerts${days ? "?days=" + days : ""}`),
  createProduct: (body: any) => request<any>("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: number, body: any) => request<any>(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: number) => request<any>(`/products/${id}`, { method: "DELETE" }),

  // Admin: all orders (optionally filtered by status)
  getOrders: (params?: { status?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    return request<any>(`/orders${q.toString() ? "?" + q : ""}`);
  },
  // Customer: their own order history
  getMyOrders: (params?: { status?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    return request<any>(`/orders/mine${q.toString() ? "?" + q : ""}`);
  },
  createOrder: (body: any) => request<any>("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrderStatus: (id: number, body: { status?: string; paymentStatus?: string }) =>
    request<any>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify(body) }),

  getDashboard: () => request<any>("/admin/dashboard"),
  getCustomers: () => request<any>("/admin/customers"),

  getBillingSettings: () => request<any>("/billing/settings"),
  updateBillingSettings: (body: any) => request<any>("/billing/settings", { method: "PUT", body: JSON.stringify(body) }),
  lookupCustomer: (phone: string) => request<any>(`/billing/customer-lookup?phone=${encodeURIComponent(phone)}`),
  createBill: (body: any) => request<any>("/billing/bills", { method: "POST", body: JSON.stringify(body) }),
  getBills: () => request<any>("/billing/bills"),
  getBill: (id: number) => request<any>(`/billing/bills/${id}`),

  getSubAdmins: () => request<any>("/billing/sub-admins"),
  createSubAdmin: (body: any) => request<any>("/billing/sub-admins", { method: "POST", body: JSON.stringify(body) }),
  updateSubAdmin: (id: number, body: any) => request<any>(`/billing/sub-admins/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSubAdmin: (id: number) => request<any>(`/billing/sub-admins/${id}`, { method: "DELETE" }),

  getMaintenanceStatus: () => request<any>("/settings/public"),
  updateMaintenanceMode: (body: { enabled: boolean; message?: string }) =>
    request<any>("/settings/maintenance", { method: "PUT", body: JSON.stringify(body) }),

  getMyReferral: () => request<any>("/referrals/my"),
  applyReferral: (referralCode: string) => request<any>("/referrals/apply", { method: "POST", body: JSON.stringify({ referralCode }) }),

  chat: (body: any) => request<any>("/chat", { method: "POST", body: JSON.stringify(body) }),

  getFamily: () => request<any>("/family"),
  addFamilyMember: (body: any) => request<any>("/family", { method: "POST", body: JSON.stringify(body) }),
  updateFamilyMember: (id: number, body: any) => request<any>(`/family/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteFamilyMember: (id: number) => request<any>(`/family/${id}`, { method: "DELETE" }),

  getHealthRecords: (familyMemberId?: number) =>
    request<any>(`/health-records${familyMemberId ? "?familyMemberId=" + familyMemberId : ""}`),
  addHealthRecord: (body: any) => request<any>("/health-records", { method: "POST", body: JSON.stringify(body) }),
  deleteHealthRecord: (id: number) => request<any>(`/health-records/${id}`, { method: "DELETE" }),

  scanImage: (body: any) => request<any>("/scan", { method: "POST", body: JSON.stringify(body) }),
  scanText: (body: any) => request<any>("/scan/text", { method: "POST", body: JSON.stringify(body) }),
};

export { BASE as API_BASE, getAuthHeader };
