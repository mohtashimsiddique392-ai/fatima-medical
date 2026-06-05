import { Router } from "express";
const router = Router();

async function lookupMedicineDetails(name: string, saltName: string, apiKey: string): Promise<{ category: string; manufacturer: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a pharmacy expert. Return ONLY valid JSON, no other text." },
          { role: "user", content: `Medicine: "${name}", Salt: "${saltName}"

Pick category from ONLY this list:
Pain Relief = paracetamol ibuprofen nimesulide diclofenac aceclofenac mefenamic acid NSAID analgesic
Antibiotic = amoxicillin azithromycin ciprofloxacin metronidazole doxycycline cefixime antibacterial
Allergy = cetirizine levocetirizine fexofenadine loratadine montelukast antihistamine
Gastro = omeprazole pantoprazole domperidone ondansetron sucral sucralfate antacid ranitidine
Diabetes = metformin glimepiride sitagliptin insulin antidiabetic
Vitamin & Supplement = vitamin D3 B12 calcium iron zinc folic acid multivitamin
Syrup = chericof cheston benadryl cough syrup suspension liquid 60ML 100ML 200ML any liquid
Injection = injectable vial ampoule IV
Cream & Ointment = topical gel cream lotion ointment
Baby Care = baby powder soap oil food lotion
Surgical & Dressing = bandage cotton gauze gloves syringe
Hygiene & Sanitizer = sanitizer dettol savlon soap handwash
Health Drink & Nutrition = ORS walyte electral oral rehydration electrolyte eno glucose protein
Ayurvedic = herbal ayurvedic patanjali dabur himalaya
Eye & Ear Drops = eye drops ear drops ophthalmic otic
Cardiac & BP = amlodipine atenolol metoprolol ramipril losartan atorvastatin antihypertensive
Skin Care = antifungal fluconazole ketoconazole terbinafine clotrimazole dermatological
Women Health = feminine hygiene pregnancy supplement dysmenorrhea contraceptive non-hormonal
Hormones & Steroids = prednisolone dexamethasone betamethasone omnacortil wysolone ovral oval-g thyroid levothyroxine corticosteroid
Neurological = trinicalm trihexyphenidyl trifluoperazine haloperidol risperidone antipsychotic anticholinergic
General OTC = anything else

RULES:
- Any medicine with SYP/Syrup/SY/ML or liquid = Syrup
- Any cough medicine = Syrup

Return ONLY JSON:
{"category": "exact name from list", "manufacturer": "likely Indian pharma company or empty string"}` }
        ],
        max_tokens: 80,
        temperature: 0.0
      })
    });
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return { category: parsed.category || "General OTC", manufacturer: parsed.manufacturer || "" };
  } catch {
    return { category: "General OTC", manufacturer: "" };
  }
}

function normalizeDate(d: string): string {
  if (!d) return "";
  if (/^\d{2}\/\d{4}$/.test(d)) { const [m, y] = d.split("/"); return `${y}-${m}-01`; }
  if (/^\d{2}-\d{4}$/.test(d)) { const [m, y] = d.split("-"); return `${y}-${m}-01`; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) { const p = d.split("/"); return `${p[2]}-${p[1]}-${p[0]}`; }
  if (/^\d{2}-\d{2}-\d{4}$/.test(d)) { const p = d.split("-"); return `${p[2]}-${p[1]}-${p[0]}`; }
  return d;
}

router.post("/", async (req, res) => {
  const { image, type } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = type === "bill"
    ? `Wholesaler medicine bill image. Extract ALL medicines. Return ONLY JSON array:
[{
  "name": "BRAND name only (e.g. Chericof Junior, Wysolone, Omnacortil)",
  "saltName": "full salt/composition if visible",
  "price": "MRP number",
  "costPrice": "trade/purchase price if visible",
  "stock": 10,
  "category": "best guess",
  "batchNumber": "exact batch (e.g. SKY0002SA, NT4015, B150)",
  "expiryDate": "MM/YYYY only (e.g. 12/2027)",
  "manufacturer": "company name if visible",
  "dosage": "pack size (e.g. 60ML, 1*15)",
  "requiresPrescription": false
}]`
    : `Medicine package photo. Return ONLY JSON:
{
  "name": "BRAND name printed largest",
  "saltName": "full salt with strength",
  "price": "MRP number",
  "costPrice": "",
  "dosage": "pack size e.g. 60ML 1*15",
  "howToTake": "dosage instructions if visible",
  "sideEffects": "side effects if mentioned",
  "manufacturer": "company name on pack",
  "batchNumber": "batch number printed exactly",
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

    const rawText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = rawText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error("No JSON in response: " + rawText.slice(0, 100));
    const parsed = JSON.parse(jsonMatch[0].trim());

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        item.expiryDate = normalizeDate(item.expiryDate || "");
        const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
        item.category = details.category;
        item.suggestedImageUrl = "";
        if (!item.manufacturer && details.manufacturer) item.manufacturer = details.manufacturer;
      }
    } else {
      parsed.expiryDate = normalizeDate(parsed.expiryDate || "");
      const details = await lookupMedicineDetails(parsed.name || "", parsed.saltName || "", apiKey);
      parsed.category = details.category;
      parsed.suggestedImageUrl = "";
      if (!parsed.manufacturer && details.manufacturer) parsed.manufacturer = details.manufacturer;
    }

    res.json({ result: parsed });
  } catch (err: any) {
    console.error("Scan error:", err.message);
    res.status(500).json({ error: err.message });
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
          { role: "system", content: "Extract medicines from pharmacy bill. Return only valid JSON array." },
          { role: "user", content: `Extract all medicines. Return ONLY JSON array:
[{"name":"BRAND","saltName":"composition","price":"MRP","costPrice":"trade price or empty","stock":10,"category":"","batchNumber":"","expiryDate":"MM/YYYY","manufacturer":"","dosage":"","requiresPrescription":false}]

Bill:
${text}` }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const data = await response.json() as any;
    if (!response.ok) return res.status(500).json({ error: data.error?.message });
    const raw = data.choices?.[0]?.message?.content || "[]";
    const jsonMatch2 = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!jsonMatch2) throw new Error("No JSON in response");
    const arr = JSON.parse(jsonMatch2[0].trim());
    const result = Array.isArray(arr) ? arr : [arr];

    for (const item of result) {
      item.expiryDate = normalizeDate(item.expiryDate || "");
      const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
      item.category = details.category;
      item.suggestedImageUrl = "";
      if (!item.manufacturer && details.manufacturer) item.manufacturer = details.manufacturer;
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;