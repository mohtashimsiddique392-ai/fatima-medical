import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Package } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    api.getOrders({ customerId: user.id }).then(r => { setOrders(r.orders); setLoading(false); });
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading orders...</div></div>;

  if (!orders.length) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 text-sm mb-6">Place your first order from our store.</p>
        <Link href="/store"><button className="bg-teal-500 text-white px-8 py-3 rounded-xl font-medium">Browse Store</button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">My Orders</h1>
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Order #{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
              </div>
              <div className="space-y-1 mb-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                    <span className="text-gray-500">₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${order.paymentMethod === "upi" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
                    {order.paymentMethod === "upi" ? "UPI" : "Cash on Delivery"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{order.paymentStatus}</span>
                </div>
                <p className="font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</p>
              </div>
              {order.paymentMethod === "upi" && order.paymentStatus === "pending" && (
                <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs text-teal-700 font-medium">Pay via UPI: <span className="font-mono font-bold">8081176774@okbizaxis</span></p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
