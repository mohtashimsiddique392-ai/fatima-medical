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
          { role: "user", content: `Medicine: "${name}", Salt: "${saltName}"
Choose category from ONLY these (pick the best match by drug class):
Pain Relief = paracetamol ibuprofen nimesulide diclofenac aceclofenac aspirin tramadol mefenamic acid any NSAID analgesic
Antibiotic = amoxicillin azithromycin ciprofloxacin metronidazole doxycycline cefixime any antibacterial
Allergy = cetirizine levocetirizine fexofenadine loratadine montelukast any antihistamine
Gastro = omeprazole pantoprazole rabeprazole domperidone ondansetron ranitidine sucral sucralfate antacid
Diabetes = metformin glimepiride sitagliptin insulin any antidiabetic
Vitamin & Supplement = vitamin D3 B12 calcium iron zinc folic acid multivitamin
Syrup = any liquid suspension syrup form
Injection = any injectable vial ampoule IV
Cream & Ointment = any topical gel cream lotion ointment
Baby Care = baby powder soap oil food lotion diaper
Surgical & Dressing = bandage cotton gauze gloves syringe
Hygiene & Sanitizer = sanitizer dettol savlon soap handwash
Health Drink & Nutrition = ORS walyte electral pedialyte oral rehydration electrolyte eno glucose protein drink
Ayurvedic = herbal ayurvedic patanjali dabur himalaya
Eye & Ear Drops = eye drops ear drops ophthalmic otic
Cardiac & BP = amlodipine atenolol metoprolol ramipril losartan atorvastatin any antihypertensive cardiac
Skin Care = antifungal fluconazole ketoconazole terbinafine clotrimazole dermatological
Women Health = feminine hygiene pregnancy supplement dysmenorrhea non-hormonal contraceptive
Hormones & Steroids = prednisolone dexamethasone betamethasone omnacortil wysolone ovral oval-g thyroid levothyroxine corticosteroid hormonal
Neurological = trinicalm trihexyphenidyl trifluoperazine haloperidol risperidone olanzapine antipsychotic anticholinergic anticonvulsant
General OTC = anything that truly does not fit above

Return ONLY JSON: {"category": "exact name from list above"}` }
        ],
        max_tokens: 50,
        temperature: 0.0
      })
    });
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return {
      category: parsed.category || "General OTC",
      imageUrl: ""
    };
  } catch {
    return { category: "General OTC", imageUrl: "" };
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
    ? `This is a wholesaler medicine bill. Extract every medicine row from the table. Return ONLY a JSON array:
[{
  "name": "Brand name only (from Item Description column, e.g. Chericof Junior, Wysolone, Omnacortil, Trinicalm Forte, Ovral G, Walyte ORS)",
  "saltName": "salt/composition if visible",
  "price": "M.R.P column value (the printed maximum retail price)",
  "costPrice": "Calculate as: Net Value divided by Qty Billed = cost per unit you paid",
  "stock": "Qty Billed number (how many units you received)",
  "category": "best guess",
  "batchNumber": "Batch column value exactly as printed",
  "expiryDate": "Exp Date column value in MM/YYYY format",
  "manufacturer": "Mfac/Mkt By column value (manufacturer/marketed by)",
  "dosage": "Pack column value (e.g. 60ML, 1*15, 1*20, 5 SACH)",
  "requiresPrescription": false
}]`
    : `Medicine package image.
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
  "expiryDate": "MM/YYYY only e.g. 09/2026",
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
      }
    } else {
      parsed.expiryDate = normalizeDate(parsed.expiryDate || "");
      const details = await lookupMedicineDetails(parsed.name || "", parsed.saltName || "", apiKey);
      parsed.category = details.category;
      parsed.suggestedImageUrl = "";
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
          { role: "system", content: "Pharmacy data extraction. Return only valid JSON array." },
          { role: "user", content: `Extract all medicines from this wholesaler bill. Return ONLY JSON array:
[{"name":"BRAND","saltName":"salt+strength","price":"number","costPrice":"net value divided by qty","stock":10,"category":"","batchNumber":"","expiryDate":"MM/YYYY","manufacturer":"","dosage":"","requiresPrescription":false}]

Bill text:
${text}

Return only the JSON array.` }
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
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;