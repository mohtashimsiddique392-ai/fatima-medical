import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { ShoppingBag, Users, Package, TrendingUp, AlertTriangle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700", shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getDashboard().then(s => { setStats(s); setLoading(false); }); }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: ShoppingBag, label: "Total Orders", value: stats.totalOrders, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: Clock, label: "Pending", value: stats.pendingOrders, color: "text-yellow-600", bg: "bg-yellow-50" },
            { icon: TrendingUp, label: "Total Revenue", value: `₹${Number(stats.totalRevenue).toFixed(0)}`, color: "text-green-600", bg: "bg-green-50" },
            { icon: Users, label: "Customers", value: stats.totalCustomers, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-2`}><Icon size={20} className={color} /></div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Today's Revenue</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">₹{Number(stats.todayRevenue).toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
          </div>
          <div className={`rounded-xl border p-4 ${stats.lowStockProducts > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center gap-2">
              {stats.lowStockProducts > 0 && <AlertTriangle size={16} className="text-orange-500" />}
              <p className="text-sm text-gray-500">Low Stock</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats.lowStockProducts > 0 ? "text-orange-600" : "text-gray-900"}`}>{stats.lowStockProducts}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders"><span className="text-xs text-teal-600 hover:underline cursor-pointer">View all</span></Link>
          </div>
          {stats.recentOrders?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id} — {order.customerName}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.items?.length} items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                    <span className="font-semibold text-gray-900 text-sm">₹{Number(order.totalAmount).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
