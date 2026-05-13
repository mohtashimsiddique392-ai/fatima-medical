import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Store } from "lucide-react";

export default function StoreSettings() {
  const [form, setForm] = useState({
    store_name: "",
    address: "",
    phone: "",
    gstin: "",
    gst_enabled: false,
    cgst_rate: 6,
    sgst_rate: 6
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getBillingSettings().then(s => {
      if (s) setForm({
        store_name: s.store_name || "",
        address: s.address || "",
        phone: s.phone || "",
        gstin: s.gstin || "",
        gst_enabled: s.gst_enabled || false,
        cgst_rate: s.cgst_rate || 6,
        sgst_rate: s.sgst_rate || 6
      });
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateBillingSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Store size={22} className="text-teal-600" />
          <h1 className="text-xl font-bold text-gray-900">Store Settings</h1>
        </div>
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          {[
            { label: "Store Name", key: "store_name" },
            { label: "Address", key: "address" },
            { label: "Phone", key: "phone" },
            { label: "GSTIN (optional)", key: "gstin" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
          ))}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="gst"
                checked={form.gst_enabled}
                onChange={e => setForm(p => ({ ...p, gst_enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="gst" className="text-sm font-medium text-gray-700">
                Enable GST on bills
              </label>
            </div>
            {form.gst_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CGST Rate (%)</label>
                  <input
                    type="number"
                    value={form.cgst_rate}
                    onChange={e => setForm(p => ({ ...p, cgst_rate: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SGST Rate (%)</label>
                  <input
                    type="number"
                    value={form.sgst_rate}
                    onChange={e => setForm(p => ({ ...p, sgst_rate: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            {saved ? <><Save size={15} /> Saved!</> : saving ? "Saving..." : <><Save size={15} /> Save Settings</>}
          </button>
        </form>
      </div>
    </div>
  );
}