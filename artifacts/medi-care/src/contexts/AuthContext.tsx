import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { api } from "@/lib/api";

interface User {
  role: "admin" | "customer";
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  username?: string;
  referralCode?: string;
  referralCredits?: number;
  permissions?: Record<string, boolean>;
  /** Admin/staff only — a JWT issued by our own API. Customers are authenticated via Clerk instead. */
  token?: string;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  stock?: number;
}

interface AuthContextType {
  user: User | null;
  cart: CartItem[];
  isLoading: boolean;
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
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();

  const [isLoading, setIsLoading] = useState(true);

  // Admin/staff sessions are stored locally (a JWT from our API).
  // Customer sessions are derived from Clerk + our /customers/me endpoint.
  const [adminUser, setAdminUser] = useState<User | null>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("mc_user") || "null");
      return raw?.role === "admin" ? raw : null;
    } catch { return null; }
  });
  const [customerUser, setCustomerUser] = useState<User | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("mc_cart") || "[]"); } catch { return []; }
  });

  // Load the customer profile once Clerk confirms a signed-in session.
  useEffect(() => {
    if (!clerkLoaded) return;
    if (!isSignedIn) { setCustomerUser(null); setIsLoading(false); return; }
    if (adminUser) { setIsLoading(false); return; } // an admin/staff session takes precedence

    let cancelled = false;
    api.getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        setCustomerUser({
          role: "customer",
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          referralCode: profile.referralCode,
          referralCredits: profile.referralCredits,
        });
      })
      .catch(() =>
        // No matching customers row yet (e.g. the sync call right after
        // sign-up didn't land). Self-heal by creating it now, using
        // whatever Clerk already knows about this account.
        api.syncCustomer({}).then((profile) => {
          if (cancelled) return;
          setCustomerUser({
            role: "customer",
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            referralCode: profile.referralCode,
            referralCredits: profile.referralCredits,
          });
        }).catch(() => { if (!cancelled) setCustomerUser(null); })
      )
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clerkLoaded, isSignedIn, clerkUser?.id, adminUser]);

  useEffect(() => {
    if (clerkLoaded && !isSignedIn) setIsLoading(false);
  }, [clerkLoaded, isSignedIn]);

  useEffect(() => { localStorage.setItem("mc_user", JSON.stringify(adminUser)); }, [adminUser]);
  useEffect(() => { localStorage.setItem("mc_cart", JSON.stringify(cart)); }, [cart]);

  const user = adminUser || customerUser;

  const login = (u: User) => {
    // Only admin/staff log in through this function now; customers arrive
    // via Clerk sign-in and get picked up by the effect above.
    setAdminUser(u);
  };

  const logout = () => {
    setAdminUser(null);
    setCustomerUser(null);
    setCart([]);
    localStorage.removeItem("mc_user");
    localStorage.removeItem("mc_cart");
    if (isSignedIn) signOut();
  };

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        const maxStock = item.stock || existing.stock || 999;
        if (existing.quantity >= maxStock) return prev;
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) return removeFromCart(id);
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const maxStock = c.stock || 999;
      return { ...c, quantity: Math.min(qty, maxStock) };
    }));
  };
  const clearCart = () => setCart([]);
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <AuthContext.Provider value={{ user, cart, isLoading, login, logout, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
