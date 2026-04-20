import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Package, Printer } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700", shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
};

function BillModal({ order, customer, onClose }: { order: any; customer: any; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const printBill = () => {
    const content = printRef.current?.innerHTML || "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Bill #${order.id} - Fatima Medical</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #14b8a6; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { font-size: 22px; color: #14b8a6; margin: 0; }
        .header p { margin: 2px 0; font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f0fdfa; text-align: left; padding: 8px; font-size: 12px; color: #14b8a6; border: 1px solid #e0f2fe; }
        td { padding: 8px; font-size: 12px; border: 1px solid #e5e7eb; }
        .total { font-weight: bold; font-size: 14px; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 16px; font-size: 11px; color: #888; text-align: center; }
        .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; }
        .meta div { }
        .label { color: #888; font-size: 11px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #dcfce7; color: #166534; }
        @media print { button { display: none; } }
      </style></head>
      <body>${content}
      <script>window.print(); window.onafterprint = () => window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Order Bill</h3>
          <div className="flex gap-2">
            <button onClick={printBill} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Printer size={16} /> Print Bill</button>
            <button onClick={onClose} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Close</button>
          </div>
        </div>
        <div className="p-6" ref={printRef}>
          <div className="header">
            <h1>Fatima Medical Store</h1>
            <p>فاطیما میڈیکل اسٹور</p>
            <p>Sector O, Mansarovar Yojna, Lucknow 226008</p>
            <p>Phone: +91 8081176774 | UPI: 8081176774@okbizaxis</p>
          </div>

          <div className="meta" style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "12px" }}>
            <div>
              <p className="label">Bill No.</p>
              <p style={{ fontWeight: "bold" }}>#FM-{String(order.id).padStart(4, "0")}</p>
              <p className="label" style={{ marginTop: "8px" }}>Customer</p>
              <p>{customer?.name || "Customer"}</p>
              <p style={{ color: "#888" }}>{customer?.phone}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="label">Date</p>
              <p>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="label" style={{ marginTop: "8px" }}>Status</p>
              <span className="badge" style={{ background: order.status === "delivered" ? "#dcfce7" : "#fef9c3", color: order.status === "delivered" ? "#166534" : "#854d0e" }}>{order.status.toUpperCase()}</span>
            </div>
          </div>

          {order.address && <p style={{ fontSize: "11px", color: "#888", marginBottom: "12px" }}>Delivery to: {order.address}</p>}

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine</th>
                <th>Qty</th>
                <th>Rate (₹)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item: any, i: number) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.price).toFixed(2)}</td>
                  <td>{(Number(item.price) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {Number(order.creditsUsed) > 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "right" }}>Referral Credits Used</td>
                  <td style={{ color: "#16a34a" }}>- ₹{Number(order.creditsUsed).toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: "bold" }}>Total Amount</td>
                <td className="total">₹{Number(order.totalAmount).toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={5}>Payment: {order.paymentMethod === "upi" ? "UPI (8081176774@okbizaxis)" : "Cash on Delivery"} · Status: {order.paymentStatus?.toUpperCase()}</td>
              </tr>
            </tfoot>
          </table>
          <div className="footer">
            <p>Thank you for choosing Fatima Medical Store!</p>
            <p>This is a computer-generated bill. No signature required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printOrder, setPrintOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    api.getOrders({ customerId: user.id }).then(r => { setOrders(r.orders); setLoading(false); });
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Loading orders...</div></div>;

  if (!orders.length) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 text-sm mb-6">Place your first order from our store.</p>
        <Link href="/store"><button className="bg-teal-500 text-white px-8 py-3 rounded-xl font-medium">Browse Store</button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">My Orders</h1>
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Order #{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                  <button onClick={() => setPrintOrder(order)} className="p-1.5 text-teal-500 hover:bg-teal-50 rounded-lg" title="Print Bill"><Printer size={15} /></button>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.productName} × {item.quantity}</span>
                    <span className="text-gray-500">₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${order.paymentMethod === "upi" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
                    {order.paymentMethod === "upi" ? "UPI" : "Cash on Delivery"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{order.paymentStatus}</span>
                </div>
                <p className="font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</p>
              </div>
              {order.paymentMethod === "upi" && order.paymentStatus === "pending" && (
                <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs text-teal-700 font-medium">Pay via UPI: <span className="font-mono font-bold">8081176774@okbizaxis</span></p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {printOrder && <BillModal order={printOrder} customer={{ name: user?.name, phone: user?.phone }} onClose={() => setPrintOrder(null)} />}
    </div>
  );
}
