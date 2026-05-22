import { Router } from "express";
import { db } from "@workspace/db";
import { healthRecordsTable, familyMembersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Get health records for a customer (all members)
router.get("/", async (req, res) => {
  const customerId = Number(req.query.customerId);
  const familyMemberId = req.query.familyMemberId ? Number(req.query.familyMemberId) : undefined;
  if (!customerId) return res.status(400).json({ error: "customerId required" });

  let records;
  if (familyMemberId) {
    records = await db.select().from(healthRecordsTable)
      .where(eq(healthRecordsTable.familyMemberId, familyMemberId))
      .orderBy(desc(healthRecordsTable.recordedAt));
  } else {
    records = await db.select().from(healthRecordsTable)
      .where(eq(healthRecordsTable.customerId, customerId))
      .orderBy(desc(healthRecordsTable.recordedAt));
  }
  return res.json({ records });
});

// Add a health record
router.post("/", async (req, res) => {
  const { customerId, familyMemberId, memberName, type, value, unit, notes, recordedAt } = req.body;
  if (!customerId || !type || !value) return res.status(400).json({ error: "customerId, type, and value required" });
  const [record] = await db.insert(healthRecordsTable).values({
    customerId,
    familyMemberId: familyMemberId || null,
    memberName: memberName || null,
    type,
    value,
    unit: unit || null,
    notes: notes || null,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
  }).returning();
  return res.json({ record });
});

// Delete a health record
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(healthRecordsTable).where(eq(healthRecordsTable.id, id));
  res.json({ success: true });
});

export default router;
