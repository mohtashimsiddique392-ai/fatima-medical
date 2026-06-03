import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ShoppingCart, ArrowLeft, AlertTriangle, CheckCircle, Info, Pill, Building, Package, Clock } from "lucide-react";

const COMMON_USES: Record<string, string> = {
  "Pain Relief": "Used to relieve mild to moderate pain, reduce fever, and treat inflammation.",
  "Antibiotic": "Used to treat bacterial infections. Complete the full course as prescribed.",
  "Allergy": "Used to treat allergic reactions, hay fever, urticaria, and related symptoms.",
  "Gastro": "Used to treat acidity, heartburn, stomach ulcers, and digestive issues.",
  "Diabetes": "Used to control blood sugar levels in type 2 diabetes mellitus.",
  "Vitamin & Supplement": "Used to supplement nutritional deficiencies and support overall health.",
  "Cardiac & BP": "Used to manage high blood pressure and related heart conditions.",
  "Hormones & Steroids": "Used to treat hormonal imbalances and inflammatory conditions.",
  "Neurological": "Used to treat neurological and psychiatric conditions under medical supervision.",
  "Skin Care": "Used to treat skin infections, fungal conditions, and dermatological issues.",
  "Eye & Ear Drops": "Used to treat eye/ear infections, inflammation, and related conditions.",
  "Syrup": "Liquid formulation for ease of administration, especially for children.",
};

const AVOID: Record<string, string> = {
  "Pain Relief": "Avoid on empty stomach. Do not exceed recommended dose. Avoid with alcohol.",
  "Antibiotic": "Complete full course. Avoid skipping doses. Take at evenly spaced intervals.",
  "Allergy": "May cause drowsiness. Avoid driving. Avoid alcohol.",
  "Gastro": "Take before meals for best effect. Avoid spicy and fatty foods.",
  "Diabetes": "Monitor blood sugar regularly. Do not skip meals. Avoid alcohol.",
  "Cardiac & BP": "Do not stop suddenly. Monitor BP regularly. Avoid excessive salt.",
  "Hormones & Steroids": "Do not stop abruptly. Take with food. Follow prescribed dosage strictly.",
  "Neurological": "Avoid alcohol. Do not drive until you know how it affects you.",
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { addToCart } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.getProduct(Number(id)).then(p => { setProduct(p); setLoading(false); }).catch(() => navigate("/store"));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    addToCart({ id: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl });
    setAdded(true); setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/store")} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900 flex-1 truncate">{product.name}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-4xl overflow-hidden">
              {product.imageUrl && !product.imageUrl.includes("google.com") ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-2xl" onError={e => (e.currentTarget.style.display = "none")} />
              ) : "💊"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                  {product.saltName && <p className="text-sm text-blue-600 font-medium mt-0.5">{product.saltName}</p>}
                </div>
                {product.requiresPrescription && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Rx</span>}
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-2">₹{Number(product.price).toFixed(2)}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${product.stock > 10 ? "bg-green-500" : product.stock > 0 ? "bg-yellow-500" : "bg-red-500"}`} />
                <span className={`text-xs font-medium ${product.stock > 10 ? "text-green-600" : product.stock > 0 ? "text-yellow-600" : "text-red-600"}`}>
                  {product.stock > 10 ? "In Stock" : product.stock > 0 ? `Only ${product.stock} left` : "Out of Stock"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleAdd} disabled={product.stock === 0 || added}
            className={`w-full mt-4 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${added ? "bg-green-500 text-white" : product.stock === 0 ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
            {added ? <><CheckCircle size={18} /> Added to Cart!</> : product.stock === 0 ? "Out of Stock" : <><ShoppingCart size={18} /> Add to Cart</>}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Pill, label: "Category", value: product.category },
            { icon: Building, label: "Manufacturer", value: product.manufacturer || "—" },
            { icon: Package, label: "Batch No.", value: product.batchNumber || "—" },
            { icon: Clock, label: "Expiry", value: product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 mb-1"><Icon size={13} className="text-blue-400" /><p className="text-xs text-gray-400">{label}</p></div>
              <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {product.dosage && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Pill size={16} className="text-blue-500" /> Dosage</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{product.dosage}</p>
          </div>
        )}

        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><Info size={16} className="text-blue-600" /> Common Uses</h3>
          <p className="text-sm text-blue-800 leading-relaxed">{COMMON_USES[product.category] || product.description || "Consult your pharmacist or doctor for usage information."}</p>
        </div>

        {product.howToTake && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2"><CheckCircle size={16} className="text-green-600" /> How to Take</h3>
            <p className="text-sm text-green-800 leading-relaxed">{product.howToTake}</p>
          </div>
        )}

        {product.sideEffects && (
          <div className="bg-yellow-50 rounded-2xl border border-yellow-100 p-4">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-600" /> Side Effects</h3>
            <p className="text-sm text-yellow-800 leading-relaxed">{product.sideEffects}</p>
          </div>
        )}

        <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Things to Avoid</h3>
          <p className="text-sm text-red-800 leading-relaxed">{AVOID[product.category] || "Follow your doctor's or pharmacist's instructions."}</p>
        </div>

        {product.requiresPrescription && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Prescription Required</p>
              <p className="text-xs text-red-600 mt-1">This medicine requires a valid doctor's prescription. Please carry it when collecting your order.</p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-4">⚕️ Information is for reference only. Always consult a doctor or pharmacist.</p>
      </div>
    </div>
  );
}