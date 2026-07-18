import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSignIn } from "@clerk/clerk-react";
import { useAuth } from "@/contexts/AuthContext";

export default function CustomerLogin() {
  const { user, isLoading } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === "admin" ? "/admin" : "/store");
    }
  }, [user, isLoading]);

  if (isLoading || user || !isLoaded) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const phone10 = form.phone.replace(/\D/g, "").slice(-10);
      const result = await signIn.create({
        identifier: `+91${phone10}`,
        password: form.password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/store");
      } else {
        setError("Additional verification required. Please contact support.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Invalid phone number or password");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your Fatima Medical account</p>
        </div>
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-600">+91</span>
                <input type="tel" inputMode="numeric" maxLength={10} placeholder="e.g. 9876543210" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                  className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="Enter your password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{" "}
            <Link href="/register"><span className="text-teal-600 font-medium hover:underline cursor-pointer">Register</span></Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Are you staff?{" "}
          <Link href="/admin-login"><span className="text-teal-600 hover:underline cursor-pointer">Admin Login</span></Link>
        </p>
      </div>
    </div>
  );
}
