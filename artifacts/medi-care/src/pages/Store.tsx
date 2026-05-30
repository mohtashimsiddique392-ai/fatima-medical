import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ShoppingCart, Search, MessageCircle } from "lucide-react";
import { Link } from "wouter";

interface Product { id: number; name: string; saltName?: string; description?: string; price: string; category: string; stock: number; dosage?: string; howToTake?: string; sideEffects?: string; requiresPrescription: boolean; imageUrl?: string; }

const CAT_COLORS: Record<string, string> = {
  "Pain Relief": "bg-red-100 text-red-700",
  "Antibiotic": "bg-yellow-100 text-yellow-700",
  "Allergy": "bg-purple-100 text-purple-700",
  "Gastro": "bg-orange-100 text-orange-700",
  "Diabetes": "bg-blue-100 text-blue-700",
  "Vitamin & Supplement": "bg-green-100 text-green-700",
  "Syrup": "bg-pink-100 text-pink-700",
  "Injection": "bg-red-100 text-red-800",
  "Cream & Ointment": "bg-amber-100 text-amber-700",
  "Baby Care": "bg-rose-100 text-rose-700",
  "Surgical & Dressing": "bg-gray-100 text-gray-700",
  "Hygiene & Sanitizer": "bg-cyan-100 text-cyan-700",
  "Health Drink & Nutrition": "bg-lime-100 text-lime-700",
  "Ayurvedic": "bg-emerald-100 text-emerald-700",
  "Eye & Ear Drops": "bg-sky-100 text-sky-700",
  "Cardiac & BP": "bg-red-100 text-red-600",
  "Skin Care": "bg-fuchsia-100 text-fuchsia-700",
  "Women Health": "bg-pink-100 text-pink-700",
  "General OTC": "bg-gray-100 text-gray-600",
};

export default function Store() {
  const { addToCart, cartCount, cart } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<number | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    api.getCategories().then(r => setCategories(r.categories));
    loadProducts();
  }, []);

  useEffect(() => { loadProducts(); }, [search, category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const r = await api.getProducts({ search: search || undefined, category: category || undefined });
      setProducts(r.products);
    } finally { setLoading(false); }
  };

  const handleAdd = (p: Product) => {
    if (p.stock === 0) return;
    const cartItem = cart?.find((c: any) => c.id === p.id);
    if (cartItem && cartItem.quantity >= p.stock) {
      alert(`Only ${p.stock} in stock`);
      return;
    }
    addToCart({ id: p.id, name: p.name, price: Number(p.price), imageUrl: p.imageUrl, stock: p.stock });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-teal-100 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fatima Medical Store</h1>
              <p className="text-sm text-gray-500">Your trusted neighbourhood pharmacy.</p>
            </div>
            <Link href="/cart">
              <button className="relative flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <ShoppingCart size={16} /> Cart
                {cartCount > 0 && <span className="bg-white text-teal-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>}
              </button>
            </Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Search medicines or salt names..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-4 h-48 animate-pulse border border-gray-100" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No medicines found.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name}
                    className="w-full h-36 object-cover"
                    onError={e => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center">
                    <span className="text-3xl">💊</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</h3>
                      {p.saltName && (
                        <p className="text-xs text-teal-600 font-medium mt-0.5">{p.saltName}</p>
                      )}
                    </div>
                    <span className="font-bold text-gray-900 whitespace-nowrap">₹{Number(p.price).toFixed(0)}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5 mb-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[p.category] || "bg-gray-100 text-gray-600"}`}>{p.category}</span>
                    {p.requiresPrescription && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Rx Required</span>}
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.description}</p>}
                  <p className={`text-xs mb-3 font-medium ${p.stock <= 10 ? "text-orange-500" : "text-gray-400"}`}>
                    {p.stock === 0 ? "Out of Stock" : p.stock <= 10 ? `Only ${p.stock} left` : `${p.stock} in stock`}
                  </p>
                  {p.howToTake && (
                    <button onClick={() => setSelected(p)} className="text-xs text-teal-600 hover:underline mb-2 block">
                      How to take →
                    </button>
                  )}
                  <button onClick={() => handleAdd(p)} disabled={p.stock === 0}
                    className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${added === p.id ? "bg-green-500 text-white" : "bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"}`}>
                    {added === p.id ? "✓ Added!" : p.stock === 0 ? "Out of Stock" : <><ShoppingCart size={14} /> Add to Cart</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt={selected.name}
                className="w-full h-40 object-cover rounded-xl mb-4"
                onError={e => (e.currentTarget.style.display = "none")} />
            )}
            <h3 className="font-bold text-gray-900 text-lg mb-0.5">{selected.name}</h3>
            {selected.saltName && <p className="text-sm text-teal-600 font-medium mb-2">{selected.saltName}</p>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[selected.category] || "bg-gray-100 text-gray-600"}`}>{selected.category}</span>
            <div className="mt-4 space-y-3">
              {selected.dosage && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dosage</p><p className="text-sm text-gray-800">{selected.dosage}</p></div>}
              {selected.howToTake && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How to Take</p><p className="text-sm text-gray-800">{selected.howToTake}</p></div>}
              {(selected as any).sideEffects && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Side Effects</p><p className="text-sm text-gray-800">{(selected as any).sideEffects}</p></div>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { handleAdd(selected); setSelected(null); }}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium">Add to Cart</button>
              <button onClick={() => setSelected(null)}
                className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}

      <Link href="/chat">
        <button className="fixed bottom-6 right-6 bg-teal-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-teal-600 z-40">
          <MessageCircle size={24} />
        </button>
      </Link>
    </div>
  );
}