import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Gift, Copy, Users, IndianRupee } from "lucide-react";

export default function Referrals() {
  const { user } = useAuth();
  const [info, setInfo] = useState<any>(null);
  const [applyCode, setApplyCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) api.getMyReferral(user.id).then(setInfo);
  }, [user?.id]);

  const copy = () => {
    navigator.clipboard.writeText(info?.referralCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); setError("");
    try {
      const r = await api.applyReferral({ customerId: user!.id!, referralCode: applyCode });
      setMessage(r.message);
      setApplyCode("");
      api.getMyReferral(user!.id!).then(setInfo);
    } catch (err: any) { setError(err.message); }
  };

  if (!info) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Referral Rewards</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: IndianRupee, label: "Credits", value: `₹${Number(info.credits).toFixed(0)}`, color: "text-teal-600" },
            { icon: Users, label: "Referred", value: info.totalReferrals, color: "text-blue-600" },
            { icon: Gift, label: "Per Referral", value: "₹50", color: "text-amber-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <Icon size={20} className={`${color} mx-auto mb-1`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Referral Code */}
        <div className="bg-white rounded-xl border border-teal-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Your Referral Code</h3>
          <p className="text-xs text-gray-500 mb-3">Share this code with friends. Both of you earn ₹50 when they register!</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
              <span className="font-mono font-bold text-teal-600 text-xl tracking-widest">{info.referralCode}</span>
            </div>
            <button onClick={copy} className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${copied ? "bg-green-500 text-white" : "bg-teal-500 text-white hover:bg-teal-600"}`}>
              <Copy size={14} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Apply Code */}
        {!info.totalReferrals && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Have a referral code?</h3>
            <p className="text-xs text-gray-500 mb-3">Enter a friend's code to earn ₹50 credits.</p>
            <form onSubmit={apply} className="flex gap-2">
              <input placeholder="Enter referral code" value={applyCode} onChange={e => setApplyCode(e.target.value.toUpperCase())}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 font-mono uppercase" />
              <button type="submit" className="bg-teal-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-600">Apply</button>
            </form>
            {message && <p className="text-green-600 text-sm mt-2 bg-green-50 px-3 py-2 rounded-lg">{message}</p>}
            {error && <p className="text-red-500 text-sm mt-2 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          </div>
        )}

        {/* Referred Users */}
        {info.referredUsers?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">People You Referred</h3>
            <div className="space-y-2">
              {info.referredUsers.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-semibold text-sm">{u.name[0]}</div>
                    <span className="text-sm font-medium text-gray-900">{u.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(u.joinedAt).toLocaleDateString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
