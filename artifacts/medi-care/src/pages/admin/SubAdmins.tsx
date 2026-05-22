import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Plus, Pencil, Trash2, X, Check, Shield } from "lucide-react";

interface SubAdmin { id: number; username: string; name: string; phone: string; permissions: any; is_active: boolean; }

const PERMISSION_LABELS: Record<string, string> = {
  catalogue: "Catalogue", orders: "Orders", billing: "Billing",
  customers: "Customers", dashboard: "Dashboard"
};

export default function SubAdmins() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SubAdmin | null>(null);
  const [form, setForm] = useState<{ username: string; password: string; name: string; phone: string; permissions: Record<string, boolean> }>({ username: "", password: "", name: "", phone: "", permissions: { catalogue: true, orders: true, billing: true, customers: false, dashboard: false } });
  const [saving, setSaving] = useState(false);

  const load = () => api.getSubAdmins().then(r => setSubAdmins(r.subAdmins));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ username: "", password: "", name: "", phone: "", permissions: { catalogue: true, orders: true, billing: true, customers: false, dashboard: false } as Record<string, boolean> }); setShowForm(true); };
  const openEdit = (s: SubAdmin) => { setEditing(s); setForm({ username: s.username, password: "", name: s.name, phone: s.phone || "", permissions: s.permissions }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.updateSubAdmin(editing.id, { name: form.name, phone: form.phone, permissions: form.permissions, is_active: true, ...(form.password && { password: form.password }) });
      else await api.createSubAdmin(form);
      setShowForm(false); load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: number) => {
    if (!confirm("Deactivate this sub-admin?")) return;
    await api.deleteSubAdmin(id); load();
  };

  const togglePermission = (key: string) => {
    if (key === "catalogue" || key === "orders") return; // always on
    setForm(p => ({ ...p, permissions: { ...p.permissions, [key]: !p.permissions[key] } }));
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Sub-Admins</h1>
          <button onClick={openNew} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={15} /> Add Sub-Admin
          </button>
        </div>

        <div className="space-y-3">
          {subAdmins.map(s => (
            <div key={s.id} className={`bg-white rounded-xl border p-4 ${!s.is_active ? "opacity-50 border-gray-100" : "border-gray-100"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <Shield size={18} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">@{s.username} {s.phone && `· ${s.phone}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                  <button onClick={() => deactivate(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.permissions[key] ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                    {s.permissions[key] ? "✓" : "✗"} {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {subAdmins.length === 0 && <div className="text-center py-12 text-gray-400">No sub-admins yet. Add one to get started.</div>}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{editing ? "Edit Sub-Admin" : "Add Sub-Admin"}</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={save} className="space-y-3">
              {[
                { label: "Full Name *", key: "name", required: true },
                { label: "Username *", key: "username", required: !editing, disabled: !!editing },
                { label: editing ? "New Password (leave blank to keep)" : "Password *", key: "password", type: "password", required: !editing },
                { label: "Phone", key: "phone" },
              ].map(({ label, key, type, required, disabled }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type || "text"} required={required} disabled={disabled}
                    value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 disabled:bg-gray-50" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                    const locked = key === "catalogue" || key === "orders";
                    return (
                      <button key={key} type="button" onClick={() => togglePermission(key)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${form.permissions[key] ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-gray-50 border-gray-200 text-gray-500"} ${locked ? "opacity-70 cursor-not-allowed" : ""}`}>
                        {form.permissions[key] ? <Check size={14} /> : <X size={14} />}
                        {label} {locked && "(always on)"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? "Saving..." : editing ? "Update" : "Create Sub-Admin"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}