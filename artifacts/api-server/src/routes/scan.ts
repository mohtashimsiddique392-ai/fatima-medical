import { Router } from "express";
const router = Router();

// Second AI call — category lookup + image search URL
async function lookupMedicineDetails(name: string, saltName: string, apiKey: string): Promise<{ category: string; imageUrl: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a pharmacy expert. Return ONLY valid JSON, no other text." },
          { role: "user", content: `Medicine: "${name}", Salt/Composition: "${saltName}"

Identify the correct pharmacy category and suggest a real image search URL.

Return ONLY this JSON:
{
  "category": "one of: Pain Relief | Antibiotic | Allergy | Gastro | Diabetes | Vitamin & Supplement | Syrup | Injection | Cream & Ointment | Baby Care | Surgical & Dressing | Hygiene & Sanitizer | Health Drink & Nutrition | Ayurvedic | Eye & Ear Drops | Cardiac & BP | Skin Care | Women Health | General OTC",
  "reasoning": "why this category",
  "imageUrl": "https://www.google.com/search?q=${encodeURIComponent(name + ' medicine tablet')}&tbm=isch"
}

Category guide:
- Pain Relief: paracetamol, ibuprofen, nimesulide, diclofenac, aceclofenac, aspirin, tramadol, ketorolac, any NSAID or analgesic
- Antibiotic: amoxicillin, azithromycin, ciprofloxacin, metronidazole, doxycycline, cefixime, any antibacterial
- Allergy: cetirizine, levocetirizine, fexofenadine, loratadine, montelukast, chlorpheniramine
- Gastro: omeprazole, pantoprazole, rabeprazole, domperidone, ondansetron, ranitidine, metoclopramide
- Diabetes: metformin, glimepiride, sitagliptin, vildagliptin, insulin, dapagliflozin
- Vitamin & Supplement: vitamin D, B12, calcium, iron, zinc, folic acid, multivitamin
- Syrup: any liquid medicine, suspension, cough syrup
- Injection: any injectable, vial, ampoule
- Cream & Ointment: any topical, gel, cream, lotion
- Baby Care: diapers, baby powder, baby soap, baby oil, baby food
- Surgical & Dressing: bandage, cotton, gauze, gloves, syringe
- Hygiene & Sanitizer: dettol, savlon, sanitizer, soap, handwash
- Health Drink & Nutrition: eno, ORS, electral, glucose, protein powder, horlicks
- Ayurvedic: herbal, ayurvedic, patanjali, dabur, himalaya herbal
- Eye & Ear Drops: eye drops, ear drops, ophthalmic
- Cardiac & BP: amlodipine, atenolol, metoprolol, atorvastatin, losartan, ramipril
- Skin Care: antifungal, fluconazole, ketoconazole, terbinafine, clotrimazole
- Women Health: contraceptive, pregnancy supplement, mefenamic acid, progesterone` }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      category: parsed.category || "General OTC",
      imageUrl: parsed.imageUrl || `https://www.google.com/search?q=${encodeURIComponent(name + ' medicine')}&tbm=isch`
    };
  } catch {
    return {
      category: "General OTC",
      imageUrl: `https://www.google.com/search?q=${encodeURIComponent(name + ' medicine')}&tbm=isch`
    };
  }
}

const VALID_CATEGORIES = [
  "Pain Relief", "Antibiotic", "Allergy", "Gastro", "Diabetes",
  "Vitamin & Supplement", "Syrup", "Injection", "Cream & Ointment",
  "Baby Care", "Surgical & Dressing", "Hygiene & Sanitizer",
  "Health Drink & Nutrition", "Ayurvedic", "Eye & Ear Drops",
  "Cardiac & BP", "Skin Care", "Women Health"
];

// Convert any date format to MM/YYYY
function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";
  // Already MM/YYYY
  if (/^\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // MM-YYYY
  if (/^\d{2}-\d{4}$/.test(dateStr)) return dateStr.replace("-", "/");
  // YYYY-MM-DD — extract MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split("-");
    return `${parts[1]}/${parts[0]}`;
  }
  // DD/MM/YYYY — extract MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split("/");
    return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
}

