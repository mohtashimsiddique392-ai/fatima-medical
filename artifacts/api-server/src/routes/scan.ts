import { Router } from "express";
const router = Router();

async function lookupMedicineDetails(name: string, saltName: string, apiKey: string): Promise<{ category: string; imageUrl: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a pharmacy expert. Return ONLY valid JSON, no other text." },
          { role: "user", content: `Medicine brand name: "${name}", Salt/Composition: "${saltName}"

Identify the correct pharmacy category based on the drug class, mechanism and therapeutic use.
Also provide a Google image search URL for this medicine.

Return ONLY this JSON object:
{
  "category": "Pain Relief",
  "imageUrl": "https://www.google.com/search?q=Dolo+650mg+paracetamol+tablet&tbm=isch"
}

Choose category from ONLY these options based on drug class:
Pain Relief = paracetamol/acetaminophen, ibuprofen, nimesulide, diclofenac, aceclofenac, aspirin, tramadol, ketorolac, mefenamic acid, naproxen, any NSAID analgesic antipyretic
Antibiotic = amoxicillin, azithromycin, ciprofloxacin, metronidazole, doxycycline, cefixime, cefpodoxime, ampicillin, clarithromycin, levofloxacin, any antibacterial antimicrobial
Allergy = cetirizine, levocetirizine, fexofenadine, loratadine, montelukast, chlorpheniramine, any antihistamine anti-allergic
Gastro = omeprazole, pantoprazole, rabeprazole, esomeprazole, domperidone, ondansetron, ranitidine, famotidine, metoclopramide, any antacid PPI antiemetic
Diabetes = metformin, glimepiride, sitagliptin, vildagliptin, dapagliflozin, empagliflozin, insulin, glipizide, any antidiabetic
Vitamin & Supplement = vitamin D3, B12, B complex, calcium, iron, zinc, folic acid, magnesium, multivitamin, any nutritional supplement
Syrup = any medicine in liquid suspension syrup form
Injection = any injectable vial ampoule IV infusion
Cream & Ointment = any topical gel cream lotion ointment
Baby Care = diapers baby powder baby soap baby oil baby food baby lotion
Surgical & Dressing = bandage cotton gauze surgical tape gloves syringe spirit
Hygiene & Sanitizer = hand sanitizer dettol savlon soap handwash disinfectant
Health Drink & Nutrition = eno ORS electral glucose D protein powder horlicks boost
Ayurvedic = herbal ayurvedic patanjali dabur himalaya herbal
Eye & Ear Drops = eye drops ear drops ophthalmic otic solution
Cardiac & BP = amlodipine atenolol metoprolol ramipril losartan telmisartan atorvastatin rosuvastatin any antihypertensive cardiac
Skin Care = antifungal fluconazole ketoconazole terbinafine clotrimazole miconazole any dermatological
Women Health = oral contraceptive pill progesterone estrogen mefenamic acid dysmenorrhea pregnancy supplement feminine hygiene
Hormones & Steroids = any hormone steroid corticosteroid testosterone estrogen progesterone thyroid levothyroxine prednisolone dexamethasone betamethasone oval-g letrozole clomiphene any Schedule H hormonal drug
General OTC = anything that truly does not fit above

For imageUrl use: https://www.google.com/search?q=MEDICINE_NAME+medicine+tablet&tbm=isch
Replace MEDICINE_NAME with the actual medicine name URL encoded.` }
        ],
        max_tokens: 150,
        temperature: 0.1
      })
    });
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      category: parsed.category || "General OTC",
      imageUrl: parsed.imageUrl || `https://www.google.com/search?q=${encodeURIComponent(name + " medicine")}&tbm=isch`
    };
  } catch {
    return {
      category: "General OTC",
      imageUrl: `https://www.google.com/search?q=${encodeURIComponent(name + " medicine")}&tbm=isch`
    };
  }
}

