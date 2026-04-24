import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Plus, Pencil, Trash2, Camera, X, Check, AlertTriangle, FileText, Image } from "lucide-react";

interface Product { id: number; name: string; description?: string; price: string; category: string; stock: number; dosage?: string; howToTake?: string; sideEffects?: string; requiresPrescription: boolean; imageUrl?: string; isActive: boolean; expiryDate?: string; batchNumber?: string; manufacturer?: string; costPrice?: string; }

const EMPTY = { name: "", description: "", price: "", category: "", stock: 0, dosage: "", howToTake: "", sideEffects: "", requiresPrescription: false, imageUrl: "", expiryDate: "", batchNumber: "", manufacturer: "", costPrice: "" };

function expiryStatus(date?: string) {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "EXPIRED", cls: "bg-red-100 text-red-700" };
  if (days <= 30) return { label: `${days}d left`, cls: "bg-orange-100 text-orange-700" };
  if (days <= 90) return { label: `${days}d left`, cls: "bg-yellow-100 text-yellow-700" };
  return null;
}

async function callGroqVision(base64Image: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ""}`
    },
    body: JSON.stringify({
      model: "llama-3.2-11b-vision-preview",
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        { type: "text", text: prompt }
      ]}],
      max_tokens: 1000,
      temperature: 0.2
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminCatalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [showWholesalerForm, setShowWholesalerForm] = useState(false);
  const [billText, setBillText] = useState("");
  const [billImage, setBillImage] = useState<File | null>(null);
  const [billMode, setBillMode] = useState<"text" | "image">("text");
  const [expiryFilter, setExpiryFilter] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  const scanCameraRef = useRef<HTMLInputElement>(null);
  const scanGalleryRef = useRef<HTMLInputElement>(null);
  const billCameraRef = useRef<HTMLInputElement>(null);
  const billGalleryRef = useRef<HTMLInputElement>(null);

  const load = () => api.getProducts().then(r => { setProducts(r.products); setLoading(false); });
  useEffect(() => { load(); }, []);

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

  const saveBulkProduct = async (p: any, index: number) => {
    await api.createProduct({ ...p, price: Number(p.price), stock: Number(p.stock) || 10 });
    setBulkProducts(prev => prev.filter((_, i) => i !== index));
    if (bulkProducts.length <= 1) { setShowBulk(false); load(); }
  };

  // Single product scan with camera or gallery
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAiProcessing(true);
    setScanMsg("AI is reading the medicine image…");
    try {
      const base64 = await fileToBase64(file);
      const result = await callGroqVision(base64, `Look at this medicine/product image and extract details. Return ONLY a JSON object with these fields:
{
  "name": "full medicine name with strength",
  "category": "one of: Pain Relief, Antibiotic, Allergy, Gastro, Diabetes, Vitamin, Syrup, Supplement, General",
  "price": "estimated MRP number only",
  "dosage": "dosage instructions",
  "howToTake": "how to take",
  "manufacturer": "manufacturer name if visible",
  "batchNumber": "batch number if visible",
  "expiryDate": "YYYY-MM-DD format if visible, else empty string",
  "requiresPrescription": false,
  "stock": 10
}
Return only the JSON, no other text.`);

      try {
        const clean = result.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setForm(p => ({ ...p, ...parsed, price: String(parsed.price || ""), stock: parsed.stock || 10 }));
        setScanMsg("✓ AI scan complete! Review details below and save.");
        setShowForm(true);
      } catch {
        setScanMsg("Could not read image clearly. Please fill details manually.");
        setShowForm(true);
      }
    } catch (err) {
      setScanMsg("AI scan failed. Please try again or add manually.");
    } finally {
      setAiProcessing(false);
      if (scanCameraRef.current) scanCameraRef.current.value = "";
      if (scanGalleryRef.current) scanGalleryRef.current.value = "";
    }
  };

  // Wholesaler bill image scan
  const handleBillImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBillImage(file);
    setBillMode("image");
    setScanMsg("Bill image selected. Click 'Extract Products with AI' to process.");
    if (billCameraRef.current) billCameraRef.current.value = "";
    if (billGalleryRef.current) billGalleryRef.current.value = "";
  };

  // Process wholesaler bill (text or image)
  const parseBill = async () => {
    setAiProcessing(true);
    setScanMsg("AI is processing the wholesaler bill…");
    setShowWholesalerForm(false);
    try {
      let result = "";

      if (billMode === "image" && billImage) {
        const base64 = await fileToBase64(billImage);
        result = await callGroqVision(base64, `This is a wholesaler/supplier medicine bill. Extract ALL medicines listed and return ONLY a JSON array like this:
