import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AlertTriangle, Calendar, Package } from "lucide-react";

export default function ExpiryAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  const load = (d: number) => {
    setLoading(true);
    api.getExpiryAlerts(d).then(r => { setAlerts(r.alerts); setLoading(false); });
  };
  useEffect(() => { load(days); }, [days]);

  const expired = alerts.filter(a => a.isExpired);
  const expiring = alerts.filter(a => !a.isExpired);

  const urgencyColor = (daysLeft: number) => {
    if (daysLeft < 0) return "bg-red-100 border-red-200 text-red-700";
    if (daysLeft <= 7) return "bg-red-50 border-red-200 text-red-600";
    if (daysLeft <= 30) return "bg-orange-50 border-orange-200 text-orange-600";
    return "bg-yellow-50 border-yellow-200 text-yellow-600";
  };

  const urgencyBadge = (daysLeft: number) => {
    if (daysLeft < 0) return "bg-red-500 text-white";
    if (daysLeft <= 7) return "bg-red-100 text-red-700";
    if (daysLeft <= 30) return "bg-orange-100 text-orange-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            <h1 className="text-xl font-bold text-gray-900">Expiry Alerts</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show products expiring within</span>
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{expired.length}</p>
            <p className="text-xs text-red-500 font-medium mt-1">Already Expired</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{alerts.filter(a => !a.isExpired && a.daysLeft <= 30).length}</p>
            <p className="text-xs text-orange-500 font-medium mt-1">Expiring in 30 days</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{alerts.filter(a => !a.isExpired && a.daysLeft > 30).length}</p>
            <p className="text-xs text-yellow-500 font-medium mt-1">Expiring later</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse border" />)}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No expiry alerts</p>
            <p className="text-gray-400 text-sm mt-1">All products with expiry dates are safe for the selected period.</p>
            <p className="text-xs text-gray-400 mt-4 bg-gray-100 rounded-lg p-3 max-w-xs mx-auto">Tip: Add expiry dates to your products in the Catalogue to enable this feature.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expired.length > 0 && (
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1.5"><AlertTriangle size={14} /> EXPIRED PRODUCTS — Remove from shelves immediately</h2>
                {expired.map(p => (
                  <div key={p.id} className={`rounded-xl border p-4 mb-2 ${urgencyColor(p.daysLeft)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs mt-0.5 opacity-80">{p.category} · Stock: {p.stock}</p>
                        {p.batchNumber && <p className="text-xs opacity-70 mt-0.5">Batch: {p.batchNumber}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${urgencyBadge(p.daysLeft)}`}>
                          EXPIRED {Math.abs(p.daysLeft)} day{Math.abs(p.daysLeft) !== 1 ? "s" : ""} ago
                        </span>
                        <p className="text-xs opacity-70 mt-1 flex items-center gap-1 justify-end"><Calendar size={11} /> {p.expiryDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expiring.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-orange-600 mb-3">Expiring Soon</h2>
                {expiring.map(p => (
                  <div key={p.id} className={`rounded-xl border p-4 mb-2 ${urgencyColor(p.daysLeft)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs mt-0.5 opacity-80">{p.category} · Stock: {p.stock}{p.manufacturer ? ` · ${p.manufacturer}` : ""}</p>
                        {p.batchNumber && <p className="text-xs opacity-70 mt-0.5">Batch: {p.batchNumber}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${urgencyBadge(p.daysLeft)}`}>
                          {p.daysLeft} day{p.daysLeft !== 1 ? "s" : ""} left
                        </span>
                        <p className="text-xs opacity-70 mt-1 flex items-center gap-1 justify-end"><Calendar size={11} /> {p.expiryDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
