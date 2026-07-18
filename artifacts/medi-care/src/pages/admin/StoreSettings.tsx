import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Save, Power, AlertTriangle } from "lucide-react";

export default function StoreSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });
  const [saving, setSaving] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedMaint, setSavedMaint] = useState(false);

  useEffect(() => {
    api.getBillingSettings().then(s => setSettings(s));
    api.getMaintenanceStatus().then(d => setMaintenance({ enabled: d.maintenanceMode, message: d.maintenanceMessage }));
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.updateBillingSettings(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  };

  const toggleMaintenance = async () => {
    setSavingMaint(true);
    try {
      await api.updateMaintenanceMode({ enabled: !maintenance.enabled, message: maintenance.message });
      setMaintenance(m => ({ ...m, enabled: !m.enabled }));
      setSavedMaint(true); setTimeout(() => setSavedMaint(false), 2000);
    } finally { setSavingMaint(false); }
  };

  const saveMaintMessage = async () => {
    setSavingMaint(true);
    try {
      await api.updateMaintenanceMode({ enabled: maintenance.enabled, message: maintenance.message });
      setSavedMaint(true); setTimeout(() => setSavedMaint(false), 2000);
    } finally { setSavingMaint(false); }
  };

  if (!settings) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Store Settings</h1>

        <div className={`rounded-2xl border-2 p-5 ${maintenance.enabled ? "bg-red-50 border-red-300" : "bg-white border-gray-100"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Power size={18} className={maintenance.enabled ? "text-red-500" : "text-gray-400"} />
              <h2 className="font-bold text-gray-900">Maintenance Mode</h2>
            </div>
            <button onClick={toggleMaintenance} disabled={savingMaint}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${maintenance.enabled ? "bg-red-500" : "bg-gray-300"}`}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${maintenance.enabled ? "translate-x-7" : "translate-x-0.5"}`} />
            </button>
          </div>
          {maintenance.enabled && (
            <div className="flex items-center gap-2 mb-3 bg-red-100 rounded-xl p-3">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">App is currently in maintenance mode — customers cannot access it</p>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">When enabled, customers see a maintenance screen instead of the app.</p>
          <textarea value={maintenance.message} onChange={e => setMaintenance(m => ({ ...m, message: e.target.value }))}
            placeholder="Maintenance message shown to customers..." rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none mb-3" />
          <button onClick={saveMaintMessage} disabled={savingMaint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {savedMaint ? "✓ Saved" : "Save Message"}
          </button>
        </div>

        <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Store Information</h2>
          {[
            { label: "Store Name", key: "store_name" },
            { label: "Address", key: "address" },
            { label: "Phone", key: "phone" },
            { label: "GSTIN", key: "gstin" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
              <input value={settings[key] || ""} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="gst" checked={settings.gst_enabled || false}
              onChange={e => setSettings((s: any) => ({ ...s, gst_enabled: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="gst" className="text-sm text-gray-700">Enable GST</label>
          </div>
          {settings.gst_enabled && (
            <div className="grid grid-cols-2 gap-3">
              {[["CGST Rate (%)", "cgst_rate"], ["SGST Rate (%)", "sgst_rate"]].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input type="number" step="0.5" value={settings[key] || ""} onChange={e => setSettings((s: any) => ({ ...s, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              ))}
            </div>
          )}
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50">
            <Save size={16} />{saved ? "✓ Saved!" : saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}