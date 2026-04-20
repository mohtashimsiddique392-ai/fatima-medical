import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout, cartCount } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav className="bg-white border-b border-teal-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user?.role === "admin" ? "/admin" : user ? "/store" : "/"}>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">Fatima Medical</span>
          </div>
        </Link>

        {user?.role === "customer" && (
          <div className="hidden md:flex items-center gap-5 text-sm">
            <Link href="/store"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Store</span></Link>
            <Link href="/orders"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Orders</span></Link>
            <Link href="/family"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Family</span></Link>
            <Link href="/health"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Health</span></Link>
            <Link href="/referrals"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Rewards</span></Link>
            <Link href="/chat"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Chatbot</span></Link>
          </div>
        )}

        {user?.role === "admin" && (
          <div className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/admin"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Dashboard</span></Link>
            <Link href="/admin/catalogue"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Catalogue</span></Link>
            <Link href="/admin/expiry"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Expiry Alerts</span></Link>
            <Link href="/admin/orders"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Orders</span></Link>
            <Link href="/admin/customers"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Customers</span></Link>
            <Link href="/admin/change-password"><span className="text-gray-600 hover:text-teal-600 cursor-pointer font-medium">Password</span></Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          {user?.role === "customer" && (
            <Link href="/cart">
              <button className="relative p-2 hover:bg-teal-50 rounded-lg">
                <ShoppingCart size={20} className="text-gray-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
                )}
              </button>
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden lg:block text-sm text-gray-600 font-medium truncate max-w-28">{user.name || user.username}</span>
              <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50">
                <LogOut size={16} />
                <span className="hidden md:block">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><button className="text-sm text-gray-600 hover:text-teal-600 px-3 py-1.5">Sign In</button></Link>
              <Link href="/register"><button className="text-sm bg-teal-500 text-white px-4 py-1.5 rounded-lg hover:bg-teal-600">Register</button></Link>
            </div>
          )}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-teal-100 bg-white px-4 py-3 space-y-1">
          {user?.role === "customer" && (
            <>
              {[
                { href: "/store", label: "Store" },
                { href: "/cart", label: `Cart (${cartCount})` },
                { href: "/orders", label: "My Orders" },
                { href: "/family", label: "Family Members" },
                { href: "/health", label: "Health Records" },
                { href: "/referrals", label: "Rewards" },
                { href: "/chat", label: "Chatbot" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}>
                  <div className="py-2 px-2 text-gray-700 font-medium hover:text-teal-600 rounded-lg">{label}</div>
                </Link>
              ))}
            </>
          )}
          {user?.role === "admin" && (
            <>
              {[
                { href: "/admin", label: "Dashboard" },
                { href: "/admin/catalogue", label: "Catalogue" },
                { href: "/admin/expiry", label: "Expiry Alerts" },
                { href: "/admin/orders", label: "Orders" },
                { href: "/admin/customers", label: "Customers" },
                { href: "/admin/change-password", label: "Change Password" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}>
                  <div className="py-2 px-2 text-gray-700 font-medium hover:text-teal-600 rounded-lg">{label}</div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
