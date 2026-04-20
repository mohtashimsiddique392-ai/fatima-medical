import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700", shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};
const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => api.getOrders(filter ? { status: filter } : undefined).then(r => { setOrders(r.orders); setLoading(false); });
  useEffect(() => { setLoading(true); load(); }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await api.updateOrderStatus(id, { status, ...(status === "delivered" ? { paymentStatus: "paid" } : {}) });
      load();
    } finally { setUpdating(null); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Orders ({orders.length})</h1>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? <p className="text-center py-16 text-gray-400">No orders found.</p> : orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900">Order #{order.id}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{order.customerName} · {order.customerPhone}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <p className="font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(0)}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm"><span className="text-gray-700">{item.productName} × {item.quantity}</span><span className="text-gray-500">₹{(Number(item.price) * item.quantity).toFixed(0)}</span></div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded font-medium ${order.paymentMethod === "upi" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>{order.paymentMethod === "upi" ? "UPI" : "Cash on Delivery"}</span>
                  <span className={`px-2 py-0.5 rounded font-medium capitalize ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{order.paymentStatus}</span>
                  {order.address && <span className="text-gray-400">📍 {order.address.slice(0, 30)}{order.address.length > 30 ? "..." : ""}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)} disabled={updating === order.id || order.status === "delivered" || order.status === "cancelled"}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400 disabled:opacity-50 disabled:cursor-not-allowed capitalize">
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
