import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <Link href="/"><span className="text-teal-600 text-sm hover:underline cursor-pointer">← Back</span></Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: May 2026</p>
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">1. Acceptance</h2>
            <p>By using Fatima Medical Store app you agree to these terms. If you do not agree, please do not use the service.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">2. Service Description</h2>
            <p>Fatima Medical Store provides an online platform to browse and order medicines and pharmacy products for delivery within Lucknow area.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">3. Prescription Medicines</h2>
            <p>Medicines marked as Rx Required need a valid prescription from a registered medical practitioner. By ordering such medicines you confirm you hold a valid prescription. We reserve the right to verify prescriptions before dispensing.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">4. Delivery</h2>
            <p>We deliver within Lucknow area only. Delivery times are estimates and may vary due to traffic, weather, or stock availability. Orders placed before 7 PM are typically delivered same day.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">5. Payments</h2>
            <p>We accept UPI payments to 8081176774@okbizaxis and Cash on Delivery. Prices shown are inclusive of all taxes unless stated otherwise.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">6. Account Responsibility</h2>
            <p>You are responsible for keeping your login credentials secure. Do not share your account with others. Notify us immediately if you suspect unauthorized access.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">7. Prohibited Use</h2>
            <p>You may not use this service to order medicines for resale, provide false prescription information, or engage in any fraudulent activity.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">8. Limitation of Liability</h2>
            <p>Fatima Medical Store is not liable for any adverse reactions to medicines. Always consult a qualified doctor before starting any medication.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">9. Contact</h2>
            <p>+91 8081176774 | Sector O, Lucknow 226008</p>
          </section>
        </div>
      </div>
    </div>
  );
}