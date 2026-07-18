import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const { login, user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === "admin" ? "/admin" : "/store");
    }
  }, [user, isLoading]);

  if (isLoading || user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      let res;
      try {
        res = await api.adminLogin(form);
        login({ ...res, role: "admin" });
      } catch {
        const data = await api.staffLogin(form);
        login({ ...data, role: "admin" });
      }
      navigate("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-teal-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Staff Login</h1>
          <p className="text-gray-400 text-sm mt-1">Fatima Medical Admin Panel</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
              <input placeholder="Enter your staff ID" value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="Enter your password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            <Link href="/"><span className="hover:text-teal-600 cursor-pointer">← Back to store</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}