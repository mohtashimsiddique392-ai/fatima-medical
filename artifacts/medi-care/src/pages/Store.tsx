import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ShoppingCart, Search, MessageCircle, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";

interface Product { id: number; name: string; saltName?: string; price: string; category: string; stock: number; requiresPrescription: boolean; imageUrl?: string; }

const CAT_COLORS: Record<string, string> = {
  "Pain Relief": "bg-red-100 text-red-700", "Antibiotic": "bg-yellow-100 text-yellow-700",
  "Allergy": "bg-purple-100 text-purple-700", "Gastro": "bg-orange-100 text-orange-700",
  "Diabetes": "bg-blue-100 text-blue-700", "Vitamin & Supplement": "bg-green-100 text-green-700",
  "Syrup": "bg-pink-100 text-pink-700", "Injection": "bg-red-100 text-red-800",
  "Cream & Ointment": "bg-amber-100 text-amber-700", "Baby Care": "bg-rose-100 text-rose-700",
  "Surgical & Dressing": "bg-gray-100 text-gray-700", "Hygiene & Sanitizer": "bg-cyan-100 text-cyan-700",
  "Health Drink & Nutrition": "bg-lime-100 text-lime-700", "Ayurvedic": "bg-emerald-100 text-emerald-700",
  "Eye & Ear Drops": "bg-sky-100 text-sky-700", "Cardiac & BP": "bg-red-100 text-red-600",
  "Skin Care": "bg-fuchsia-100 text-fuchsia-700", "Women Health": "bg-pink-100 text-pink-700",
  "Neurological": "bg-violet-100 text-violet-700", "Hormones & Steroids": "bg-indigo-100 text-indigo-700",
  "General OTC": "bg-gray-100 text-gray-600",
};

export default function Store() {
  const { addToCart, cartCount } = useAuth();
  const [, navigate] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<number | null>(null);

  useEffect(() => { api.getCategories().then(r => setCategories(r.categories)); }, []);
  useEffect(() => { loadProducts(); }, [search, category]);

  const loadProducts = async () => {
    setLoading(true);
    try { const r = await api.getProducts({ search: search || undefined, category: category || undefined }); setProducts(r.products); }
    finally { setLoading(false); }
  };

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    addToCart({ id: p.id, name: p.name, price: Number(p.price), imageUrl: p.imageUrl, stock: p.stock });
    setAdded(p.id); setTimeout(() => setAdded(null), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fatima Medical Store</h1>
              <p className="text-sm text-gray-500">Your trusted neighbourhood pharmacy</p>
            </div>
            <Link href="/cart">
              <button className="relative flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <ShoppingCart size={16} /> Cart
                {cartCount > 0 && <span className="bg-yellow-400 text-blue-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>}
              </button>
            </Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search medicines or salt names..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 h-52 animate-pulse border border-gray-100" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No medicines found.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} onClick={() => navigate(`/store/product/${p.id}`)}
                className="bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all overflow-hidden cursor-pointer active:scale-95">
                <div className="w-full h-28 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center relative">
                  {p.imageUrl && !p.imageUrl.includes("google.com") && !p.imageUrl.includes("unsplash.com") ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                  ) : <span className="text-5xl">💊</span>}
                  {p.requiresPrescription && <span className="absolute top-2 right-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Rx</span>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                      {p.saltName && <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">{p.saltName}</p>}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-3 inline-block ${CAT_COLORS[p.category] || "bg-gray-100 text-gray-600"}`}>{p.category}</span>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900">₹{Number(p.price).toFixed(0)}</span>
                      <p className={`text-xs mt-0.5 ${p.stock === 0 ? "text-red-500" : p.stock <= 10 ? "text-yellow-600" : "text-green-600"}`}>
                        {p.stock === 0 ? "Out of Stock" : p.stock <= 10 ? `Only ${p.stock} left` : "In Stock"}
                      </p>
                    </div>
                    <button onClick={e => handleAdd(e, p)} disabled={p.stock === 0}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${added === p.id ? "bg-green-500 text-white" : p.stock === 0 ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                      {added === p.id ? "✓" : <><ShoppingCart size={12} /> Add</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/chat">
        <button className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-40">
          <MessageCircle size={24} />
        </button>
      </Link>
    </div>
  );
}