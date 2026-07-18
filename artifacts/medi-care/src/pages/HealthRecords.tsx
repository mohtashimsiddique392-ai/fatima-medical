import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Heart, Plus, Trash2, X, Activity } from "lucide-react";

interface Member { id: number; name: string; relation: string; }
interface Record { id: number; type: string; value: string; unit?: string; memberName?: string; familyMemberId?: number; recordedAt: string; notes?: string; }

const RECORD_TYPES = [
  { value: "blood_pressure", label: "Blood Pressure", unit: "mmHg", icon: "🩺", color: "bg-red-100 text-red-700" },
  { value: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", icon: "🩸", color: "bg-orange-100 text-orange-700" },
  { value: "weight", label: "Weight", unit: "kg", icon: "⚖️", color: "bg-blue-100 text-blue-700" },
  { value: "temperature", label: "Temperature", unit: "°F", icon: "🌡️", color: "bg-yellow-100 text-yellow-700" },
  { value: "heart_rate", label: "Heart Rate", unit: "bpm", icon: "💗", color: "bg-pink-100 text-pink-700" },
  { value: "oxygen", label: "Oxygen Level", unit: "%", icon: "💨", color: "bg-teal-100 text-teal-700" },
  { value: "cholesterol", label: "Cholesterol", unit: "mg/dL", icon: "🫀", color: "bg-purple-100 text-purple-700" },
  { value: "other", label: "Other", unit: "", icon: "📋", color: "bg-gray-100 text-gray-700" },
];

const getTypeInfo = (type: string) => RECORD_TYPES.find(t => t.value === type) || RECORD_TYPES[RECORD_TYPES.length - 1];

export default function HealthRecords() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "blood_pressure", value: "", familyMemberId: "", notes: "", recordedAt: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);

  const loadRecords = (memberId?: string) => {
    if (!user?.id) return;
    const fId = memberId && memberId !== "all" ? Number(memberId) : undefined;
    api.getHealthRecords(fId).then(r => { setRecords(r.records); setLoading(false); });
  };

  useEffect(() => {
    if (!user?.id) return;
    api.getFamily().then(r => setMembers(r.members));
    loadRecords();
  }, [user?.id]);

  useEffect(() => { loadRecords(selectedMember); }, [selectedMember]);

  const getAutoUnit = (type: string) => getTypeInfo(type)?.unit || "";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fId = form.familyMemberId ? Number(form.familyMemberId) : null;
    const memberName = fId ? members.find(m => m.id === fId)?.name : user?.name;
    try {
      await api.addHealthRecord({ familyMemberId: fId, memberName, type: form.type, value: form.value, unit: getAutoUnit(form.type), notes: form.notes || null, recordedAt: form.recordedAt });
      setShowForm(false); loadRecords(selectedMember);
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this record?")) return;
    await api.deleteHealthRecord(id); loadRecords(selectedMember);
  };

  const allMembers = [{ id: 0, name: user?.name || "Me", relation: "Self" }, ...members];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-teal-600" />
            <h1 className="text-xl font-bold text-gray-900">Health Records</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Record
          </button>
        </div>

        {/* Member Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          <button onClick={() => setSelectedMember("all")} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedMember === "all" ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-600 border-gray-200"}`}>All Members</button>
          {allMembers.map(m => (
            <button key={m.id} onClick={() => setSelectedMember(m.id === 0 ? "all" : String(m.id))}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedMember === String(m.id) ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-600 border-gray-200"}`}>
              {m.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-100" />)}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No health records yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Track blood pressure, sugar levels, weight and more.</p>
            <button onClick={() => setShowForm(true)} className="bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium">Add First Record</button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(r => {
              const info = getTypeInfo(r.type);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${info.color.replace("text-", "bg-").replace("bg-", "bg-opacity-20 bg-")} `}>
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-gray-900 text-sm">{info.label}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{r.memberName || user?.name}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{r.value} <span className="text-sm font-normal text-gray-400">{r.unit}</span></p>
                    <p className="text-xs text-gray-400">{new Date(r.recordedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    {r.notes && <p className="text-xs text-gray-500 mt-1">{r.notes}</p>}
                  </div>
                  <button onClick={() => del(r.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Add Health Record</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Record Type *</label>
                <select required value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
                  {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}{t.unit ? ` (${t.unit})` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value *</label>
                  <input required placeholder={`e.g. ${form.type === "blood_pressure" ? "120/80" : form.type === "blood_sugar" ? "100" : "70"}`}
                    value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">For Member</label>
                  <select value={form.familyMemberId} onChange={e => setForm(p => ({ ...p, familyMemberId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
                    <option value="">Myself</option>
                    {members.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
                <input type="datetime-local" value={form.recordedAt} onChange={e => setForm(p => ({ ...p, recordedAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input placeholder="Any additional notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">{saving ? "Saving..." : "Save Record"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
