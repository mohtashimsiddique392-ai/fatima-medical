import { Router } from "express";
import { db } from "@workspace/db";
import { familyMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Get all family members for a customer
router.get("/", async (req, res) => {
  const customerId = Number(req.query.customerId);
  if (!customerId) return res.status(400).json({ error: "customerId required" });
  const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.customerId, customerId));
  res.json({ members });
});

// Add a family member
router.post("/", async (req, res) => {
  const { customerId, name, relation, age, bloodGroup, allergies, medicalConditions } = req.body;
  if (!customerId || !name || !relation) return res.status(400).json({ error: "customerId, name, and relation required" });
  const [member] = await db.insert(familyMembersTable).values({ customerId, name, relation, age: age || null, bloodGroup: bloodGroup || null, allergies: allergies || null, medicalConditions: medicalConditions || null }).returning();
  res.json({ member });
});

// Update a family member
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, relation, age, bloodGroup, allergies, medicalConditions } = req.body;
  const [member] = await db.update(familyMembersTable).set({ name, relation, age: age || null, bloodGroup: bloodGroup || null, allergies: allergies || null, medicalConditions: medicalConditions || null }).where(eq(familyMembersTable.id, id)).returning();
  res.json({ member });
});

// Delete a family member
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(familyMembersTable).where(eq(familyMembersTable.id, id));
  res.json({ success: true });
});

export default router;
