import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSignUp } from "@clerk/clerk-react";
import { api } from "@/lib/api";
import { Smartphone, ShieldCheck, ArrowLeft } from "lucide-react";

type Step = "details" | "verify";

export default function CustomerRegister() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", phone: "", password: "", confirmPassword: "", referralCode: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = async () => {
    setError(""); setInfo("");
    if (!isLoaded) return;
    if (!/^\d{10}$/.test(form.phone)) { setError("Enter a valid 10-digit phone number"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (!form.name.trim()) { setError("Enter your full name"); return; }

    setLoading(true);
    try {
      await signUp.create({
        phoneNumber: `+91${form.phone}`,
        password: form.password,
      });
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setStep("verify");
      setInfo(`OTP sent via SMS to +91 ${form.phone}. Valid for a few minutes.`);
      setResendCooldown(30);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const verifyAndRegister = async () => {
    if (!isLoaded) return;
    if (!/^\d{4,6}$/.test(otp)) { setError("Enter the OTP you received"); return; }
    setError(""); setLoading(true);
    try {
      const result = await signUp.attemptPhoneNumberVerification({ code: otp });
      if (result.status !== "complete") {
        setError("Verification incomplete. Please try again.");
        return;
      }
      await setActive({ session: result.createdSessionId });

      await api.syncCustomer({
        name: form.name,
        phone: `+91${form.phone}`,
        referralCode: form.referralCode || undefined,
      });

      navigate("/store");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Verification failed");
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0 || !isLoaded) return;
    setOtp("");
    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setResendCooldown(30);
      setInfo("OTP re-sent.");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to resend OTP");
    }
  };

  if (step === "verify") return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <button onClick={() => { setStep("details"); setOtp(""); setError(""); }}
          className="flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-teal-600">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={26} className="text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify your number</h1>
          <p className="text-gray-500 text-sm mt-1">We sent a code to <span className="font-medium text-gray-700">+91 {form.phone}</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 space-y-4">
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Enter OTP"
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-2xl tracking-[0.4em] font-semibold focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" />
          {info && !error && <p className="text-teal-700 text-xs bg-teal-50 px-3 py-2 rounded-lg">{info}</p>}
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button onClick={verifyAndRegister} disabled={loading || otp.length < 4}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-3 rounded-lg font-medium text-sm">
            {loading ? "Verifying..." : "Verify & Create Account"}
          </button>
          <button onClick={resendOtp} disabled={resendCooldown > 0 || loading}
            className="w-full text-sm text-teal-600 hover:text-teal-700 disabled:text-gray-400 py-2">
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Fatima Medical for home delivery</p>
        </div>
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6">
          <form onSubmit={e => { e.preventDefault(); sendOtp(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input placeholder="Your full name" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-600">+91</span>
                <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit phone number" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                  className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="Create a password (min 6 chars)" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" placeholder="Confirm your password" value={form.confirmPassword}
                onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code <span className="text-gray-400 font-normal">(optional)</span></label>
              <input placeholder="Enter referral code for ₹50 bonus" value={form.referralCode}
                onChange={e => setForm(p => ({ ...p, referralCode: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading || !isLoaded}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
              <Smartphone size={16} /> {loading ? "Sending OTP..." : "Send OTP to Verify"}
            </button>
            <p className="text-xs text-gray-400 text-center">We'll send a one-time SMS code to verify your number</p>
            <div id="clerk-captcha" />
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link href="/login"><span className="text-teal-600 font-medium hover:underline cursor-pointer">Sign In</span></Link>
          </p>
        </div>
      </div>
    </div>
  );
}
