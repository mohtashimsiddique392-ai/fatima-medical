import { Router } from "express";
import { Pool } from "pg";
const router = Router();

const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Save medicine to cache
async function saveMedicineCache(nameKey: string, category: string, imageUrl: string, saltName: string) {
  const pool = getPool();
  try {
    await pool.query(`
      INSERT INTO medicine_cache (name_key, category, image_url, salt_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name_key) DO UPDATE SET
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        updated_at = NOW()
    `, [nameKey.toLowerCase().trim(), category, imageUrl, saltName]);
  } catch (e) {
    console.log("Cache save error:", e);
  } finally { pool.end(); }
}

// Check medicine cache first
async function checkMedicineCache(name: string, saltName: string): Promise<{ category: string; imageUrl: string } | null> {
  const pool = getPool();
  try {
    const key = (name + " " + saltName).toLowerCase().trim();
    const { rows } = await pool.query(
      "SELECT category, image_url FROM medicine_cache WHERE name_key = $1 OR name_key = $2 LIMIT 1",
      [name.toLowerCase().trim(), key]
    );
    if (rows[0]) return { category: rows[0].category, imageUrl: rows[0].image_url || "" };
    return null;
  } catch { return null; }
  finally { pool.end(); }
}

// AI lookup for category and image — always runs
async function lookupMedicineDetails(name: string, saltName: string, apiKey: string): Promise<{ category: string; imageUrl: string }> {
  // Check cache first
  const cached = await checkMedicineCache(name, saltName);
  if (cached) {
    console.log("Cache hit for:", name, "->", cached.category);
    return cached;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a clinical pharmacist. Classify medicines by their drug class. Return ONLY valid JSON." },
          { role: "user", content: `Medicine: "${name}"
Salt/Composition: "${saltName}"

Task: Identify the correct pharmacy category based on drug class and therapeutic use.

IMPORTANT RULES:
- Oval-G contains Norgestrel + Ethinyl Estradiol = Hormones & Steroids (oral contraceptive)
- Any oral contraceptive pill = Hormones & Steroids
- Any corticosteroid (prednisolone, dexamethasone, betamethasone) = Hormones & Steroids  
- Any thyroid hormone (levothyroxine, thyroxine) = Hormones & Steroids
- Schedule H drugs that are hormones = Hormones & Steroids
- Paracetamol/Acetaminophen based = Pain Relief
- Any NSAID (nimesulide, ibuprofen, diclofenac, aceclofenac) = Pain Relief
- Any antibiotic = Antibiotic
- Omeprazole/Pantoprazole/antacid = Gastro
- Cetirizine/antihistamine = Allergy
- Metformin/insulin/antidiabetic = Diabetes
- Vitamins/minerals/supplements = Vitamin & Supplement
- Any liquid medicine = Syrup
- Any injectable = Injection
- Any topical gel/cream = Cream & Ointment
- Baby products = Baby Care
- Cotton/bandage/surgical = Surgical & Dressing
- Sanitizer/dettol/soap = Hygiene & Sanitizer
- ORS/protein drink/eno = Health Drink & Nutrition
- Ayurvedic/herbal = Ayurvedic
- Eye/ear drops = Eye & Ear Drops
- BP/heart/cholesterol medicines = Cardiac & BP
- Antifungal skin treatments = Skin Care
- Pregnancy/feminine/contraceptive non-hormonal = Women Health

Return ONLY:
{
  "category": "exact category name",
  "imageUrl": "https://www.google.com/search?q=${encodeURIComponent(name)}+medicine&tbm=isch"
}` }
        ],
        max_tokens: 100,
        temperature: 0.0
      })
    });
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content || "{}";
    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
if (!jsonMatch) throw new Error("No JSON found in AI response");
const clean = jsonMatch[0].trim();
const parsed = JSON.parse(clean);
    const result = {
      category: parsed.category || "General OTC",
      imageUrl: parsed.imageUrl || `https://www.google.com/search?q=${encodeURIComponent(name + " medicine")}&tbm=isch`
    };
    // Save to cache
    await saveMedicineCache(name, result.category, result.imageUrl, saltName);
    return result;
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

router.post("/", async (req, res) => {
  const { image, type } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const prompt = type === "bill"
    ? `Wholesaler medicine bill. Extract ALL medicines. Return ONLY JSON array:
[{
  "name": "BRAND name only e.g. Essthro Dolo Crocin Oval-G",
  "saltName": "full composition e.g. Azithromycin IP 250mg or Norgestrel 0.5mg + Ethinyl Estradiol 0.05mg",
  "price": "MRP number",
  "stock": 10,
  "category": "best guess category",
  "batchNumber": "exact batch printed e.g. BT241098",
  "expiryDate": "MM/YYYY e.g. 09/2026 NEVER DD/MM/YYYY",
  "manufacturer": "company name",
  "dosage": "if visible",
  "requiresPrescription": false
}]`
    : `Medicine package image.
BRAND = large trade name e.g. Essthro, Dolo, Oval-G, Augmentin
SALT = composition e.g. Azithromycin IP 250mg, Norgestrel+Ethinyl Estradiol

CRITICAL DATE RULES:
- EXP printed as MM/YYYY → return as MM/YYYY e.g. 09/2026
- MFG printed as MM/YYYY → return as MM/YYYY e.g. 10/2024
- NEVER return YYYY-MM-DD or DD/MM/YYYY
- Batch = B.No or Batch number e.g. CPT241098 copy exactly

Return ONLY JSON:
{
  "name": "BRAND only",
  "saltName": "full salt+strength",
  "category": "best guess",
  "price": "MRP",
  "dosage": "dosage",
  "howToTake": "how to take",
  "sideEffects": "side effects",
  "manufacturer": "company",
  "batchNumber": "exact e.g. CPT241098",
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
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "AI error", details: data.error });

    const rawText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
if (!jsonMatch) throw new Error("No JSON found in AI response");
const clean = jsonMatch[0].trim();
const parsed = JSON.parse(clean);
    // Always run second AI lookup for accurate category + image
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        item.expiryDate = normalizeDate(item.expiryDate || "");
        const details = await lookupMedicineDetails(item.name || "", item.saltName || "", apiKey);
        item.category = details.category;
        item.suggestedImageUrl = details.imageUrl;
      }
    } else {
      parsed.expiryDate = normalizeDate(parsed.expiryDate || "");
      const details = await lookupMedicineDetails(parsed.name || "", parsed.saltName || "", apiKey);
      parsed.category = details.category;
      parsed.suggestedImageUrl = details.imageUrl;
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
          { role: "system", content: "Pharmacy bill extraction. Return only valid JSON." },
          { role: "user", content: `Extract medicines from bill. Return ONLY JSON array:
[{"name":"BRAND","saltName":"salt+strength","price":"number","stock":10,"category":"","batchNumber":"","expiryDate":"MM/YYYY","manufacturer":"","dosage":"","requiresPrescription":false}]

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
      item.category = details.category;
      item.suggestedImageUrl = details.imageUrl;
    }

    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: "Failed: " + err.message });
  }
});

export default router;