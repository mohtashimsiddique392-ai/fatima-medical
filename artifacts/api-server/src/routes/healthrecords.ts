import { Router } from "express";
import { db } from "@workspace/db";
import { healthRecordsTable, familyMembersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireCustomer } from "../middleware/customerAuth.js";

const router = Router();

router.get("/", requireCustomer, async (req, res) => {
  const familyMemberId = req.query.familyMemberId ? Number(req.query.familyMemberId) : undefined;

  let records;
  if (familyMemberId) {
    // Verify the family member actually belongs to this customer before returning their records.
    const [member] = await db.select().from(familyMembersTable)
      .where(and(eq(familyMembersTable.id, familyMemberId), eq(familyMembersTable.customerId, req.customerId!))).limit(1);
    if (!member) return res.status(403).json({ error: "Not your family member" });
    records = await db.select().from(healthRecordsTable)
      .where(eq(healthRecordsTable.familyMemberId, familyMemberId))
      .orderBy(desc(healthRecordsTable.recordedAt));
  } else {
    records = await db.select().from(healthRecordsTable)
      .where(eq(healthRecordsTable.customerId, req.customerId!))
      .orderBy(desc(healthRecordsTable.recordedAt));
  }
  return res.json({ records });
});

router.post("/", requireCustomer, async (req, res) => {
  const { familyMemberId, memberName, type, value, unit, notes, recordedAt } = req.body;
  if (!type || !value) return res.status(400).json({ error: "type and value required" });
  const [record] = await db.insert(healthRecordsTable).values({
    customerId: req.customerId!,
    familyMemberId: familyMemberId || null,
    memberName: memberName || null,
    type, value, unit: unit || null, notes: notes || null,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
  }).returning();
  return res.json({ record });
});

router.delete("/:id", requireCustomer, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(healthRecordsTable).where(and(eq(healthRecordsTable.id, id), eq(healthRecordsTable.customerId, req.customerId!)));
  res.json({ success: true });
});

export default router;
