import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { KeyRound, Phone } from "lucide-react";

export default function ChangePassword() {
  const { user } = useAuth();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [success, setSuccess] = useState(false);

  const requestOtp = async () => {
    setError(""); setLoading(true);
    try {
      const res = await api.adminRequestOtp(user?.username || "fatima04786");
      setMessage(res.message);
      // Extract demo OTP from message
      const match = res.message.match(/Demo OTP: (\d+)/);
      if (match) setDemoOtp(match[1]);
      setStep("verify");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters");
    setError(""); setLoading(true);
    try {
      await api.adminChangePassword({ username: user?.username || "fatima04786", otp, newPassword });
      setSuccess(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full border border-teal-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Password Changed!</h2>
        <p className="text-gray-500 text-sm">Your admin password has been updated successfully.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <KeyRound size={24} className="text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Change Admin Password</h1>
          <p className="text-gray-500 text-sm mt-1">Verify via OTP sent to your registered number</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {step === "request" ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
                <Phone size={18} className="text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">OTP will be sent to</p>
                  <p className="font-semibold text-gray-900">+91 8081176774</p>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={requestOtp} disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm">
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          ) : (
            <form onSubmit={changePassword} className="space-y-4">
              {message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-700">{message}</p>
                  {demoOtp && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-xs text-green-600 font-medium">Demo OTP:</p>
                      <button type="button" onClick={() => setOtp(demoOtp)} className="font-mono text-sm font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded hover:bg-green-200">{demoOtp}</button>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-center text-lg tracking-widest focus:outline-none focus:border-teal-400" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" required />
              </div>
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm">
                {loading ? "Changing..." : "Change Password"}
              </button>
              <button type="button" onClick={() => setStep("request")} className="w-full text-sm text-gray-400 hover:text-teal-600">← Request new OTP</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
