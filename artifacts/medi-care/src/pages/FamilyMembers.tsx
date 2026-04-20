import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Users, Plus, Pencil, Trash2, X, Heart } from "lucide-react";

interface Member { id: number; name: string; relation: string; age?: number; bloodGroup?: string; allergies?: string; medicalConditions?: string; }

const RELATIONS = ["Self", "Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EMPTY = { name: "", relation: "", age: "", bloodGroup: "", allergies: "", medicalConditions: "" };

const RELATION_COLORS: Record<string, string> = {
  Self: "bg-teal-100 text-teal-700", Spouse: "bg-pink-100 text-pink-700",
  Father: "bg-blue-100 text-blue-700", Mother: "bg-purple-100 text-purple-700",
  Son: "bg-green-100 text-green-700", Daughter: "bg-amber-100 text-amber-700",
};

export default function FamilyMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user?.id) return;
    api.getFamily(user.id).then(r => { setMembers(r.members); setLoading(false); });
  };
  useEffect(() => { load(); }, [user?.id]);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, relation: m.relation, age: m.age ? String(m.age) : "", bloodGroup: m.bloodGroup || "", allergies: m.allergies || "", medicalConditions: m.medicalConditions || "" });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { customerId: user!.id, name: form.name, relation: form.relation, age: form.age ? Number(form.age) : null, bloodGroup: form.bloodGroup || null, allergies: form.allergies || null, medicalConditions: form.medicalConditions || null };
    try {
      if (editing) await api.updateFamilyMember(editing.id, payload);
      else await api.addFamilyMember(payload);
      setShowForm(false); load();
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Remove this family member?")) return;
    await api.deleteFamilyMember(id); load();
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-teal-600" />
            <h1 className="text-xl font-bold text-gray-900">Family Members</h1>
          </div>
          <button onClick={openNew} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Member
          </button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No family members added yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Add family members to manage their health records and medicine orders.</p>
            <button onClick={openNew} className="bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Add First Member</button>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg">{m.name[0]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{m.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RELATION_COLORS[m.relation] || "bg-gray-100 text-gray-600"}`}>{m.relation}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {m.age && <span>Age: {m.age}</span>}
                        {m.bloodGroup && <span className="font-semibold text-red-600">Blood: {m.bloodGroup}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => del(m.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
                {(m.allergies || m.medicalConditions) && (
                  <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
                    {m.allergies && <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Allergies</p><p className="text-xs text-gray-700">{m.allergies}</p></div>}
                    {m.medicalConditions && <div><p className="text-xs font-semibold text-gray-400 uppercase mb-1">Conditions</p><p className="text-xs text-gray-700">{m.medicalConditions}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{editing ? "Edit Family Member" : "Add Family Member"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Member name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Relation *</label>
                  <select required value={form.relation} onChange={e => setForm(p => ({ ...p, relation: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
                    <option value="">Select</option>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Age</label>
                  <input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                    placeholder="Age in years" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Known Allergies</label>
                <textarea rows={2} value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))}
                  placeholder="e.g. Penicillin, Sulfa drugs" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Medical Conditions</label>
                <textarea rows={2} value={form.medicalConditions} onChange={e => setForm(p => ({ ...p, medicalConditions: e.target.value }))}
                  placeholder="e.g. Diabetes, Hypertension" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">{saving ? "Saving..." : "Save Member"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