function normalizeDate(d: string): string {
  if (!d) return "";
  if (/^\d{2}\/\d{4}$/.test(d)) return d;
  if (/^\d{2}-\d{4}$/.test(d)) return d.replace("-", "/");
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { const p = d.split("-"); return `${p[1]}/${p[0]}`; }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) { const p = d.split("/"); return `${p[1]}/${p[2]}`; }
  if (/^\d{2}-\d{2}-\d{4}$/.test(d)) { const p = d.split("-"); return `${p[1]}/${p[2]}`; }
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(d)) { const p = d.split("/"); return `${p[1]}/${p[0]}`; }
  return d;
}

const VALID_CATEGORIES = ["Pain Relief","Antibiotic","Allergy","Gastro","Diabetes","Vitamin & Supplement","Syrup","Injection","Cream & Ointment","Baby Care","Surgical & Dressing","Hygiene & Sanitizer","Health Drink & Nutrition","Ayurvedic","Eye & Ear Drops","Cardiac & BP","Skin Care","Women Health","Hormones & Steroids"];

router.post("/", async (req, res) => {
  const { image, type } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = type === "bill"
    ? `Wholesaler medicine bill image. Extract ALL medicines. Return ONLY JSON array:
[{
  "name": "BRAND name only e.g. Essthro Dolo Crocin Augmentin",
  "saltName": "full salt/composition e.g. Azithromycin Tablets IP 250mg",
  "price": "MRP number as string",
  "stock": 10,
  "category": "best category",
  "batchNumber": "exact batch number printed e.g. BT241098 or empty",
  "expiryDate": "MM/YYYY format ONLY e.g. 09/2026 never DD/MM/YYYY",
  "manufacturer": "company name",
  "dosage": "dosage if visible",
  "requiresPrescription": false
}]`
    : `Medicine package image. 
BRAND = large trade name e.g. Essthro Dolo Oval-G
SALT = composition e.g. Azithromycin IP 250mg Norgestrel Ethinyl Estradiol

DATE RULES - CRITICAL:
EXP date on pack is MM/YYYY e.g. 09/2026 - return as MM/YYYY ONLY
MFG date on pack is MM/YYYY e.g. 10/2024 - return as MM/YYYY ONLY  
NEVER return YYYY-MM-DD or DD/MM/YYYY
Batch number is alphanumeric printed as B.No or Batch e.g. CPT241098

Return ONLY JSON:
{
  "name": "BRAND name only",
  "saltName": "full salt with strength",
  "category": "best category",
  "price": "MRP number",
  "dosage": "dosage",
  "howToTake": "how to take",
  "sideEffects": "side effects",
  "manufacturer": "company",
  "batchNumber": "exact batch e.g. CPT241098",
  "expiryDate": "MM/YYYY only",
  "requiresPrescription": true or false,
  "stock": 10
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
          { type: "text", text: prompt }
        ]}],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json() as any;
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "AI error" });

    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        item.expiryDate = normalizeDate(item.expiryDate || "");
        const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
        if (!VALID_CATEGORIES.includes(item.category)) item.category = details.category;
        item.suggestedImageUrl = details.imageUrl;
      }
    } else {
      parsed.expiryDate = normalizeDate(parsed.expiryDate || "");
      const details = await lookupMedicineDetails(parsed.name || "", parsed.saltName || "", apiKey);
      if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = details.category;
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
          { role: "system", content: "Pharmacy data extraction. Return only valid JSON." },
          { role: "user", content: `Extract medicines from this bill. Return ONLY JSON array:
[{"name":"BRAND name","saltName":"salt with strength","price":"number","stock":10,"category":"","batchNumber":"","expiryDate":"MM/YYYY","manufacturer":"","dosage":"","requiresPrescription":false}]

Bill:
${text}

Return only JSON array.` }
        ],
        max_tokens: 1000, temperature: 0.1
      })
    });

    const data = await response.json() as any;
    if (!response.ok) return res.status(500).json({ error: data.error?.message });
    const raw = data.choices?.[0]?.message?.content || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(clean);
    const result = Array.isArray(arr) ? arr : [arr];

    for (const item of result) {
      item.expiryDate = normalizeDate(item.expiryDate || "");
      const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
      if (!VALID_CATEGORIES.includes(item.category)) item.category = details.category;
      item.suggestedImageUrl = details.imageUrl;
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;
