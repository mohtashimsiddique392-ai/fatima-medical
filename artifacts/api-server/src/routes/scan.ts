import { Router } from "express";
const router = Router();

router.post("/", async (req, res) => {
  const { image, type } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = type === "bill"
    ? `This is a wholesaler medicine bill image. Extract ALL medicines listed and return ONLY a JSON array with no other text:
[
  {
    "name": "medicine name with strength",
    "price": "MRP number only",
    "stock": 10,
    "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin & Supplement or Syrup or Injection or Cream & Ointment or Baby Care or Surgical & Dressing or Hygiene & Sanitizer or Health Drink & Nutrition or Ayurvedic or Eye & Ear Drops or Cardiac & BP or Skin Care or Women Health or General OTC",
    "batchNumber": "batch number if visible or empty string",
    "expiryDate": "YYYY-MM-DD format if visible or empty string",
    "manufacturer": "manufacturer name if visible or empty string",
    "dosage": "dosage if visible or empty string",
    "requiresPrescription": false
  }
]
Return only the JSON array, no explanation, no markdown.`
    : `This is a medicine package/strip/box. Extract details and return ONLY this JSON object with no other text:
{
  "name": "full medicine name with brand and strength e.g. Azithromycin Tablets IP 250mg",
  "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin or Syrup or Supplement or General",
  "price": "MRP number only if visible or empty string",
  "dosage": "dosage instructions if visible",
  "howToTake": "how to take if visible",
  "manufacturer": "manufacturer or marketed by name if visible",
  "batchNumber": "batch number if visible or empty string",
  "expiryDate": "YYYY-MM-DD format if visible or empty string",
  "requiresPrescription": true or false based on Rx symbol,
  "stock": 10
}
Return only the JSON object, no explanation, no markdown.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: "text", text: prompt }
          ]
        }],
        max_tokens: 800,
        temperature: 0.1
      })
    });

    const data = await response.json();
    console.log("Scan AI status:", response.status);

    if (!response.ok) {
      console.error("Scan AI error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "AI error " + response.status });
    }

    const text = data.choices?.[0]?.message?.content || "";
    console.log("Scan AI raw:", text.slice(0, 200));

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json({ result: parsed });
  } catch (err: any) {
    console.error("Scan exception:", err.message);
    res.status(500).json({ error: "Failed: " + err.message });
  }
});
router.post("/text", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a pharmacy data extraction assistant. Extract medicine details from wholesaler bills and return only valid JSON arrays." },
          { role: "user", content: `Extract all medicines from this bill and return ONLY a JSON array:
[{"name":"","price":"","stock":10,"category":"","batchNumber":"","expiryDate":"","manufacturer":"","dosage":"","requiresPrescription":false}]

Bill:
${text}

Return only the JSON array.` }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message });

    const raw = data.choices?.[0]?.message?.content || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json({ result: Array.isArray(parsed) ? parsed : [parsed] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;