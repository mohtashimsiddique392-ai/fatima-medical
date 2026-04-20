import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const responses: Record<string, { reply: string; keywords: string[] }> = {
  fever: {
    keywords: ["fever", "bukhar", "temperature", "paracetamol", "crocin"],
    reply: "For fever, Paracetamol (500mg) is commonly used. Take 1 tablet every 4-6 hours. Do not exceed 4 tablets in 24 hours. Drink plenty of fluids and rest. If fever exceeds 103°F or persists over 3 days, consult a doctor."
  },
  pain: {
    keywords: ["pain", "dard", "headache", "ache", "ibuprofen"],
    reply: "For mild to moderate pain, Ibuprofen or Paracetamol are commonly used. Take with food to avoid stomach upset. Ibuprofen: 400mg every 6-8 hours. Avoid on empty stomach. If pain is severe or persistent, please consult a doctor."
  },
  cold: {
    keywords: ["cold", "cough", "sardi", "runny", "sneeze", "flu"],
    reply: "For cold and cough: Stay hydrated, rest well. Antihistamines like Cetirizine help with runny nose. Cough syrups can ease throat irritation. Inhale steam for congestion. Symptoms usually resolve in 7-10 days. See a doctor if symptoms worsen."
  },
  vitamin: {
    keywords: ["vitamin", "supplement", "deficiency", "vitamin d", "vitamin c", "calcium"],
    reply: "Vitamins and supplements support overall health. Vitamin D: Take with a fatty meal for better absorption. Vitamin C: Water-soluble, take with water. Calcium: Split doses for better absorption. Always consult your pharmacist before starting new supplements."
  },
  antibiotic: {
    keywords: ["antibiotic", "amoxicillin", "infection", "bacteria", "prescription"],
    reply: "Antibiotics require a prescription and must be taken as directed by your doctor. Complete the full course even if you feel better. Do not share antibiotics or use leftover antibiotics. Take at the same time each day."
  },
  diabetes: {
    keywords: ["diabetes", "sugar", "insulin", "blood sugar", "metformin"],
    reply: "For diabetes management: Take medications exactly as prescribed. Monitor blood sugar regularly. Maintain a healthy diet, limit sugary foods. Exercise regularly. Never skip doses. Visit your doctor for regular check-ups."
  },
  bp: {
    keywords: ["blood pressure", "bp", "hypertension", "pressure"],
    reply: "For blood pressure: Take medications at the same time every day. Reduce salt intake. Exercise regularly. Avoid smoking and alcohol. Monitor BP regularly at home. Never stop medication without consulting your doctor."
  },
};

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const msgLower = message.toLowerCase();
  let reply = "I'm your Fatima Medical pharmacy assistant! I can help with medicine information, dosage guidance, and how to take your medications. Could you tell me more about your symptoms or the medicine you need help with?";
  let suggestedProducts: any[] = [];

  for (const key of Object.keys(responses)) {
    const resp = responses[key];
    if (resp.keywords.some(k => msgLower.includes(k))) {
      reply = resp.reply;
      const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
      suggestedProducts = products.filter(p =>
        resp.keywords.some(k => p.name.toLowerCase().includes(k) || (p.category || "").toLowerCase().includes(k))
      ).slice(0, 3);
      break;
    }
  }

  if (msgLower.includes("order") || msgLower.includes("buy") || msgLower.includes("purchase")) {
    reply = "You can order medicines directly from our catalogue! Browse our products, add them to cart, and checkout with UPI (8081176774@okbizaxis) or Cash on Delivery. We deliver to your doorstep in Lucknow area.";
  } else if (msgLower.includes("delivery") || msgLower.includes("deliver")) {
    reply = "We deliver medicines across Lucknow (Sector O area and nearby). Orders placed before 7 PM are delivered the same day. Payment options: UPI (8081176774@okbizaxis) or Cash on Delivery. Track your order in the Orders section.";
  } else if (msgLower.includes("referral") || msgLower.includes("refer")) {
    reply = "Share your referral code with friends and family! When they register using your code, both of you earn ₹50 credit. Credits can be used for discounts on future orders. Find your referral code in the Rewards section.";
  } else if (msgLower.includes("payment") || msgLower.includes("upi") || msgLower.includes("pay")) {
    reply = "We accept two payment methods:\n1. UPI: 8081176774@okbizaxis\n2. Cash on Delivery\n\nFor UPI payments, please use the UPI ID above and confirm payment after placing your order.";
  } else if (msgLower.includes("prescription") || msgLower.includes("rx")) {
    reply = "Some medicines require a prescription (marked with 'Rx Required'). You can upload your prescription photo when ordering. Our pharmacist will verify before dispatch. For prescription queries, call us at +91 8081176774.";
  } else if (msgLower.includes("store") || msgLower.includes("shop") || msgLower.includes("address")) {
    reply = "Fatima Medical Store\n📍 Sector O, Lucknow 226008\n📞 +91 8081176774\n🕐 Open 9 AM to 10 PM daily\n\nVisit us in-store or order online for home delivery!";
  } else if (msgLower.includes("hello") || msgLower.includes("hi") || msgLower.includes("help")) {
    reply = "Hello! Welcome to Fatima Medical Store. I'm here to help you with:\n• Medicine information & dosage guidance\n• How to take your medicines\n• Order & delivery queries\n• Payment options\n• Referral rewards\n\nWhat can I help you with today?";
  }

  res.json({ reply, suggestedProducts });
});

export default router;
