const BASE = import.meta.env.VITE_API_URL || "https://fatima-medical-api.onrender.com/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  customerLogin: (body: any) => request<any>("/auth/customer/login", { method: "POST", body: JSON.stringify(body) }),
  customerRegister: (body: any) => request<any>("/auth/customer/register", { method: "POST", body: JSON.stringify(body) }),
  adminLogin: (body: any) => request<any>("/auth/admin/login", { method: "POST", body: JSON.stringify(body) }),
  adminChangePassword: (body: any) => request<any>("/auth/admin/change-password", { method: "PUT", body: JSON.stringify(body) }),
  adminRequestOtp: (body: any) => request<any>("/auth/admin/request-otp", { method: "POST", body: JSON.stringify(body) }),

  otpCheckAllowed: (phone: string) => request<any>(`/otp/check?phone=${encodeURIComponent(phone)}`),
  otpRecordFailure: (phone: string) => request<any>("/otp/failure", { method: "POST", body: JSON.stringify({ phone }) }),
  otpVerifyToken: (body: any) => request<any>("/otp/verify", { method: "POST", body: JSON.stringify(body) }),

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

  getOrders: (params?: { customerId?: number; status?: string }) => {
  const q = new URLSearchParams();
  if (params?.customerId) q.set("customerId", String(params.customerId));
  if (params?.status) q.set("status", params.status);
  return request<any>(`/orders${q.toString() ? "?" + q : ""}`);
},

  createOrder: (body: any) => request<any>("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrderStatus: (id: number, body: { status?: string; paymentStatus?: string }) => request<any>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify(body) }),

  getDashboard: () => request<any>("/admin/dashboard"),
  getCustomers: () => request<any>("/admin/customers"),

  getBillingSettings: () => request<any>("/billing/settings"),
  updateBillingSettings: (body: any) => request<any>("/billing/settings", { method: "PUT", body: JSON.stringify(body) }),
  lookupCustomer: (phone: string) => request<any>(`/billing/customer-lookup?phone=${encodeURIComponent(phone)}`),
  createBill: (body: any) => request<any>("/billing/bills", { method: "POST", body: JSON.stringify(body) }),

  getSubAdmins: () => request<any>("/billing/sub-admins"),
  createSubAdmin: (body: any) => request<any>("/billing/sub-admins", { method: "POST", body: JSON.stringify(body) }),
  updateSubAdmin: (id: number, body: any) => request<any>(`/billing/sub-admins/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSubAdmin: (id: number) => request<any>(`/billing/sub-admins/${id}`, { method: "DELETE" }),

  getMyReferral: (customerId: number) => request<any>(`/referrals/my?customerId=${customerId}`),
  applyReferral: (body: any) => request<any>("/referrals/apply", { method: "POST", body: JSON.stringify(body) }),

  chat: (body: any) => request<any>("/chat", { method: "POST", body: JSON.stringify(body) }),

  getFamily: (customerId: number) => request<any>(`/family?customerId=${customerId}`),
  addFamilyMember: (body: any) => request<any>("/family", { method: "POST", body: JSON.stringify(body) }),
  updateFamilyMember: (id: number, body: any) => request<any>(`/family/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteFamilyMember: (id: number) => request<any>(`/family/${id}`, { method: "DELETE" }),

  getHealthRecords: (customerId: number, familyMemberId?: number) => request<any>(`/health-records?customerId=${customerId}${familyMemberId ? "&familyMemberId=" + familyMemberId : ""}`),
addHealthRecord: (body: any) => request<any>("/health-records", { method: "POST", body: JSON.stringify(body) }),

  deleteHealthRecord: (id: number) => request<any>(`/health-records/${id}`, { method: "DELETE" }),

  scanImage: (body: any) => request<any>("/scan", { method: "POST", body: JSON.stringify(body) }),
};