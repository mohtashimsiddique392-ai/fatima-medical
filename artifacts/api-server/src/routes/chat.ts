import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Groq API key not configured" });

  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
  const productList = products.map(p => `- ${p.name}${(p as any).saltName ? ' (' + (p as any).saltName + ')' : ''} — Rs.${p.price} — ${p.category}`).join("\n");

  const systemPrompt = `You are a helpful medical and pharmacy assistant for Fatima Medical Store, Lucknow.

RULES:
1. Answer questions about health, medicine, symptoms, dosage, medical conditions, nutrition, pharmacy products — including generic, branded, syrups, supplements, vitamins, ayurvedic, OTC, prescription medicines, injections, creams, baby care, surgical items.
2. For non-medical questions say: "I can only help with health and medicine related questions."
3. Ask follow-up questions when needed — age, symptoms duration, allergies, current medications.
4. Give short clear answers in simple language.
5. Always end medicine advice with: "Please consult a doctor for proper diagnosis."
6. Store info:
   - Name: Fatima Medical Store
   - Address: Sector O, Lucknow 226008
   - Phone: +91 8081176774
   - Hours: 9 AM to 10 PM daily
   - Delivery: Same day if ordered before 7 PM
   - Payment: UPI 8081176774@okbizaxis or Cash on Delivery
   - Referrals: Both earn Rs.50

Our products:
${productList}

If user query matches our products, end response with:
SUGGEST_PRODUCTS: exact product name 1, exact product name 2`;

  const chatHistory = (history || [])
    .filter((m: any) => m.text && m.text.trim().length > 0)
    .map((m: any) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text.trim()
    }));

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: message }
        ],
        max_tokens: 600,
        temperature: 0.7
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Groq error " + response.status });
    }

    let reply = data.choices?.[0]?.message?.content;
    if (!reply) reply = "Sorry, I could not process that. Please try again.";

    let suggestedProducts: any[] = [];
    if (reply.includes("SUGGEST_PRODUCTS:")) {
      const parts = reply.split("SUGGEST_PRODUCTS:");
      reply = parts[0].trim();
      const names = parts[1].split(",").map((n: string) => n.trim().toLowerCase());
      suggestedProducts = products
        .filter(p => names.some((n: string) =>
          p.name.toLowerCase().includes(n) ||
          ((p as any).saltName && (p as any).saltName.toLowerCase().includes(n))
        ))
        .slice(0, 3);
    }

    return res.json({ reply, suggestedProducts });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;