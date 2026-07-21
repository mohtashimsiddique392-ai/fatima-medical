import { Router } from "express";
import { db } from "../../../../lib/db/src/index.js";
import { productsTable } from "../../../../lib/db/src/index.js";
import { eq, and, isNotNull } from "drizzle-orm";
import { requirePermission } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", async (req, res) => {
  const { category, search } = req.query as { category?: string; search?: string };
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (search) result = result.filter(p =>
    p.name.toLowerCase().includes((search as string).toLowerCase()) ||
    ((p as any).saltName && (p as any).saltName.toLowerCase().includes((search as string).toLowerCase()))
  );

  const merged = new Map<string, any>();
  for (const p of result) {
    const key = `${p.name.toLowerCase().trim()}|${((p as any).saltName || "").toLowerCase().trim()}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.stock = (existing.stock || 0) + (p.stock || 0);
      if (!existing.manufacturer && (p as any).manufacturer) existing.manufacturer = (p as any).manufacturer;
      if (!existing.expiryDate && p.expiryDate) existing.expiryDate = p.expiryDate;
      if (!existing.batchNumber && (p as any).batchNumber) existing.batchNumber = (p as any).batchNumber;
      existing._allIds = [...(existing._allIds || [existing.id]), p.id];
    } else {
      merged.set(key, { ...p, _allIds: [p.id] });
    }
  }

  const deduped = Array.from(merged.values());
  res.json({ products: deduped, total: deduped.length });
});

router.get("/categories", async (_req, res) => {
  const products = await db.select({ category: productsTable.category }).from(productsTable).where(eq(productsTable.isActive, true));
  const cats = [...new Set(products.map(p => p.category))];
  res.json({ categories: cats });
});

router.get("/expiry-alerts", requirePermission("catalogue"), async (req, res) => {
  const withinDays = Number(req.query.days) || 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const allProducts = await db.select().from(productsTable).where(and(eq(productsTable.isActive, true), isNotNull(productsTable.expiryDate)));
  const alerts = allProducts.filter(p => {
    if (!p.expiryDate) return false;
    return p.expiryDate <= cutoffStr;
  }).map(p => {
    const daysLeft = Math.ceil((new Date(p.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { ...p, daysLeft, isExpired: daysLeft < 0 };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
  res.json({ alerts, total: alerts.length });
});

router.get("/:id", async (req, res) => {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(req.params.id))).limit(1);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.post("/", requirePermission("catalogue"), async (req, res) => {
  const { name, saltName, description, price, category, imageUrl, stock, dosage, howToTake, sideEffects, requiresPrescription, expiryDate, batchNumber, manufacturer, costPrice } = req.body;
  if (!name || !price || !category) return res.status(400).json({ error: "Name, price, and category required" });
  const [product] = await db.insert(productsTable).values({
    name,
    ...((productsTable as any).saltName !== undefined ? { saltName: saltName || null } : {}),
    description, price: String(price), category,
    imageUrl: imageUrl || null, stock: stock || 0,
    dosage, howToTake, sideEffects,
    requiresPrescription: requiresPrescription || false,
    isActive: true,
    expiryDate: expiryDate || null,
    batchNumber: batchNumber || null,
    manufacturer: manufacturer || null,
    costPrice: costPrice ? String(costPrice) : null,
  } as any).returning();
  return res.status(201).json(product);
});

router.put("/:id", requirePermission("catalogue"), async (req, res) => {
  const { name, saltName, description, price, category, imageUrl, stock, dosage, howToTake, sideEffects, requiresPrescription, isActive, expiryDate, batchNumber, manufacturer, costPrice } = req.body;
  const [product] = await db.update(productsTable).set({
    ...(name !== undefined && { name }),
    ...(saltName !== undefined && { saltName: saltName || null } as any),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: String(price) }),
    ...(category !== undefined && { category }),
    ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
    ...(stock !== undefined && { stock }),
    ...(dosage !== undefined && { dosage }),
    ...(howToTake !== undefined && { howToTake }),
    ...(sideEffects !== undefined && { sideEffects }),
    ...(requiresPrescription !== undefined && { requiresPrescription }),
    ...(isActive !== undefined && { isActive }),
    ...(expiryDate !== undefined && { expiryDate: expiryDate || null }),
    ...(batchNumber !== undefined && { batchNumber: batchNumber || null }),
    ...(manufacturer !== undefined && { manufacturer: manufacturer || null }),
    ...(costPrice !== undefined && { costPrice: costPrice ? String(costPrice) : null }),
  } as any).where(eq(productsTable.id, Number(req.params.id))).returning();
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.delete("/:id", requirePermission("catalogue"), async (req, res) => {
  await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, Number(req.params.id)));
  res.json({ message: "Product deleted" });
});

export default router;