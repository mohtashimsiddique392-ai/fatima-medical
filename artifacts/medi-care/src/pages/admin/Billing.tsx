import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Search, Plus, Trash2, Download, User, Phone, Camera, X, Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Product { id: number; name: string; saltName?: string; price: string; manufacturer?: string; expiryDate?: string; batchNumber?: string; stock: number; category: string; }
interface BillItem { product_id: number; product_name: string; salt_name: string; manufacturer: string; batch_number: string; expiry_date: string; pack_type: string; quantity: number; mrp: number; gst_rate: number; amount: number; }
interface Settings { store_name: string; address: string; phone: string; gstin?: string; gst_enabled: boolean; cgst_rate: number; sgst_rate: number; }

const PACK_TYPES = ["strip", "bottle", "box", "tube", "sachet", "vial", "piece", "pack"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.createElement("img");
      img.onload = () => {
        const MAX = 1024;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
          else { w = Math.round((w / h) * MAX); h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75).split(",")[1]);
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// SVG Logo
function FatimaLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#0d9488" />
      <path d="M50 15 C30 15 15 30 15 50 C15 68 28 82 45 84 C45 84 42 75 48 68 C54 61 54 53 50 48 C46 43 48 35 55 33 C62 31 68 36 66 44 C64 52 57 55 58 63 C59 71 65 77 65 84 C82 82 85 68 85 50 C85 30 70 15 50 15Z" fill="white" opacity="0.9"/>
      <rect x="44" y="25" width="12" height="35" rx="6" fill="white"/>
      <rect x="32" y="37" width="36" height="12" rx="6" fill="white"/>
      <text x="50" y="95" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">FM</text>
    </svg>
  );
}

export default function AdminBilling() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState<any>(null);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [scanningBatch, setScanningBatch] = useState<number | null>(null);
  const batchScanRef = useRef<HTMLInputElement>(null);
  const batchGalleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getProducts().then(r => setProducts(r.products));
    api.getBillingSettings().then(s => setSettings(s));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    setSearchResults(products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.saltName && p.saltName.toLowerCase().includes(q))
    ).slice(0, 8));
  }, [search, products]);

  const lookupCustomer = async () => {
    if (!customerPhone.trim()) return;
    setLookingUp(true);
    try {
      const c = await api.lookupCustomer(customerPhone);
      setCustomerName(c.name);
      setCustomerAddress(c.address || "");
      setCustomerId(c.id);
    } catch {
      setCustomerName("");
      setCustomerId(null);
      alert("Customer not found. You can enter details manually.");
    } finally { setLookingUp(false); }
  };

  const addItem = (p: Product) => {
    const existing = items.findIndex(i => i.product_id === p.id);
    if (existing >= 0) {
      setItems(prev => prev.map((item, idx) =>
        idx === existing ? { ...item, quantity: item.quantity + 1, amount: (item.quantity + 1) * item.mrp } : item
      ));
    } else {
      setItems(prev => [...prev, {
        product_id: p.id,
        product_name: p.name,
        salt_name: (p as any).saltName || "",
        manufacturer: p.manufacturer || "",
        batch_number: p.batchNumber || "",
        expiry_date: p.expiryDate || "",
        pack_type: "strip",
        quantity: 1,
        mrp: Number(p.price),
        gst_rate: 0,
        amount: Number(p.price)
      }]);
    }
    setSearch("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "mrp") {
        updated.amount = updated.quantity * updated.mrp;
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const gstAmount = settings?.gst_enabled
    ? items.reduce((s, i) => s + (i.amount * (i.gst_rate / 100)), 0)
    : 0;
  const totalAfterDiscount = subtotal - discount;
  const finalTotal = totalAfterDiscount + gstAmount;

  const handleBatchScan = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const data = await api.scanImage({ image: base64, type: "batch" });
      if (data.result?.batchNumber) {
        updateItem(idx, "batch_number", data.result.batchNumber);
      }
    } catch { }
    if (batchScanRef.current) batchScanRef.current.value = "";
    if (batchGalleryRef.current) batchGalleryRef.current.value = "";
    setScanningBatch(null);
  };

  const saveBill = async () => {
    if (!items.length) return alert("Add at least one item");
    setSaving(true);
    try {
      const result = await api.createBill({
        customer_id: customerId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        items,
        subtotal,
        discount,
        total_after_discount: totalAfterDiscount,
        gst_amount: gstAmount,
        final_total: finalTotal,
        payment_method: paymentMethod,
        notes,
        created_by: user?.id || null
      });
      setSavedBill(result);
      setShowBillPreview(true);
    } catch (e: any) {
      alert("Failed to save bill: " + e.message);
    } finally { setSaving(false); }
  };
    
