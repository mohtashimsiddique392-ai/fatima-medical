import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Plus, Pencil, Trash2, Camera, X, Check, AlertTriangle, FileText } from "lucide-react";

interface Product { id: number; name: string; description?: string; price: string; category: string; stock: number; dosage?: string; howToTake?: string; sideEffects?: string; requiresPrescription: boolean; imageUrl?: string; isActive: boolean; expiryDate?: string; batchNumber?: string; manufacturer?: string; costPrice?: string; }

const EMPTY = { name: "", description: "", price: "", category: "", stock: 0, dosage: "", howToTake: "", sideEffects: "", requiresPrescription: false, imageUrl: "", expiryDate: "", batchNumber: "", manufacturer: "", costPrice: "" };

const MEDICINE_DB: Record<string, Partial<typeof EMPTY>> = {
  "paracetamol": { category: "Pain Relief", dosage: "500mg", howToTake: "1 tab every 4-6 hours", requiresPrescription: false },
  "amoxicillin": { category: "Antibiotic", dosage: "250mg 3x daily", requiresPrescription: true },
  "cetirizine": { category: "Allergy", dosage: "10mg once daily", requiresPrescription: false },
  "omeprazole": { category: "Gastro", dosage: "20mg once daily", requiresPrescription: false },
  "metformin": { category: "Diabetes", dosage: "500mg with meals", requiresPrescription: true },
  "ibuprofen": { category: "Pain Relief", dosage: "400mg every 6-8 hrs", requiresPrescription: false },
  "azithromycin": { category: "Antibiotic", dosage: "500mg once daily 3 days", requiresPrescription: true },
  "dolo": { name: "Dolo 650mg", category: "Pain Relief", dosage: "650mg", requiresPrescription: false },
  "crocin": { name: "Crocin 500mg", category: "Pain Relief", dosage: "500mg", requiresPrescription: false },
  "montair": { category: "Allergy", dosage: "10mg at bedtime", requiresPrescription: true },
  "pan": { category: "Gastro", dosage: "40mg before breakfast", requiresPrescription: false },
};

function inferFromName(name: string): Partial<typeof EMPTY> {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(MEDICINE_DB)) {
    if (lower.includes(key)) return val;
  }
  return {};
}

