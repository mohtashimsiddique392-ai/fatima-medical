import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users } from "lucide-react";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getCustomers().then(r => { setCustomers(r.customers); setLoading(false); }); }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Users size={20} className="text-teal-600" />
          <h1 className="text-xl font-bold text-gray-900">Customers ({customers.length})</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Phone", "Referral Code", "Credits", "Orders", "Joined"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold text-xs">{c.name[0]}</div>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 font-mono text-teal-600 text-xs font-semibold">{c.referralCode}</td>
                  <td className="px-4 py-3">
                    <span className="text-amber-600 font-medium">₹{Number(c.referralCredits).toFixed(0)}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{c.totalOrders}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <p className="text-center py-10 text-gray-400">No customers yet.</p>}
        </div>
      </div>
    </div>
  );
}