const printBill = () => {
  if (!savedBill) return;
  const { bill, items: billItems, settings: s } = savedBill;

  const gstRows = s.gst_enabled ? `
    <tr><td colspan="6" style="text-align:right;padding:4px 8px;color:#666;">CGST (${s.cgst_rate}%)</td><td style="padding:4px 8px;text-align:right;">₹${(Number(bill.gst_amount) / 2).toFixed(2)}</td></tr>
    <tr><td colspan="6" style="text-align:right;padding:4px 8px;color:#666;">SGST (${s.sgst_rate}%)</td><td style="padding:4px 8px;text-align:right;">₹${(Number(bill.gst_amount) / 2).toFixed(2)}</td></tr>
  ` : "";

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Bill ${bill.bill_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 24px; }
    .header { background: linear-gradient(135deg, #0d9488, #0f766e); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 16px; }
    .logo-circle { width: 56px; height: 56px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .store-name { font-size: 22px; font-weight: bold; }
    .store-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }
    .bill-meta { background: #f0fdfa; border: 1px solid #99f6e4; padding: 14px 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .bill-no { font-size: 16px; font-weight: bold; color: #0d9488; }
    .bill-date { color: #666; font-size: 11px; }
    .customer-section { padding: 14px 24px; border-bottom: 1px solid #e5e7eb; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 4px; }
    .customer-name { font-size: 14px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    .items-table th { background: #0d9488; color: white; padding: 9px 8px; text-align: left; font-size: 11px; }
    .items-table td { padding: 9px 8px; border-bottom: 1px solid #f3f4f6; font-size: 11px; vertical-align: top; }
    .medicine-name { font-weight: 600; }
    .salt-name { font-size: 10px; color: #0d9488; margin-top: 1px; }
    .meta-text { font-size: 10px; color: #888; }
    .totals { padding: 16px 24px; background: #f9fafb; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .total-final { font-size: 16px; font-weight: bold; color: #0d9488; border-top: 2px solid #0d9488; margin-top: 8px; padding-top: 8px; }
    .footer { background: #0d9488; color: white; padding: 12px 24px; border-radius: 0 0 12px 12px; text-align: center; font-size: 10px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-circle">
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" fill="#0d9488"/>
        <rect x="44" y="20" width="12" height="40" rx="6" fill="white"/>
        <rect x="30" y="34" width="40" height="12" rx="6" fill="white"/>
        <path d="M35 65 Q50 80 65 65" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
      </svg>
    </div>
    <div>
      <div class="store-name">${s.store_name}</div>
      <div class="store-sub">${s.address || ""}</div>
      <div class="store-sub">Tel: ${s.phone || ""} ${s.gstin ? "| GSTIN: " + s.gstin : ""}</div>
    </div>
  </div>

  <div class="bill-meta">
    <div>
      <div class="bill-no">Bill #${bill.bill_number}</div>
      <div class="bill-date">${new Date(bill.created_at).toLocaleString("en-IN")}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#666;">Payment: <strong>${(bill.payment_method || "cash").toUpperCase()}</strong></div>
    </div>
  </div>

  ${bill.customer_name ? `
  <div class="customer-section">
    <div class="section-title">Bill To</div>
    <div class="customer-name">${bill.customer_name}</div>
    ${bill.customer_phone ? `<div style="color:#666;font-size:11px;">Tel: ${bill.customer_phone}</div>` : ""}
    ${bill.customer_address ? `<div style="color:#666;font-size:11px;">${bill.customer_address}</div>` : ""}
  </div>` : ""}

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Medicine</th>
        <th style="width:60px;">Pack</th>
        <th style="width:40px;text-align:center;">Qty</th>
        <th style="width:70px;text-align:right;">MRP</th>
        ${s.gst_enabled ? "<th style='width:50px;text-align:center;'>GST%</th>" : ""}
        <th style="width:80px;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${billItems.map((item: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="medicine-name">${item.product_name}</div>
          ${item.salt_name ? `<div class="salt-name">${item.salt_name}</div>` : ""}
          ${item.manufacturer ? `<div class="meta-text">${item.manufacturer}</div>` : ""}
          ${item.batch_number ? `<div class="meta-text">Batch: ${item.batch_number}</div>` : ""}
          ${item.expiry_date ? `<div class="meta-text">Exp: ${item.expiry_date}</div>` : ""}
        </td>
        <td>${item.pack_type}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">Rs.${Number(item.mrp).toFixed(2)}</td>
        ${s.gst_enabled ? `<td style="text-align:center;">${item.gst_rate || 0}%</td>` : ""}
        <td style="text-align:right;font-weight:600;">Rs.${Number(item.amount).toFixed(2)}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div style="max-width:250px;margin-left:auto;">
      <div class="total-row"><span style="color:#666;">Subtotal</span><span>Rs.${Number(bill.subtotal).toFixed(2)}</span></div>
      ${Number(bill.discount) > 0 ? `<div class="total-row" style="color:#dc2626;"><span>Discount</span><span>-Rs.${Number(bill.discount).toFixed(2)}</span></div>` : ""}
      ${Number(bill.discount) > 0 ? `<div class="total-row"><span style="color:#666;">After Discount</span><span>Rs.${Number(bill.total_after_discount).toFixed(2)}</span></div>` : ""}
      ${gstRows}
      <div class="total-row total-final"><span>TOTAL</span><span>Rs.${Number(bill.final_total).toFixed(2)}</span></div>
    </div>
  </div>

  <div class="footer">
    <div>Thank you for choosing ${s.store_name}!</div>
    <div style="margin-top:4px;opacity:0.8;">Computer generated bill</div>
    ${s.gstin ? `<div style="margin-top:2px;opacity:0.8;">GSTIN: ${s.gstin}</div>` : ""}
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="background:#0d9488;color:white;border:none;padding:10px 30px;border-radius:8px;font-size:14px;cursor:pointer;margin-right:10px;">🖨️ Print</button>
<button onclick="downloadPDF()" style="background:#1E40AF;color:white;border:none;padding:10px 30px;border-radius:8px;font-size:14px;cursor:pointer;margin-right:10px;">⬇️ Download PDF</button>
<button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:10px 30px;border-radius:8px;font-size:14px;cursor:pointer;">✕ Close</button>
</div>
<script>
function downloadPDF() {
  const s = document.createElement('style');
  s.textContent = '.no-print{display:none!important}';
  document.head.appendChild(s);
  window.print();
  setTimeout(() => document.head.removeChild(s), 1000);
}
</script>
  </div>
</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups for this site to print bills.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">New Bill</h1>
          <div className="flex items-center gap-2">
            <FatimaLogo size={32} />
            <span className="text-sm font-semibold text-teal-700">{settings?.store_name}</span>
          </div>
        </div>

        {/* Customer Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><User size={16} /> Customer (Optional)</h3>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Search app customer by phone..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400" />
            </div>
            <button onClick={lookupCustomer} disabled={lookingUp}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {lookingUp ? "..." : "Find"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer name (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
            <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
              placeholder="Address (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
          </div>
          {customerId && <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><Check size={12} /> App customer linked — purchase will appear in their order history</p>}
        </div>

        {/* Medicine Search */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">Add Medicines</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search medicine by name or salt..."
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400" />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1 max-h-64 overflow-y-auto">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="w-full text-left px-4 py-3 hover:bg-teal-50 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {(p as any).saltName && <p className="text-xs text-teal-600">{(p as any).saltName}</p>}
                    <p className="text-xs text-gray-500">₹{Number(p.price).toFixed(2)} · Stock: {p.stock}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bill Items */}
           {items.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Bill Items ({items.length})</p>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.product_name}</p>
                      {item.salt_name && <p className="text-xs text-teal-600">{item.salt_name}</p>}
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Pack Type</label>
                      <select value={item.pack_type} onChange={e => updateItem(idx, "pack_type", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400">
                        {PACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Quantity</label>
                      <input type="number" min="1" value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">MRP (₹)</label>
                      <input type="number" value={item.mrp}
                        onChange={e => updateItem(idx, "mrp", Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Batch # (optional)</label>
                      <div className="flex gap-1">
                        <input value={item.batch_number} onChange={e => updateItem(idx, "batch_number", e.target.value)}
                          placeholder="Batch"
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
                        <button onClick={() => { setScanningBatch(idx); batchScanRef.current?.click(); }}
                          className="border border-gray-200 rounded-lg px-1.5 text-gray-500 hover:bg-gray-50">
                          <Camera size={11} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Expiry</label>
                      <input value={item.expiry_date} onChange={e => updateItem(idx, "expiry_date", e.target.value)}
                        placeholder="MM/YYYY"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
                    </div>
                    {settings?.gst_enabled && (
                      <div>
                        <label className="text-xs text-gray-500 mb-0.5 block">GST %</label>
                        <input type="number" value={item.gst_rate}
                          onChange={e => updateItem(idx, "gst_rate", Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end mt-2">
                    <span className="text-sm font-bold text-teal-700">₹{item.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden batch scan inputs */}
        <input ref={batchScanRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => scanningBatch !== null && handleBatchScan(e, scanningBatch)} />
        <input ref={batchGalleryRef} type="file" accept="image/*" className="hidden"
          onChange={e => scanningBatch !== null && handleBatchScan(e, scanningBatch)} />

        {/* Totals & Payment */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-24">Discount (₹)</span>
                <input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>
              {discount > 0 && <div className="flex justify-between text-sm text-red-600"><span>After Discount</span><span>₹{totalAfterDiscount.toFixed(2)}</span></div>}
              {settings?.gst_enabled && gstAmount > 0 && (
                <>
                  <div className="flex justify-between text-xs text-gray-500"><span>CGST ({settings.cgst_rate}%)</span><span>₹{(gstAmount / 2).toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs text-gray-500"><span>SGST ({settings.sgst_rate}%)</span><span>₹{(gstAmount / 2).toFixed(2)}</span></div>
                </>
              )}
              <div className="flex justify-between text-base font-bold text-teal-700 border-t border-gray-100 pt-2">
                <span>TOTAL</span><span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {["cash", "upi", "card"].map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all capitalize ${paymentMethod === m ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-600 border-gray-200"}`}>
                  {m === "upi" ? "UPI" : m}
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none mb-3" />
            <button onClick={saveBill} disabled={saving || !items.length}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm">
              {saving ? "Saving..." : "Save & Generate Bill"}
            </button>
          </div>
        )}

        {/* Bill Preview Modal */}
        {showBillPreview && savedBill && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-5 rounded-t-2xl flex items-center gap-4">
                <FatimaLogo size={44} />
                <div className="text-white">
                  <p className="font-bold text-lg">{savedBill.settings.store_name}</p>
                  <p className="text-xs opacity-80">{savedBill.settings.address}</p>
                  <p className="text-xs opacity-80">{savedBill.settings.phone}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-3 bg-teal-50 rounded-lg p-3">
                  <div>
                    <p className="font-bold text-teal-700 text-lg">#{savedBill.bill.bill_number}</p>
                    <p className="text-xs text-gray-500">{new Date(savedBill.bill.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full font-medium capitalize">{savedBill.bill.payment_method}</span>
                </div>
                {savedBill.bill.customer_name && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                    <p className="font-medium text-gray-900">{savedBill.bill.customer_name}</p>
                    {savedBill.bill.customer_phone && <p className="text-xs text-gray-500">{savedBill.bill.customer_phone}</p>}
                  </div>
                )}
                <div className="space-y-2 mb-3">
                  {savedBill.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start py-2 border-b border-gray-50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        {item.salt_name && <p className="text-xs text-teal-600">{item.salt_name}</p>}
                        <p className="text-xs text-gray-400">{item.pack_type} × {item.quantity} @ ₹{Number(item.mrp).toFixed(2)}</p>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">₹{Number(item.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>₹{Number(savedBill.bill.subtotal).toFixed(2)}</span></div>
                  {Number(savedBill.bill.discount) > 0 && <div className="flex justify-between text-sm text-red-600"><span>Discount</span><span>-₹{Number(savedBill.bill.discount).toFixed(2)}</span></div>}
                  {Number(savedBill.bill.gst_amount) > 0 && <div className="flex justify-between text-sm"><span>GST</span><span>₹{Number(savedBill.bill.gst_amount).toFixed(2)}</span></div>}
                  <div className="flex justify-between text-base font-bold text-teal-700 border-t border-gray-200 pt-2">
                    <span>TOTAL</span><span>₹{Number(savedBill.bill.final_total).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={printBill}
                    className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <Download size={16} /> Download / Print
                  </button>
                  <button onClick={() => {
                    setShowBillPreview(false);
                    setSavedBill(null);
                    setItems([]);
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerAddress("");
                    setCustomerId(null);
                    setDiscount(0);
                    setNotes("");
                  }} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600">
                    New Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}