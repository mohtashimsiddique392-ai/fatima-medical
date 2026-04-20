import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Plus, Pencil, Trash2, Camera, X, Check } from "lucide-react";

interface Product { id: number; name: string; description?: string; price: string; category: string; stock: number; dosage?: string; howToTake?: string; sideEffects?: string; requiresPrescription: boolean; imageUrl?: string; isActive: boolean; }

const EMPTY = { name: "", description: "", price: "", category: "", stock: 0, dosage: "", howToTake: "", sideEffects: "", requiresPrescription: false, imageUrl: "" };

export default function AdminCatalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.getProducts().then(r => { setProducts(r.products); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description || "", price: p.price, category: p.category, stock: p.stock, dosage: p.dosage || "", howToTake: p.howToTake || "", sideEffects: (p as any).sideEffects || "", requiresPrescription: p.requiresPrescription, imageUrl: p.imageUrl || "" }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.updateProduct(editing.id, { ...form, price: Number(form.price), stock: Number(form.stock) });
      else await api.createProduct({ ...form, price: Number(form.price), stock: Number(form.stock) });
      setShowForm(false); load();
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await api.deleteProduct(id); load();
  };

  // Simulated AI photo scan
  const handleScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanMsg("Scanning image with AI...");
    setTimeout(() => {
      // Simulate AI extraction
      const names = ["Crocin 500mg", "Dolo 650mg", "Azithromycin 500mg", "Montair-LC", "Pan 40mg"];
      const cats = ["Pain Relief", "Antibiotic", "Allergy", "Gastro"];
      const name = names[Math.floor(Math.random() * names.length)];
      setForm(p => ({ ...p, name, category: cats[Math.floor(Math.random() * cats.length)], price: String(Math.floor(40 + Math.random() * 200)) }));
      setScanMsg("AI scan complete! Review and edit details below.");
      if (fileRef.current) fileRef.current.value = "";
    }, 1500);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Medicine Catalogue</h1>
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Camera size={16} /> Scan Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
            <button onClick={openNew} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {scanMsg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${scanMsg.includes("complete") ? "bg-green-50 text-green-700 border border-green-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
            {scanMsg} {scanMsg.includes("complete") && <button onClick={() => { setScanMsg(""); setShowForm(true); }} className="underline font-medium ml-1">Add Product</button>}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Category", "Price", "Stock", "Rx", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-48">{p.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(p.price).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${p.stock <= 10 ? "text-orange-500" : "text-gray-700"}`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.requiresPrescription ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-gray-300" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                      <button onClick={() => del(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center py-10 text-gray-400">No products yet. Add your first product.</p>}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{editing ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              {[
                { label: "Product Name", key: "name", span: 2, required: true },
                { label: "Category", key: "category", required: true },
                { label: "Price (₹)", key: "price", type: "number", required: true },
                { label: "Stock", key: "stock", type: "number" },
                { label: "Image URL", key: "imageUrl", span: 2 },
              ].map(({ label, key, span, type, required }) => (
                <div key={key} className={span === 2 ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type || "text"} required={required} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
                <input value={form.dosage} onChange={e => setForm(p => ({ ...p, dosage: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">How to Take</label>
                <textarea rows={2} value={form.howToTake} onChange={e => setForm(p => ({ ...p, howToTake: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="rx" checked={form.requiresPrescription} onChange={e => setForm(p => ({ ...p, requiresPrescription: e.target.checked }))} />
                <label htmlFor="rx" className="text-sm text-gray-700">Requires Prescription (Rx)</label>
              </div>
              <div className="col-span-2 flex gap-2 mt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">{saving ? "Saving..." : "Save Product"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
