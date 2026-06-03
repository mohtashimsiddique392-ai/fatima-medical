import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Users, TrendingUp, AlertTriangle, Clock, AlertCircle, Package, TrendingDown, DollarSign, BarChart2, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700", shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => { api.getDashboard().then(s => { setStats(s); setLoading(false); }); }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const p = stats.profit || {};

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {stats.expiringCount > 0 && (
          <Link href="/admin/expiry">
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-orange-100 transition-colors">
              <AlertCircle size={18} className="text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700 font-medium">{stats.expiringCount} products expiring within 30 days — <span className="underline">View</span></p>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { icon: ShoppingBag, label: "Total Orders", value: stats.totalOrders, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/orders" },
            { icon: Clock, label: "Pending", value: stats.pendingOrders, color: "text-yellow-600", bg: "bg-yellow-50", href: "/admin/orders" },
            { icon: TrendingUp, label: "Revenue", value: `₹${Number(stats.totalRevenue).toFixed(0)}`, color: "text-green-600", bg: "bg-green-50", href: "/admin/billing" },
            { icon: Users, label: "Customers", value: stats.totalCustomers, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/customers" },
          ].map(({ icon: Icon, label, value, color, bg, href }) => (
            <button key={label} onClick={() => navigate(href)}
              className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-blue-200 transition-all active:scale-95">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-2`}><Icon size={20} className={color} /></div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">{label} <ChevronRight size={10} /></p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button onClick={() => navigate("/admin/billing")}
            className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-blue-200 transition-all active:scale-95">
            <p className="text-sm text-gray-500">Today's Revenue</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">₹{Number(stats.todayRevenue).toFixed(0)}</p>
          </button>
          <button onClick={() => navigate("/admin/catalogue")}
            className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-blue-200 transition-all active:scale-95">
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
          </button>
          <button onClick={() => navigate("/admin/catalogue")}
            className={`rounded-xl border p-4 text-left hover:shadow-md transition-all active:scale-95 ${stats.lowStockProducts > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center gap-1.5">
              {stats.lowStockProducts > 0 && <AlertTriangle size={14} className="text-orange-500" />}
              <p className="text-sm text-gray-500">Low Stock</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats.lowStockProducts > 0 ? "text-orange-600" : "text-gray-900"}`}>{stats.lowStockProducts}</p>
          </button>
          <button onClick={() => navigate("/admin/expiry")}
            className={`rounded-xl border p-4 text-left hover:shadow-md transition-all active:scale-95 ${stats.expiringCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center gap-1.5">
              {stats.expiringCount > 0 && <AlertCircle size={14} className="text-red-500" />}
              <p className="text-sm text-gray-500">Expiring Soon</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats.expiringCount > 0 ? "text-red-600" : "text-gray-900"}`}>{stats.expiringCount}</p>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Profit & Loss Breakdown</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Total Sales", value: `₹${Number(p.totalSalesRevenue || 0).toFixed(0)}`, color: "text-blue-600", bg: "bg-blue-50", icon: DollarSign },
              { label: "Total Cost", value: `₹${Number(p.totalCost || 0).toFixed(0)}`, color: "text-gray-600", bg: "bg-gray-50", icon: Package },
              { label: "Gross Profit", value: `₹${Number(p.grossProfit || 0).toFixed(0)}`, color: "text-green-600", bg: "bg-green-50", icon: TrendingUp },
              { label: "Profit Margin", value: `${p.profitMargin || 0}%`, color: "text-teal-600", bg: "bg-teal-50", icon: BarChart2 },
              { label: "Expiry Loss", value: `₹${Number(p.expiryLoss || 0).toFixed(0)}`, color: "text-red-600", bg: "bg-red-50", icon: TrendingDown },
              { label: "Net Profit", value: `₹${Number(p.netProfit || 0).toFixed(0)}`, color: Number(p.netProfit) >= 0 ? "text-green-700" : "text-red-600", bg: Number(p.netProfit) >= 0 ? "bg-green-50" : "bg-red-50", icon: TrendingUp },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={`${bg} rounded-xl p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={color} />
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          {!p.totalCost && (
            <p className="text-xs text-gray-400 mt-3 text-center">💡 Add cost prices to products for accurate profit calculations</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders"><span className="text-xs text-blue-600 hover:underline cursor-pointer">View all</span></Link>
          </div>
          {stats.recentOrders?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentOrders.map((order: any) => (
                <button key={order.id} onClick={() => navigate("/admin/orders")}
                  className="w-full flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id} — {order.customerName}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.items?.length} items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                    <span className="font-semibold text-gray-900 text-sm">₹{Number(order.totalAmount).toFixed(0)}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}