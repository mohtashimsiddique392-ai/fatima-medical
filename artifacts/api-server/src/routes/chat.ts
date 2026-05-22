import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set");
    return res.status(500).json({ error: "Groq API key not configured" });
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true));
  const productList = products
    .map((p) => `- ${p.name} (₹${p.price}, category: ${p.category})`)
    .join("\n");

  const systemPrompt = `You are a helpful medical and pharmacy assistant for Fatima Medical Store, Lucknow.

STRICT RULES:
1. ONLY answer questions related to health, medicine, symptoms, dosage, medical conditions, nutrition, pharmacy services, or any medicine-related queries including generic medicines, branded medicines, syrups, health supplements, vitamins, ayurvedic medicines, OTC medicines, prescription medicines, or any product that can be found in a pharmacy.
2. If the user asks about anything unrelated to health/medicine/pharmacy, politely say: "I'm a medical assistant and can only help with health or medicine related questions."
3. Always ask relevant follow-up questions before giving advice — such as age, symptoms duration, allergies, current medications.
4. Give short, clear, easy-to-understand answers. Use simple language.
5. Always end medical advice with: "Please consult a doctor for proper diagnosis."
6. For store-related queries (delivery, payment, orders), answer using this info:
   - Store: Fatima Medical, Sector O, Lucknow 226008
   - Phone: +91 8081176774
   - Hours: 9 AM to 10 PM daily
   - Delivery: Same day in Lucknow if ordered before 7 PM
   - Payment: UPI (8081176774@okbizaxis) or Cash on Delivery
   - Referrals: Both referrer and friend earn ₹50 on registration

Available products in our store:
${productList}

If the user's health query matches any of our products, suggest them naturally at the end of your response in this exact format:
SUGGEST_PRODUCTS: product name 1, product name 2`;

  const chatHistory = (history || [])
    .filter((m: any) => m.text && m.text.trim().length > 0)
    .map((m: any) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text.trim(),
    }));

  try {
    console.log("Calling Groq, history items:", chatHistory.length);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            ...chatHistory,
            { role: "user", content: message },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      },
    );

    console.log("Groq status:", response.status);
    const data = await response.json() as any;
    console.log("Groq response:", JSON.stringify(data).slice(0, 300));

    if (!response.ok) {
      console.error("Groq error:", JSON.stringify(data));
      return res
        .status(500)
        .json({
          error: data.error?.message || "Groq error " + response.status,
        });
    }

    let reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      console.error(
        "No reply in Groq response:",
        JSON.stringify(data).slice(0, 300),
      );
      reply = "Sorry, I could not process that. Please try again.";
    }

    let suggestedProducts: any[] = [];
    if (reply.includes("SUGGEST_PRODUCTS:")) {
      const parts = reply.split("SUGGEST_PRODUCTS:");
      reply = parts[0].trim();
      const names = parts[1]
        .split(",")
        .map((n: string) => n.trim().toLowerCase());
      suggestedProducts = products
        .filter((p) => names.some((n: string) => p.name.toLowerCase().includes(n)))
        .slice(0, 3);
    }

    return res.json({ reply, suggestedProducts });
  } catch (err: any) {
    console.error("Chat exception:", err.message);
    return res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;
