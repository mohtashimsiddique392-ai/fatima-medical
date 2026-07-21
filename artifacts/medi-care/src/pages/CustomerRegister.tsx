import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useSignUp } from "@clerk/clerk-react";
import { api } from "@/lib/api";
import { Mail, ShieldCheck, ArrowLeft, Check, X } from "lucide-react";

type Step = "details" | "verify";

const PASSWORD_RULES: { label: string; test: (s: string) => boolean }[] = [
  { label: "At least 8 characters", test: (s) => s.length >= 8 },
  { label: "One uppercase letter", test: (s) => /[A-Z]/.test(s) },
  { label: "One lowercase letter", test: (s) => /[a-z]/.test(s) },
  { label: "One number or symbol", test: (s) => /[0-9!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]/.test(s) },
];

function isPasswordValid(pw: string) {
  return PASSWORD_RULES.every(r => r.test(pw));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function CustomerRegister() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", referralCode: "" });
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [resendCooldown, setResendCooldown] = useState(0);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = async () => {
    setError(""); setInfo("");
    if (!isLoaded) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email address"); return; }
    if (!isPasswordValid(form.password)) { setError("Password doesn't meet all the requirements below"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (!form.name.trim()) { setError("Enter your full name"); return; }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
      setInfo(`Code sent to ${form.email}. Check your inbox (and spam folder).`);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to send verification code");
    } finally { setLoading(false); }
  };

  const verifyAndRegister = async () => {
    if (!isLoaded || verifyingRef.current) return; // guard against double-submit (e.g. duplicate mobile tap events)
    if (!/^\d{4,6}$/.test(otp)) { setError("Enter the code you received"); return; }
    verifyingRef.current = true;
    setError(""); setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp });
      if (result.status !== "complete" || !result.createdSessionId) {
        setError("Verification incomplete. Please try again.");
        return;
      }
      await setActive({ session: result.createdSessionId });

      // Right after setActive, the session can take a beat to be fully
      // usable for an authenticated request — retry briefly rather than
      // leaving the customer stuck with a Clerk account but no store profile.
      let lastErr: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await api.syncCustomer({
            name: form.name,
            email: form.email,
            phone: form.phone ? `+91${form.phone}` : undefined,
            referralCode: form.referralCode || undefined,
          });
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          await sleep(400);
        }
      }
      if (lastErr) throw lastErr;

      navigate("/store");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || "Verification failed");
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0 || !isLoaded) return;
    setOtp(""); setError("");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendCooldown(60);
      setInfo("Code re-sent.");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to resend code. Please wait a bit before trying again.");
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
          <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-500 text-sm mt-1">We sent a code to <span className="font-medium text-gray-700">{form.email}</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 space-y-4">
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Enter code"
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
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-gray-400 font-normal">(optional, for delivery contact)</span></label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-600">+91</span>
                <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit phone number" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") }))}
                  className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="Create a password" value={form.password}
                onFocus={() => setPasswordFocused(true)}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" required />
              {(passwordFocused || form.password.length > 0) && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map(rule => {
                    const met = rule.test(form.password);
                    return (
                      <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${met ? "text-teal-600" : "text-gray-400"}`}>
                        {met ? <Check size={13} /> : <X size={13} />}
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
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
              <Mail size={16} /> {loading ? "Sending code..." : "Send Code to Verify"}
            </button>
            <p className="text-xs text-gray-400 text-center">We'll email you a one-time code to verify your address</p>
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