[
  {
    "name": "medicine name with strength",
    "price": "price number only",
    "stock": quantity as number,
    "category": "Pain Relief/Antibiotic/Allergy/Gastro/Diabetes/Vitamin/Syrup/Supplement/General",
    "batchNumber": "batch if visible",
    "expiryDate": "YYYY-MM-DD if visible else empty string",
    "manufacturer": "manufacturer if visible",
    "dosage": "dosage if visible",
    "requiresPrescription": false
  }
]
Return only the JSON array, no other text.`);
      } else {
        // Text bill — use Groq text model
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ""}`
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: "You are a pharmacy data extraction assistant. Extract medicine details from wholesaler bills and return only valid JSON." },
              { role: "user", content: `Extract all medicines from this wholesaler bill and return ONLY a JSON array:
[{"name":"","price":"","stock":0,"category":"","batchNumber":"","expiryDate":"","manufacturer":"","dosage":"","requiresPrescription":false}]

Bill text:
${billText}

Return only the JSON array, no explanation.` }
            ],
            max_tokens: 1000,
            temperature: 0.1
          })
        });
        const data = await res.json();
        result = data.choices?.[0]?.message?.content || "[]";
      }

      try {
        const clean = result.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setBulkProducts(arr);
        setShowBulk(true);
        setScanMsg(`✓ Found ${arr.length} products from bill. Review and save each one.`);
      } catch {
        setScanMsg("Could not parse bill. Try pasting the text manually.");
        setShowWholesalerForm(true);
      }
    } catch (err) {
      setScanMsg("AI processing failed. Please try again.");
      setShowWholesalerForm(true);
    } finally {
      setAiProcessing(false);
      setBillImage(null);
      setBillText("");
      setBillMode("text");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Medicine Catalogue</h1>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => { setBillMode("text"); setBillImage(null); setBillText(""); setShowWholesalerForm(true); }} className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium"><FileText size={15} /> Wholesaler Bill</button>

            {/* Scan Photo — Camera + Gallery */}
            <div className="flex gap-1">
              <button onClick={() => scanCameraRef.current?.click()} disabled={aiProcessing} className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-3 py-2 rounded-l-lg text-sm font-medium"><Camera size={15} /> Camera</button>
              <button onClick={() => scanGalleryRef.current?.click()} disabled={aiProcessing} className="flex items-center gap-1.5 bg-purple-400 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-2 rounded-r-lg text-sm font-medium"><Image size={15} /> Gallery</button>
            </div>

            {/* Hidden inputs for scan */}
            <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
            <input ref={scanGalleryRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />

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

        {aiProcessing && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Processing with AI — please wait…
          </div>
        )}

        {scanMsg && !aiProcessing && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${scanMsg.includes("✓") ? "bg-green-50 text-green-700 border border-green-200" : scanMsg.includes("failed") || scanMsg.includes("Could not") ? "bg-red-50 text-red-700 border border-red-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
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
                    <p className="text-xs text-gray-500">₹{p.price} · Stock: {p.stock} · {p.category} · Batch: {p.batchNumber} · Exp: {p.expiryDate || "—"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setForm({ ...EMPTY, ...p, price: String(p.price), stock: Number(p.stock) }); setEditing(null); setBulkProducts(prev => prev.filter((_, j) => j !== i)); setShowForm(true); }} className="text-xs bg-white border border-indigo-300 text-indigo-600 px-2 py-1.5 rounded-lg"><Pencil size={12} /></button>
                    <button onClick={() => saveBulkProduct(p, i)} className="text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium">Save</button>
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

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setBillMode("text")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${billMode === "text" ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-600 border-gray-200"}`}>
                📝 Paste Text
              </button>
              <button onClick={() => setBillMode("image")} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${billMode === "image" ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-600 border-gray-200"}`}>
                📷 Photo of Bill
              </button>
            </div>

            {billMode === "text" ? (
              <>
                <p className="text-sm text-gray-500 mb-3">Paste your wholesaler bill text. AI will extract all medicine details automatically.</p>
                <textarea rows={8} value={billText} onChange={e => setBillText(e.target.value)}
                  placeholder={"Supplier: Rajesh Medical\nDate: 20/04/2026\nBatch: BT2024\nExp: 06/2026\n\nParacetamol 500mg   Qty: 100  ₹22.00\nAzithromycin 500mg  Qty: 30   ₹85.00\nCetirizine 10mg     Qty: 50   ₹38.00"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-400 resize-none" />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">Take a photo or upload an image of your wholesaler bill. AI will read and extract all medicines.</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => billCameraRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-indigo-300 rounded-xl py-4 text-sm text-indigo-600 hover:bg-indigo-50">
                    <Camera size={18} /> Take Photo
                  </button>
                  <button onClick={() => billGalleryRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-600 hover:bg-gray-50">
                    <Image size={18} /> From Gallery
                  </button>
                </div>
                {billImage && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                    <Check size={14} /> {billImage.name} selected
                  </div>
                )}
                <input ref={billCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBillImage} />
                <input ref={billGalleryRef} type="file" accept="image/*" className="hidden" onChange={handleBillImage} />
              </>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={parseBill} disabled={billMode === "text" ? !billText.trim() : !billImage} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                Extract Products with AI
              </button>
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
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Product Name *", key: "name", span: 2, required: true },
                  { label: "Category *", key: "category", required: true },
                  { label: "Price (₹) *", key: "price", type: "number", required: true },
                  { label: "Cost Price (₹)", key: "costPrice", type: "number" },
                  { label: "Stock", key: "stock", type: "number" },
                  { label: "Expiry Date", key: "expiryDate", type: "date" },
                  { label: "Batch Number", key: "batchNumber" },
                  { label: "Manufacturer", key: "manufacturer" },
                  { label: "Dosage", key: "dosage", span: 2 },
                  { label: "How to Take", key: "howToTake", span: 2 },
                  { label: "Side Effects", key: "sideEffects", span: 2 },
                  { label: "Image URL", key: "imageUrl", span: 2 },
                ].map(({ label, key, span, type, required }) => (
                  <div key={key} className={span === 2 ? "col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input type={type || "text"} required={required} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="rx" checked={form.requiresPrescription} onChange={e => setForm(p => ({ ...p, requiresPrescription: e.target.checked }))} className="w-4 h-4" />
                  <label htmlFor="rx" className="text-sm text-gray-700">Requires Prescription</label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">{saving ? "Saving…" : editing ? "Update Product" : "Add Product"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}