import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Phone, Award, ShoppingBag, X } from "lucide-react";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { api.getCustomers().then(r => { setCustomers(r.customers); setLoading(false); }); }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Users size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Customers ({customers.length})</h1>
        </div>

        <div className="space-y-3">
          {customers.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className="w-full bg-white rounded-xl border border-gray-100 p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">{c.name?.[0]}</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-blue-600"><ShoppingBag size={11} /> {c.totalOrders} orders</span>
                <span className="flex items-center gap-1 text-amber-600"><Award size={11} /> ₹{Number(c.referralCredits).toFixed(0)} credits</span>
                <span className="text-teal-600 font-mono">{c.referralCode}</span>
              </div>
            </button>
          ))}
          {customers.length === 0 && <p className="text-center py-10 text-gray-400">No customers yet.</p>}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">Customer Details</h2>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">{selected.name?.[0]}</div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{selected.name}</p>
                <p className="text-gray-500 text-sm flex items-center gap-1"><Phone size={12} />{selected.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Total Orders", value: selected.totalOrders, color: "text-blue-600" },
                { label: "Referral Credits", value: `₹${Number(selected.referralCredits).toFixed(2)}`, color: "text-amber-600" },
                { label: "Referral Code", value: selected.referralCode, color: "text-teal-600" },
                { label: "Joined", value: new Date(selected.createdAt).toLocaleDateString("en-IN"), color: "text-gray-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`font-semibold text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            {selected.address && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-xs text-gray-400 mb-1">Address</p>
                <p className="text-sm text-gray-700">{selected.address}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}