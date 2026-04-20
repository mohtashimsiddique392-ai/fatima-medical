import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, like, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const { category, search } = req.query as { category?: string; search?: string };
  let query = db.select().from(productsTable).where(eq(productsTable.isActive, true));
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
  let result = products;
  if (category) result = result.filter(p => p.category === category);
  if (search) result = result.filter(p => p.name.toLowerCase().includes((search as string).toLowerCase()));
  res.json({ products: result, total: result.length });
});

router.get("/categories", async (_req, res) => {
  const products = await db.select({ category: productsTable.category }).from(productsTable).where(eq(productsTable.isActive, true));
  const cats = [...new Set(products.map(p => p.category))];
  res.json({ categories: cats });
});

router.get("/:id", async (req, res) => {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(req.params.id))).limit(1);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.post("/", async (req, res) => {
  const { name, description, price, category, imageUrl, stock, dosage, howToTake, sideEffects, requiresPrescription } = req.body;
  if (!name || !price || !category) return res.status(400).json({ error: "Name, price, and category required" });
  const [product] = await db.insert(productsTable).values({
    name, description, price: String(price), category,
    imageUrl, stock: stock || 0, dosage, howToTake, sideEffects,
    requiresPrescription: requiresPrescription || false, isActive: true,
  }).returning();
  res.status(201).json(product);
});

router.put("/:id", async (req, res) => {
  const { name, description, price, category, imageUrl, stock, dosage, howToTake, sideEffects, requiresPrescription, isActive } = req.body;
  const [product] = await db.update(productsTable).set({
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: String(price) }),
    ...(category !== undefined && { category }),
    ...(imageUrl !== undefined && { imageUrl }),
    ...(stock !== undefined && { stock }),
    ...(dosage !== undefined && { dosage }),
    ...(howToTake !== undefined && { howToTake }),
    ...(sideEffects !== undefined && { sideEffects }),
    ...(requiresPrescription !== undefined && { requiresPrescription }),
    ...(isActive !== undefined && { isActive }),
  }).where(eq(productsTable.id, Number(req.params.id))).returning();
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.delete("/:id", async (req, res) => {
  await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, Number(req.params.id)));
  res.json({ message: "Product deleted" });
});

export default router;