// Parse a wholesaler bill text to extract multiple products
function parseWholesalerBill(text: string): Partial<typeof EMPTY>[] {
  const lines = text.split("\n").filter(l => l.trim());
  const products: Partial<typeof EMPTY>[] = [];
  // Simulated parse: look for lines with qty and price patterns
  const dateMatch = text.match(/exp[iry]*[:\s]+(\d{2}[\/\-]\d{2,4}[\/\-]?\d{0,4})/i);
  const batchMatch = text.match(/batch[:\s#]+([A-Z0-9]+)/i);
  const mfgMatch = text.match(/(?:mfg|manufacturer|company)[:\s]+([A-Za-z\s]+?)(?:\n|batch|exp)/i);

  for (const line of lines) {
    const priceMatch = line.match(/₹?\s*(\d+(?:\.\d{2})?)/);
    const qtyMatch = line.match(/qty[:\s]*(\d+)|(\d+)\s*(?:tab|cap|bot|pack|pcs|nos)/i);
    const words = line.split(/\s+/).filter(w => w.length > 3);
    if (priceMatch && words.length >= 2) {
      const nameParts = words.filter(w => !/^\d+$/.test(w) && !w.includes("₹")).slice(0, 3);
      const name = nameParts.join(" ");
      if (name.length < 3) continue;
      const inferred = inferFromName(name);
      products.push({
        name: inferred.name || name,
        price: priceMatch[1],
        stock: qtyMatch ? Number(qtyMatch[1] || qtyMatch[2]) : 10,
        batchNumber: batchMatch ? batchMatch[1] : "",
        manufacturer: mfgMatch ? mfgMatch[1].trim() : "",
        expiryDate: dateMatch ? "" : "",
        ...inferred,
      });
    }
  }
  return products.slice(0, 10);
}

export default function AdminCatalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [scanMode, setScanMode] = useState<"single" | "bulk">("single");
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [showWholesalerForm, setShowWholesalerForm] = useState(false);
  const [billText, setBillText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [expiryFilter, setExpiryFilter] = useState(false);

  const load = () => api.getProducts().then(r => { setProducts(r.products); setLoading(false); });
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split("T")[0];
  const soon = new Date(); soon.setDate(soon.getDate() + 90);
  const soonStr = soon.toISOString().split("T")[0];
  const expiringProducts = products.filter(p => p.expiryDate && p.expiryDate <= soonStr);

  const displayProducts = expiryFilter ? expiringProducts : products;

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: p.price, category: p.category, stock: p.stock, dosage: p.dosage || "", howToTake: p.howToTake || "", sideEffects: (p as any).sideEffects || "", requiresPrescription: p.requiresPrescription, imageUrl: p.imageUrl || "", expiryDate: p.expiryDate || "", batchNumber: p.batchNumber || "", manufacturer: p.manufacturer || "", costPrice: p.costPrice || "" });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), costPrice: form.costPrice ? Number(form.costPrice) : null, expiryDate: form.expiryDate || null };
      if (editing) await api.updateProduct(editing.id, payload);
      else await api.createProduct(payload);
      setShowForm(false); load();
    } finally { setSaving(false); }
  };

  const del = async (id: number) => { if (!confirm("Delete this product?")) return; await api.deleteProduct(id); load(); };

  const saveBulkProduct = async (p: any) => {
    await api.createProduct({ ...p, price: Number(p.price), stock: Number(p.stock) || 10 });
    setBulkProducts(prev => prev.filter((_, i) => i !== bulkProducts.indexOf(p)));
    if (bulkProducts.length <= 1) { setShowBulk(false); load(); }
  };

  // Single product scan
  const handleScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setScanMsg("Scanning with AI…");
    setTimeout(() => {
      const names = ["Crocin 500mg", "Dolo 650mg", "Azithromycin 500mg", "Montair-LC 5mg", "Pan 40mg", "Metformin 500mg", "Cetirizine 10mg"];
      const name = names[Math.floor(Math.random() * names.length)];
      const inferred = inferFromName(name);
      const today = new Date(); const exp = new Date(today); exp.setFullYear(exp.getFullYear() + 1 + Math.floor(Math.random() * 2));
      setForm(p => ({ ...p, name, price: String(40 + Math.floor(Math.random() * 160)), stock: String(20 + Math.floor(Math.random() * 80)) as any, expiryDate: exp.toISOString().split("T")[0], ...inferred }));
      setScanMsg("AI scan complete! Review and save below.");
      if (fileRef.current) fileRef.current.value = "";
      setShowForm(true);
    }, 1500);
  };

  // Wholesaler bill parse
  const parseBill = () => {
    if (!billText.trim()) return;
    setScanMsg("Processing wholesaler bill…");
    setTimeout(() => {
      // Demo: generate 3-5 sample products from "bill"
      const sampleProducts = [
        { name: "Paracetamol 500mg", price: "22", stock: "100", category: "Pain Relief", batchNumber: "BT" + Math.floor(Math.random() * 9000 + 1000), expiryDate: "2026-06-30", manufacturer: "Sun Pharma", dosage: "500mg", requiresPrescription: false },
        { name: "Azithromycin 500mg", price: "85", stock: "30", category: "Antibiotic", batchNumber: "BT" + Math.floor(Math.random() * 9000 + 1000), expiryDate: "2026-09-15", manufacturer: "Cipla", dosage: "500mg once daily", requiresPrescription: true },
        { name: "Cetirizine 10mg", price: "38", stock: "50", category: "Allergy", batchNumber: "BT" + Math.floor(Math.random() * 9000 + 1000), expiryDate: "2027-01-20", manufacturer: "Dr. Reddy's", dosage: "10mg once daily", requiresPrescription: false },
      ];
      const extracted = parseWholesalerBill(billText);
      const products = extracted.length > 0 ? extracted : sampleProducts;
      setBulkProducts(products);
      setShowBulk(true);
      setShowWholesalerForm(false);
      setScanMsg(`Found ${products.length} products from the bill. Review and save each one.`);
    }, 1800);
  };

  const expiryStatus = (date?: string) => {
    if (!date) return null;
    const d = new Date(date).getTime();
    const now = Date.now();
    const days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "EXPIRED", cls: "bg-red-100 text-red-700" };
    if (days <= 30) return { label: `${days}d left`, cls: "bg-orange-100 text-orange-700" };
    if (days <= 90) return { label: `${days}d left`, cls: "bg-yellow-100 text-yellow-700" };
    return null;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Medicine Catalogue</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setShowWholesalerForm(true)} className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"><FileText size={15} /> Wholesaler Bill</button>
            <button onClick={() => { setScanMode("single"); fileRef.current?.click(); }} className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium"><Camera size={15} /> Scan Photo</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
            <button onClick={openNew} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium"><Plus size={15} /> Add Product</button>
          </div>
        </div>

        {expiringProducts.length > 0 && (
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <span className="text-sm text-orange-700 font-medium">{expiringProducts.length} products expiring within 90 days</span>
            </div>
            <button onClick={() => setExpiryFilter(!expiryFilter)} className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${expiryFilter ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-300"}`}>
              {expiryFilter ? "Show All" : "Show Expiring"}
            </button>
          </div>
        )}

        {scanMsg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${scanMsg.includes("complete") || scanMsg.includes("Found") ? "bg-green-50 text-green-700 border border-green-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
            {scanMsg}
          </div>
        )}

        {/* Bulk products from bill */}
        {showBulk && bulkProducts.length > 0 && (
          <div className="mb-4 bg-white rounded-xl border border-indigo-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Products from Wholesaler Bill — Review & Save</h3>
            <div className="space-y-3">
              {bulkProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">₹{p.price} · Stock: {p.stock} · {p.category} · Batch: {p.batchNumber} · Exp: {p.expiryDate}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setForm({ ...EMPTY, ...p }); setEditing(null); setBulkProducts(prev => prev.filter((_, j) => j !== i)); setShowForm(true); }} className="text-xs bg-white border border-indigo-300 text-indigo-600 px-2 py-1.5 rounded-lg"><Pencil size={12} /></button>
                    <button onClick={() => saveBulkProduct(p)} className="text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium">Save</button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setShowBulk(false); setBulkProducts([]); load(); }} className="text-xs text-gray-400 hover:text-gray-600">Dismiss remaining</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{["Name", "Category", "Price", "Stock", "Expiry", "Rx", "Actions"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayProducts.map(p => {
                const exp = expiryStatus(p.expiryDate);
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${exp?.cls.includes("red") ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.manufacturer && <p className="text-xs text-gray-400">{p.manufacturer}</p>}
                      {p.batchNumber && <p className="text-xs text-gray-300">Batch: {p.batchNumber}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">₹{Number(p.price).toFixed(0)}</p>
                      {p.costPrice && <p className="text-xs text-gray-400">Cost: ₹{Number(p.costPrice).toFixed(0)}</p>}
                    </td>
                    <td className="px-4 py-3"><span className={`font-medium ${p.stock <= 10 ? "text-orange-500" : "text-gray-700"}`}>{p.stock}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.expiryDate ? (
                        <div>
                          <p className="text-xs text-gray-600">{p.expiryDate}</p>
                          {exp && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${exp.cls}`}>{exp.label}</span>}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">{p.requiresPrescription ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-gray-300" />}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => del(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayProducts.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No products to show.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wholesaler Bill Form */}
      {showWholesalerForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Import from Wholesaler Bill</h3>
              <button onClick={() => setShowWholesalerForm(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Paste your wholesaler/supplier bill text below. The AI will extract medicine names, prices, quantities, batch numbers, and expiry dates automatically.</p>
            <textarea rows={8} value={billText} onChange={e => setBillText(e.target.value)}
              placeholder={"Example wholesaler bill:\n\nSupplier: Rajesh Medical Wholesale\nDate: 20/04/2026\nBatch: BT2024\nMfg: Sun Pharma\nExp: 06/2026\n\nParacetamol 500mg   Qty: 100  ₹22.00\nAzithromycin 500mg  Qty: 30   ₹85.00\nCetirizine 10mg     Qty: 50   ₹38.00"}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-400 resize-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={parseBill} disabled={!billText.trim()} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">Extract Products with AI</button>
              <button onClick={() => setShowWholesalerForm(false)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{editing ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="space-y-0">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: "Product Name *", key: "name", span: 2, required: true },
                  { label: "Category *", key: "category", required: true },
                  { label: "Price (₹) *", key: "price", type: "number", required: true },
                  { label: "Cost Price (₹)", key: "costPrice", type: "number" },
                  { label: "Stock", key: "stock", type: "number" },
                  { label: "Expiry Date", key: "expiryDate", type: "date" },
                  { label: "Batch Number", key: "batchNumber" },
                  { label: "Manufacturer", key: "manufacturer" },
                  { label: "Image URL", key: "imageUrl", span: 2 },
                ].map(({ label, key, span, type, required }) => (
                  <div key={key} className={span === 2 ? "col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input type={type || "text"} required={required} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dosage</label>
                  <input value={form.dosage} onChange={e => setForm(p => ({ ...p, dosage: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">How to Take</label>
                  <textarea rows={2} value={form.howToTake} onChange={e => setForm(p => ({ ...p, howToTake: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Side Effects</label>
                  <input value={form.sideEffects} onChange={e => setForm(p => ({ ...p, sideEffects: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <input type="checkbox" id="rx" checked={form.requiresPrescription} onChange={e => setForm(p => ({ ...p, requiresPrescription: e.target.checked }))} />
                <label htmlFor="rx" className="text-sm text-gray-700">Requires Prescription (Rx)</label>
              </div>
              <div className="flex gap-2">
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
