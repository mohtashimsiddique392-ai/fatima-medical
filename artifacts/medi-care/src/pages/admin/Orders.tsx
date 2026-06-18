import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["pending", "confirmed", "cancelled"],
  confirmed: ["confirmed", "processing", "cancelled"],
  processing: ["processing", "shipped", "cancelled"],
  shipped: ["shipped", "delivered", "cancelled"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

const ALL_STATUSES = ["", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onOk: () => void } | null>(null);

  const load = () => {
    setLoading(true);
    api.getOrders(filter ? { status: filter } : undefined)
      .then(r => { setOrders(r.orders); setLoading(false); });
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const body: any = { status };
      if (status === "delivered") body.paymentStatus = "paid";
      await api.updateOrderStatus(id, body);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally { setUpdating(null); }
  };

  const markPaid = (order: any) => {
    setConfirm({
      msg: `Confirm UPI payment received for Order #${order.id} (₹${Number(order.totalAmount || order.total_amount).toFixed(2)})?`,
      onOk: async () => {
        setConfirm(null);
        setMarkingPaid(order.id);
        try { await api.updateOrderStatus(order.id, { paymentStatus: "paid" }); load(); }
        finally { setMarkingPaid(null); }
      }
    });
  };

  const isFinal = (status: string) => status === "delivered" || status === "cancelled";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 text-sm mb-5">{confirm.msg}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button onClick={confirm.onOk}
                className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Orders ({orders.length})</h1>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
            <option value="">All Status</option>
            {ALL_STATUSES.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : orders.length === 0 ? (
          <p className="text-center py-16 text-gray-400">No orders found.</p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">Order #{order.id}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{order.customerName || "Walk-in"} · {order.customerPhone || ""}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt || order.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <p className="font-bold text-gray-900">₹{Number(order.totalAmount || order.total_amount).toFixed(0)}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.productName || item.product_name} × {item.quantity}</span>
                      <span className="text-gray-500">₹{(Number(item.price) * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-medium ${(order.paymentMethod || order.payment_method) === "upi" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
                      {(order.paymentMethod || order.payment_method) === "upi" ? "UPI" : "Cash"}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-medium capitalize ${(order.paymentStatus || order.payment_status) === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {(order.paymentStatus || order.payment_status) === "paid" ? "✓ Paid" : "Unpaid"}
                    </span>
                    {order.address && (
                      <span className="text-gray-400">📍 {order.address.slice(0, 25)}{order.address.length > 25 ? "..." : ""}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {(order.paymentMethod || order.payment_method) === "upi" && (order.paymentStatus || order.payment_status) !== "paid" && (
                      <button onClick={() => markPaid(order)} disabled={markingPaid === order.id}
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={13} />
                        {markingPaid === order.id ? "Marking..." : "Mark Paid"}
                      </button>
                    )}
                    {!isFinal(order.status) ? (
                      <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400 disabled:opacity-50 capitalize">
                        {(NEXT_STATUSES[order.status] || [order.status]).map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${STATUS_COLORS[order.status]}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)} ✓
                      </span>
                    )}
                  </div>
                </div>

                {(order.paymentMethod || order.payment_method) === "upi" && (order.paymentStatus || order.payment_status) !== "paid" && order.status !== "cancelled" && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700 font-medium">
                      ⚠️ UPI payment not yet verified. Click <strong>Mark Paid</strong> once you see the payment in your UPI app.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}