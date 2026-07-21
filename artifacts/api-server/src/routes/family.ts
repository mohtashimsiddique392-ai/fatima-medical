import { Router } from "express";
import { db } from "../../../../lib/db/src/index.js";
import { familyMembersTable } from "../../../../lib/db/src/index.js";
import { eq, and } from "drizzle-orm";
import { requireCustomer } from "../middleware/customerAuth.js";

const router = Router();

router.get("/", requireCustomer, async (req, res) => {
  const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.customerId, req.customerId!));
  return res.json({ members });
});

router.post("/", requireCustomer, async (req, res) => {
  const { name, relation, age, bloodGroup, allergies, medicalConditions } = req.body;
  if (!name || !relation) return res.status(400).json({ error: "name and relation required" });
  const [member] = await db.insert(familyMembersTable).values({
    customerId: req.customerId!, name, relation,
    age: age || null, bloodGroup: bloodGroup || null, allergies: allergies || null, medicalConditions: medicalConditions || null,
  }).returning();
  return res.json({ member });
});

router.put("/:id", requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  const { name, relation, age, bloodGroup, allergies, medicalConditions } = req.body;
  const [member] = await db.update(familyMembersTable)
    .set({ name, relation, age: age || null, bloodGroup: bloodGroup || null, allergies: allergies || null, medicalConditions: medicalConditions || null })
    .where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.customerId, req.customerId!)))
    .returning();
  if (!member) return res.status(404).json({ error: "Not found" });
  res.json({ member });
});

router.delete("/:id", requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(familyMembersTable).where(and(eq(familyMembersTable.id, id), eq(familyMembersTable.customerId, req.customerId!)));
  res.json({ success: true });
});

export default router;
