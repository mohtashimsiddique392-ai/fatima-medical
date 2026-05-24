import { Router } from "express";
const router = Router();

async function lookupMedicineCategory(medicineName: string, saltName: string, apiKey: string): Promise<{ category: string; imageUrl: string }> {
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
          {
            role: "system",
            content: "You are a pharmacy expert. Return ONLY a JSON object, no other text."
          },
          {
            role: "user",
            content: `For this medicine: "${medicineName}" with salt/composition: "${saltName}"

Return ONLY this JSON:
{
  "category": "exact category from this list based on drug class and use: Pain Relief (analgesics, NSAIDs, antipyretics like paracetamol ibuprofen nimesulide diclofenac aceclofenac ketorolac tramadol aspirin) | Antibiotic (antibacterials like amoxicillin azithromycin ciprofloxacin doxycycline metronidazole cefixime augmentin) | Allergy (antihistamines like cetirizine levocetirizine fexofenadine loratadine montelukast) | Gastro (antacids PPIs antiemetics like omeprazole pantoprazole domperidone ondansetron ranitidine) | Diabetes (antidiabetics like metformin glimepiride insulin sitagliptin) | Vitamin & Supplement (vitamins minerals calcium iron zinc folic acid multivitamins) | Syrup (any liquid medicine cough syrup suspension) | Injection (injectables vials ampoules IV) | Cream & Ointment (topical gels creams lotions) | Baby Care (diapers baby powder baby soap baby oil baby food) | Surgical & Dressing (bandage cotton gauze surgical tape gloves syringe) | Hygiene & Sanitizer (sanitizer dettol savlon soap handwash) | Health Drink & Nutrition (protein ORS glucose eno electral horlicks) | Ayurvedic (herbal ayurvedic patanjali dabur himalaya) | Eye & Ear Drops (eye drops ear drops ophthalmic) | Cardiac & BP (heart BP cholesterol amlodipine atenolol atorvastatin losartan) | Skin Care (antifungal dermatology fluconazole ketoconazole terbinafine) | Women Health (gynaecology pregnancy contraceptive folic acid) | General OTC (anything else)",
  "imageUrl": "a working Google image search URL for this specific medicine brand like https://www.google.com/search?q=MedicineName+tablet&tbm=isch or empty string if unsure"
}
Return only the JSON, nothing else.`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      category: parsed.category || "General OTC",
      imageUrl: parsed.imageUrl || ""
    };
  } catch {
    return { category: "General OTC", imageUrl: "" };
  }
}

const KNOWN_CATEGORIES = [
  "Pain Relief", "Antibiotic", "Allergy", "Gastro", "Diabetes",
  "Vitamin & Supplement", "Syrup", "Injection", "Cream & Ointment",
  "Baby Care", "Surgical & Dressing", "Hygiene & Sanitizer",
  "Health Drink & Nutrition", "Ayurvedic", "Eye & Ear Drops",
  "Cardiac & BP", "Skin Care", "Women Health"
];

