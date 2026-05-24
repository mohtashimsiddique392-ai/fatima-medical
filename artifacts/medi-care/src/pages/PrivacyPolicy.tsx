import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <Link href="/"><span className="text-teal-600 text-sm hover:underline cursor-pointer">← Back</span></Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: May 2026</p>
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">1. Information We Collect</h2>
            <p>We collect your name, phone number, delivery address, and order history when you register and use Fatima Medical Store. We also collect health records and family member details that you voluntarily add.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">2. How We Use Your Information</h2>
            <p>Your information is used only to process and deliver your orders, send order updates, improve our service, and provide personalised health reminders. We do not sell your data to any third party under any circumstances.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">3. Data Storage & Security</h2>
            <p>Your data is stored on secure encrypted servers. Passwords are stored in bcrypt hashed form and cannot be read by anyone including our staff. All connections use SSL/TLS encryption.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">4. Health Records</h2>
            <p>Health records and family member details you add are strictly private and visible only to you when logged in. We do not share, analyse, or transmit this data to any third party.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">5. Prescription Data</h2>
            <p>Prescription information is used only to verify eligibility for prescription medicines. It is not shared with any external party.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">6. Cookies & Local Storage</h2>
            <p>We use browser local storage to keep you logged in and to save your cart. No third party tracking cookies are used.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">7. Your Rights</h2>
            <p>You can request complete deletion of your account and all associated data at any time by contacting us. We will process deletion requests within 7 working days.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Continued use of the app after changes means you accept the updated policy.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">9. Contact Us</h2>
            <p>Fatima Medical Store</p>
            <p>Sector O, Mansarovar Yojna, Lucknow 226008</p>
            <p>Phone: +91 8081176774</p>
          </section>
        </div>
      </div>
    </div>
  );
}