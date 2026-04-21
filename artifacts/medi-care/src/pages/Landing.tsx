import { Link } from "wouter";
import { ShieldCheck, Truck, Heart, MapPin, Phone, Clock } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Fatima Medical</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin-login"><button className="text-sm text-gray-500 hover:text-teal-600 px-3 py-1.5">Staff Login</button></Link>
            <Link href="/login"><button className="text-sm text-gray-600 hover:text-teal-600 px-3 py-1.5">Sign In</button></Link>
            <Link href="/register"><button className="text-sm bg-teal-500 text-white px-4 py-1.5 rounded-lg hover:bg-teal-600">Register</button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
            Serving Lucknow from 9 AM to 10 PM
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Fatima Medical Store<br />
            <span className="text-teal-500">pharmacy at your fingertips.</span>
          </h1>
          <p className="text-gray-500 text-lg mb-3">
            فاطیما میڈیکل اسٹور — order medicines, upload prescriptions, and consult our pharmacist online.
          </p>
          <p className="text-gray-500 mb-2">We deliver authentic medicines quickly and safely around Mansarovar Yojna, Lucknow.</p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-8 flex-wrap">
            <a href="https://www.google.com/maps/search/?api=1&query=Fatima+Medical+Store+Sector+O+Mansarovar+Yojna+Lucknow+226008" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-teal-600 active:scale-95 transition cursor-pointer">
              <MapPin size={14} className="text-teal-500" /> Sector O, Lucknow 226008
            </a>
            <a href="tel:+918081176774" className="flex items-center gap-1.5 hover:text-teal-600 active:scale-95 transition cursor-pointer">
              <Phone size={14} className="text-teal-500" /> +91 8081176774
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <button className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-xl font-medium text-base flex items-center gap-2">
                Start Ordering →
              </button>
            </Link>
            <Link href="/login">
              <button className="border border-teal-300 text-teal-600 hover:bg-teal-50 px-8 py-3 rounded-xl font-medium text-base">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: "100% Genuine", desc: "All medicines are sourced directly from licensed distributors and verified pharmacists." },
            { icon: Truck, title: "Quick Delivery", desc: "Get your medicines delivered to your doorstep within Lucknow same day." },
            { icon: Heart, title: "Pharmacist Care", desc: "Our experienced pharmacist is available to answer your questions anytime." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-6 rounded-2xl border border-teal-100 hover:border-teal-300 hover:shadow-sm transition-all">
              <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon size={24} className="text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Payment & Referral */}
      <section className="bg-teal-50 py-16 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 border border-teal-100">
            <h3 className="font-bold text-gray-900 text-lg mb-3">Payment Options</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">UPI Payment</p>
                  <p className="text-teal-600 font-mono text-sm">8081176774@okbizaxis</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">💵</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Cash on Delivery</p>
                  <p className="text-gray-500 text-sm">Pay when you receive your order</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-teal-100">
            <h3 className="font-bold text-gray-900 text-lg mb-3">Referral Rewards</h3>
            <p className="text-gray-500 text-sm mb-4">Refer friends and family to earn ₹50 credits each time! Use credits for discounts on your next order.</p>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">Earn ₹50 per referral</p>
                <p className="text-amber-600 text-sm">Both you and your friend get ₹50!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p className="font-semibold text-white mb-1">Fatima Medical Store</p>
        <p>Sector O, Mansarovar Yojna, Lucknow 226008 | +91 8081176774</p>
        <p className="mt-2">© 2024 Fatima Medical. All rights reserved.</p>
      </footer>
    </div>
  );
}
