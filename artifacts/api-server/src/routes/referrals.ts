import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/my", async (req, res) => {
  const { customerId } = req.query as { customerId?: string };
  if (!customerId)
    return res.status(400).json({ error: "customerId required" });

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, Number(customerId)))
    .limit(1);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const referredUsers = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.referredBy, customer.id));

  return res.json({
    referralCode: customer.referralCode,
    credits: Number(customer.referralCredits),
    totalReferrals: referredUsers.length,
    hasUsedReferral: !!customer.referredBy,
    referredUsers: referredUsers.map((u) => ({
      name: u.name,
      joinedAt: u.createdAt,
    })),
  });
});

router.post("/apply", async (req, res) => {
  const { customerId, referralCode } = req.body;
  if (!customerId || !referralCode)
    return res
      .status(400)
      .json({ error: "customerId and referralCode required" });

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, Number(customerId)))
    .limit(1);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  if (customer.referredBy)
    return res.status(400).json({ error: "Referral code already applied" });

  const [referrer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.referralCode, referralCode))
    .limit(1);
  if (!referrer)
    return res.status(400).json({ error: "Invalid referral code" });
  if (referrer.id === customer.id)
    return res.status(400).json({ error: "Cannot use your own referral code" });

  await db
    .update(customersTable)
    .set({
      referredBy: referrer.id,
      referralCredits: String(Number(customer.referralCredits) + 50),
    })
    .where(eq(customersTable.id, customer.id));
  await db
    .update(customersTable)
    .set({ referralCredits: String(Number(referrer.referralCredits) + 50) })
    .where(eq(customersTable.id, referrer.id));

  return res.json({
    message: "Referral applied! You and your referrer each earned ₹50 credits.",
  });
});

export default router;
