const BASE = "/api";

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // Auth
  adminLogin: (body: { username: string; password: string }) =>
    apiFetch("/auth/admin/login", { method: "POST", body: JSON.stringify(body) }),
  adminRequestOtp: (username: string) =>
    apiFetch("/auth/admin/request-otp", { method: "POST", body: JSON.stringify({ username }) }),
  adminChangePassword: (body: { username: string; otp: string; newPassword: string }) =>
    apiFetch("/auth/admin/change-password", { method: "POST", body: JSON.stringify(body) }),
  customerLogin: (body: { phone: string; password: string }) =>
    apiFetch("/auth/customer/login", { method: "POST", body: JSON.stringify(body) }),
  customerRegister: (body: { name: string; phone: string; password: string; referralCode?: string }) =>
    apiFetch("/auth/customer/register", { method: "POST", body: JSON.stringify(body) }),

  // Products
  getProducts: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    return apiFetch(`/products?${q}`);
  },
  getCategories: () => apiFetch("/products/categories"),
  getProduct: (id: number) => apiFetch(`/products/${id}`),
  getExpiryAlerts: (days?: number) => apiFetch(`/products/expiry-alerts${days ? `?days=${days}` : ""}`),
  createProduct: (body: any) => apiFetch("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: number, body: any) => apiFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),

  // Orders
  getOrders: (params?: { customerId?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.customerId) q.set("customerId", String(params.customerId));
    if (params?.status) q.set("status", params.status);
    return apiFetch(`/orders?${q}`);
  },
  getOrder: (id: number) => apiFetch(`/orders/${id}`),
  createOrder: (body: any) => apiFetch("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrderStatus: (id: number, body: any) => apiFetch(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify(body) }),

  // Referrals
  getMyReferral: (customerId: number) => apiFetch(`/referrals/my?customerId=${customerId}`),
  applyReferral: (body: { customerId: number; referralCode: string }) =>
    apiFetch("/referrals/apply", { method: "POST", body: JSON.stringify(body) }),

  // Chat
  chat: (body: { message: string; customerId?: number }) =>
    apiFetch("/chat", { method: "POST", body: JSON.stringify(body) }),

  // Admin
  getDashboard: () => apiFetch("/admin/dashboard"),
  getCustomers: () => apiFetch("/admin/customers"),

  // Family Members
  getFamily: (customerId: number) => apiFetch(`/family?customerId=${customerId}`),
  addFamilyMember: (body: any) => apiFetch("/family", { method: "POST", body: JSON.stringify(body) }),
  updateFamilyMember: (id: number, body: any) => apiFetch(`/family/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteFamilyMember: (id: number) => apiFetch(`/family/${id}`, { method: "DELETE" }),

  // Health Records
  getHealthRecords: (customerId: number, familyMemberId?: number) => {
    const q = new URLSearchParams({ customerId: String(customerId) });
    if (familyMemberId) q.set("familyMemberId", String(familyMemberId));
    return apiFetch(`/health-records?${q}`);
  },
  addHealthRecord: (body: any) => apiFetch("/health-records", { method: "POST", body: JSON.stringify(body) }),
  deleteHealthRecord: (id: number) => apiFetch(`/health-records/${id}`, { method: "DELETE" }),
};
