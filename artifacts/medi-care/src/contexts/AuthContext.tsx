import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  role: "admin" | "customer";
  id?: number;
  name?: string;
  phone?: string;
  username?: string;
  referralCode?: string;
  referralCredits?: number;
  token: string;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  cart: CartItem[];
  login: (user: User) => void;
  logout: () => void;
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("mc_user") || "null"); } catch { return null; }
  });
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("mc_cart") || "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem("mc_user", JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem("mc_cart", JSON.stringify(cart)); }, [cart]);

  const login = (u: User) => setUser(u);
  const logout = () => { setUser(null); setCart([]); localStorage.removeItem("mc_user"); localStorage.removeItem("mc_cart"); };

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: qty } : c));
  };
  const clearCart = () => setCart([]);
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <AuthContext.Provider value={{ user, cart, login, logout, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
