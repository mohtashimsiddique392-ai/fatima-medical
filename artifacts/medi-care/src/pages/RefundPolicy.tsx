import { Link } from "wouter";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <Link href="/"><span className="text-teal-600 text-sm hover:underline cursor-pointer">← Back</span></Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Refund & Return Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: May 2026</p>
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">1. Medicine Returns</h2>
            <p>As per Indian pharmaceutical regulations, medicines once dispensed and delivered cannot be returned or exchanged. This is for safety and hygiene reasons.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">2. Exceptions</h2>
            <p>We will accept returns and provide full refund in these cases:</p>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Wrong medicine delivered</li>
              <li>Damaged or broken product received</li>
              <li>Expired medicine delivered</li>
              <li>Order not delivered but marked as delivered</li>
            </ul>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">3. How to Raise a Return Request</h2>
            <p>Contact us within 24 hours of delivery on +91 8081176774 with your order details and a photo of the issue. We will resolve within 48 hours.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">4. Refund Process</h2>
            <p>Approved refunds for UPI payments will be credited back to your original payment method within 3-5 working days. For Cash on Delivery orders, refunds will be provided as store credits or cash on next delivery.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">5. Order Cancellation</h2>
            <p>Orders can be cancelled within 30 minutes of placing if not yet dispatched. Contact us immediately on +91 8081176774 to cancel.</p>
          </section>
          <section>
            <h2 className="font-bold text-gray-900 text-base mb-2">6. Contact</h2>
            <p>+91 8081176774 | Sector O, Lucknow 226008</p>
          </section>
        </div>
      </div>
    </div>
  );
}