router.post("/", async (req, res) => {
  const { image, type } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = type === "bill"
    ? `This is a wholesaler medicine bill image. Extract ALL medicines and return ONLY a JSON array:
[
  {
    "name": "BRAND name only — the large trade name e.g. Essthro, Dolo, Crocin, Augmentin",
    "saltName": "full salt/composition e.g. Azithromycin Tablets IP 250mg, Paracetamol 650mg",
    "price": "MRP number only as string",
    "stock": 10,
    "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin & Supplement or Syrup or Injection or Cream & Ointment or Baby Care or Surgical & Dressing or Hygiene & Sanitizer or Health Drink & Nutrition or Ayurvedic or Eye & Ear Drops or Cardiac & BP or Skin Care or Women Health or General OTC",
    "batchNumber": "exact batch/lot number printed on bill e.g. BT241098 or empty string",
    "expiryDate": "MM/YYYY format only e.g. 09/2026 — expiry is EXP: on the bill — NEVER DD/MM/YYYY",
    "manufacturer": "manufacturer or company name",
    "dosage": "dosage if visible",
    "requiresPrescription": false
  }
]
Return ONLY the JSON array.`
    : `This is a medicine package. Read carefully.
BRAND name = large prominent trade name e.g. Essthro, Dolo, Augmentin
SALT = generic composition e.g. Azithromycin Tablets IP 250mg

CRITICAL DATE RULES:
- Expiry (EXP) is printed as MM/YYYY e.g. 09/2026 — return exactly as MM/YYYY
- Manufacturing (MFG) is printed as MM/YYYY e.g. 10/2024 — return exactly as MM/YYYY  
- NEVER return dates as DD/MM/YYYY or YYYY-MM-DD
- Batch number (B.No or Batch) is alphanumeric e.g. CPT241098 — copy exactly as printed

Return ONLY this JSON:
{
  "name": "BRAND name only",
  "saltName": "full salt/composition with strength",
  "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin & Supplement or Syrup or Injection or Cream & Ointment or Baby Care or Surgical & Dressing or Hygiene & Sanitizer or Health Drink & Nutrition or Ayurvedic or Eye & Ear Drops or Cardiac & BP or Skin Care or Women Health or General OTC",
  "price": "MRP number only",
  "dosage": "dosage if visible",
  "howToTake": "how to take",
  "sideEffects": "common side effects of this salt",
  "manufacturer": "manufacturer company name",
  "batchNumber": "exact batch number as printed e.g. CPT241098",
  "expiryDate": "MM/YYYY only e.g. 09/2026",
  "requiresPrescription": true if Rx or Schedule H visible else false,
  "stock": 10
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: "text", text: prompt }
          ]
        }],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json() as any;
    console.log("Scan status:", response.status);
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "AI error" });

    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Process each item — fix dates, lookup category + image
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        item.expiryDate = normalizeDate(item.expiryDate || "");
        const needsCategoryLookup = !item.category || !VALID_CATEGORIES.includes(item.category) || item.category === "General OTC";
        const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
        if (needsCategoryLookup) item.category = details.category;
        item.suggestedImageUrl = details.imageUrl;
      }
    } else {
      parsed.expiryDate = normalizeDate(parsed.expiryDate || "");
      const needsCategoryLookup = !parsed.category || !VALID_CATEGORIES.includes(parsed.category) || parsed.category === "General OTC";
      const details = await lookupMedicineDetails(parsed.name || "", parsed.saltName || "", apiKey);
      if (needsCategoryLookup) parsed.category = details.category;
      parsed.suggestedImageUrl = details.imageUrl;
    }

    res.json({ result: parsed });
  } catch (err: any) {
    console.error("Scan error:", err.message);
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
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a pharmacy data extraction assistant. Return only valid JSON." },
          { role: "user", content: `Extract all medicines from this wholesaler bill. Return ONLY a JSON array:
[{
  "name": "BRAND name",
  "saltName": "salt/generic name with strength",
  "price": "price number",
  "stock": 10,
  "category": "correct category",
  "batchNumber": "batch number",
  "expiryDate": "MM/YYYY format",
  "manufacturer": "company name",
  "dosage": "",
  "requiresPrescription": false
}]

Bill:
${text}

Return only JSON array.` }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json() as any;
    if (!response.ok) return res.status(500).json({ error: data.error?.message });
    const raw = data.choices?.[0]?.message?.content || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(clean);
    const result = Array.isArray(arr) ? arr : [arr];

    // Fix dates and lookup category + image for each
    for (const item of result) {
      item.expiryDate = normalizeDate(item.expiryDate || "");
      const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
      if (!item.category || !VALID_CATEGORIES.includes(item.category) || item.category === "General OTC") {
        item.category = details.category;
      }
      item.suggestedImageUrl = details.imageUrl;
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;