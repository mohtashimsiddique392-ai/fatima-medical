import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";

export default function Cart() {
  const { user, cart, removeFromCart, updateQty, clearCart, cartTotal } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ address: user?.name ? "" : "", notes: "", paymentMethod: "cash_on_delivery", useCredits: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [success, setSuccess] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    setError(""); setLoading(true);
    try {
      await api.createOrder({
        customerId: user.id,
        items: cart.map(c => ({ productId: c.id, quantity: c.quantity })),
        paymentMethod: form.paymentMethod,
        address: form.address,
        notes: form.notes,
        useReferralCredits: form.useCredits,
      });
      clearCart();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full border border-teal-100 shadow-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-500 text-sm mb-2">Your order has been placed successfully.</p>
        {form.paymentMethod === "upi" && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4 text-left">
            <p className="text-sm font-semibold text-teal-800">Pay via UPI</p>
            <p className="text-lg font-mono font-bold text-teal-600 mt-1">8081176774@okbizaxis</p>
            <p className="text-xs text-teal-600 mt-1">Amount: ₹{cartTotal.toFixed(2)}</p>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Link href="/orders"><button className="flex-1 bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium">View Orders</button></Link>
          <Link href="/store"><button className="flex-1 border border-gray-200 py-2.5 rounded-lg text-sm text-gray-600">Continue Shopping</button></Link>
        </div>
      </div>
    </div>
  );

  if (cart.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 text-sm mb-6">Add medicines from the store to get started.</p>
        <Link href="/store"><button className="bg-teal-500 text-white px-8 py-3 rounded-xl font-medium">Browse Store</button></Link>
      </div>
    </div>
  );

  if (step === "checkout") return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <button onClick={() => setStep("cart")} className="flex items-center gap-1 text-gray-500 text-sm mb-4">← Back to cart</button>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Checkout</h1>
        <form onSubmit={handleCheckout} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Delivery Address</h3>
            <textarea placeholder="Enter your full address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              rows={3} required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none" />
            <input placeholder="Special instructions (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 mt-2" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Payment Method</h3>
            <div className="space-y-2">
              {[
                { value: "cash_on_delivery", label: "Cash on Delivery", icon: "💵", desc: "Pay when you receive" },
                { value: "upi", label: "UPI Payment", icon: "📱", desc: "8081176774@okbizaxis" },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.paymentMethod === opt.value ? "border-teal-400 bg-teal-50" : "border-gray-200"}`}>
                  <input type="radio" name="payment" value={opt.value} checked={form.paymentMethod === opt.value} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))} className="text-teal-500" />
                  <span className="text-lg">{opt.icon}</span>
                  <div><p className="text-sm font-medium text-gray-900">{opt.label}</p><p className="text-xs text-gray-500">{opt.desc}</p></div>
                </label>
              ))}
            </div>
          </div>

          {(user?.referralCredits ?? 0) > 0 && (
            <label className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer">
              <input type="checkbox" checked={form.useCredits} onChange={e => setForm(p => ({ ...p, useCredits: e.target.checked }))} className="text-teal-500" />
              <div><p className="text-sm font-medium text-gray-900">Use referral credits</p><p className="text-xs text-amber-600">You have ₹{user?.referralCredits?.toFixed(2)} available</p></div>
            </label>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2"><span>Subtotal ({cart.length} items)</span><span>₹{cartTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-600 mb-2"><span>Delivery</span><span className="text-green-600">Free</span></div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2"><span>Total</span><span>₹{cartTotal.toFixed(2)}</span></div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-3 rounded-xl font-medium">
            {loading ? "Placing order..." : `Place Order · ₹${cartTotal.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Your Cart ({cart.length})</h1>
        <div className="space-y-3 mb-6">
          {cart.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                <p className="text-teal-600 font-semibold text-sm">₹{item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-teal-400"><Minus size={12} /></button>
                <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-teal-400"><Plus size={12} /></button>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>₹{cartTotal.toFixed(2)}</span></div>
        </div>
        <button onClick={() => { if (!user) navigate("/login"); else setStep("checkout"); }}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-medium">
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