router.post("/", async (req, res) => {
  const { image, type } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = type === "bill"
    ? `This is a wholesaler medicine bill image. Extract ALL medicines and return ONLY a JSON array:
[
  {
    "name": "BRAND name only e.g. Essthro, Dolo, Crocin — the prominent trade name",
    "saltName": "salt/generic/composition name with strength e.g. Azithromycin Tablets IP 250mg",
    "price": "MRP number only",
    "stock": 10,
    "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin & Supplement or Syrup or Injection or Cream & Ointment or Baby Care or Surgical & Dressing or Hygiene & Sanitizer or Health Drink & Nutrition or Ayurvedic or Eye & Ear Drops or Cardiac & BP or Skin Care or Women Health or General OTC",
    "batchNumber": "batch number if visible or empty string",
    "expiryDate": "MM/YYYY format only e.g. 09/2026 — NOT DD/MM/YYYY. Expiry is usually printed as EXP: MM/YYYY or MM-YYYY",
    "manufacturingDate": "MM/YYYY format only e.g. 10/2024 — NOT DD/MM/YYYY. Usually printed as MFG: MM/YYYY",
    "manufacturer": "manufacturer or marketed by company name if visible",
    "dosage": "dosage if visible",
    "requiresPrescription": false,
    "suggestedImageUrl": ""
  }
]
Return only the JSON array, no explanation, no markdown.`
    : `This is a medicine package/strip/box image. Read carefully.
BRAND name = the large prominent trade name e.g. Essthro, Dolo, Crocin
SALT name = the generic/composition text e.g. Azithromycin Tablets IP 250mg

IMPORTANT FOR DATES:
- Expiry date is printed as EXP: MM/YYYY or MM-YYYY format e.g. 09/2026
- Manufacturing date is printed as MFG: MM/YYYY or MM-YYYY format e.g. 10/2024
- NEVER return dates in DD/MM/YYYY or DD-MM-YYYY format
- Return dates as MM/YYYY only

Return ONLY this JSON:
{
  "name": "BRAND name only — the prominent trade name on the pack",
  "saltName": "full salt/composition name with strength e.g. Azithromycin Tablets IP 250mg",
  "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin & Supplement or Syrup or Injection or Cream & Ointment or Baby Care or Surgical & Dressing or Hygiene & Sanitizer or Health Drink & Nutrition or Ayurvedic or Eye & Ear Drops or Cardiac & BP or Skin Care or Women Health or General OTC",
  "price": "MRP number if visible or empty string",
  "dosage": "dosage instructions if visible",
  "howToTake": "how to take if visible",
  "sideEffects": "common side effects of this salt",
  "manufacturer": "marketed by or manufactured by company name if visible",
  "batchNumber": "batch number if visible or empty string",
  "expiryDate": "MM/YYYY format only e.g. 09/2026 — look for EXP: on the pack",
  "manufacturingDate": "MM/YYYY format only e.g. 10/2024 — look for MFG: on the pack",
  "requiresPrescription": true if Rx symbol or Schedule H visible else false,
  "stock": 10,
  "suggestedImageUrl": ""
}
Return only the JSON, no explanation, no markdown.`;

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
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json();
    console.log("Scan AI status:", response.status);
    if (!response.ok) {
      console.error("Scan AI error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "AI error" });
    }

    const text = data.choices?.[0]?.message?.content || "";
    console.log("Scan AI raw:", text.slice(0, 300));
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Second AI call for category and image lookup
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item.category || item.category === "General OTC" || !KNOWN_CATEGORIES.includes(item.category)) {
          const lookup = await lookupMedicineCategory(item.name || "", item.saltName || "", apiKey);
          item.category = lookup.category;
          if (!item.suggestedImageUrl) item.suggestedImageUrl = lookup.imageUrl;
        } else if (!item.suggestedImageUrl) {
          const lookup = await lookupMedicineCategory(item.name || "", item.saltName || "", apiKey);
          item.suggestedImageUrl = lookup.imageUrl;
        }
      }
    } else {
      if (!parsed.category || parsed.category === "General OTC" || !KNOWN_CATEGORIES.includes(parsed.category)) {
        const lookup = await lookupMedicineCategory(parsed.name || "", parsed.saltName || "", apiKey);
        parsed.category = lookup.category;
        if (!parsed.suggestedImageUrl) parsed.suggestedImageUrl = lookup.imageUrl;
      } else if (!parsed.suggestedImageUrl) {
        const lookup = await lookupMedicineCategory(parsed.name || "", parsed.saltName || "", apiKey);
        parsed.suggestedImageUrl = lookup.imageUrl;
      }
    }

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
          {
            role: "system",
            content: "You are a pharmacy data extraction assistant. Extract medicine details from wholesaler bills and return only valid JSON arrays."
          },
          {
            role: "user",
            content: `Extract all medicines from this wholesaler bill and return ONLY a JSON array:
[
  {
    "name": "BRAND name only",
    "saltName": "salt/generic name with strength",
    "price": "price number only",
    "stock": 10,
    "category": "Pain Relief or Antibiotic or Allergy or Gastro or Diabetes or Vitamin & Supplement or Syrup or Injection or Cream & Ointment or Baby Care or Surgical & Dressing or Hygiene & Sanitizer or Health Drink & Nutrition or Ayurvedic or Eye & Ear Drops or Cardiac & BP or Skin Care or Women Health or General OTC",
    "batchNumber": "",
    "expiryDate": "MM/YYYY format only e.g. 09/2026",
    "manufacturingDate": "MM/YYYY format only e.g. 10/2024",
    "manufacturer": "",
    "dosage": "",
    "requiresPrescription": false,
    "suggestedImageUrl": ""
  }
]

Bill text:
${text}

Return only the JSON array, no explanation.`
          }
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
    const arr = Array.isArray(parsed) ? parsed : [parsed];

    // Second AI call for each item
    for (const item of arr) {
      if (!item.category || item.category === "General OTC" || !KNOWN_CATEGORIES.includes(item.category)) {
        const lookup = await lookupMedicineCategory(item.name || "", item.saltName || "", apiKey);
        item.category = lookup.category;
        if (!item.suggestedImageUrl) item.suggestedImageUrl = lookup.imageUrl;
      } else if (!item.suggestedImageUrl) {
        const lookup = await lookupMedicineCategory(item.name || "", item.saltName || "", apiKey);
        item.suggestedImageUrl = lookup.imageUrl;
      }
    }

    res.json({ result: arr });
  } catch (err: any) {
    res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;