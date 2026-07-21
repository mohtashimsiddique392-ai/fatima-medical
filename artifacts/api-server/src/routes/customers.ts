import { Router } from "express";
import { db, customersTable } from "../../../../lib/db/src/index.js";
import { eq, sql } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import { requireCustomer } from "../middleware/customerAuth.js";

const router = Router();

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Called by the frontend right after Clerk sign-up (email verified via
 * Clerk's own email OTP) or first sign-in, to make sure a matching row
 * exists in our own `customers` table, which is what the rest of the app
 * (orders, referrals, family, health records) is keyed on.
 */
router.post("/sync", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in required" });

  const [existing] = await db.select().from(customersTable).where(eq(customersTable.clerkUserId, userId)).limit(1);
  if (existing) {
    return res.json({
      id: existing.id,
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      referralCode: existing.referralCode,
      referralCredits: Number(existing.referralCredits),
    });
  }

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch {
    return res.status(502).json({ error: "Could not verify your account with Clerk. Please try again in a moment." });
  }

  const email = clerkUser.emailAddresses?.[0]?.emailAddress || req.body.email;
  const name = req.body.name || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "Customer";
  const phone = req.body.phone || null;
  if (!email) return res.status(400).json({ error: "Email address required" });

  // A previous, incomplete registration attempt with this same email may
  // already have created a customers row (tied to a now-abandoned Clerk
  // user). If so, adopt it rather than failing on the unique constraint.
  const [existingByEmail] = await db.select().from(customersTable).where(eq(customersTable.email, email)).limit(1);
  if (existingByEmail) {
    const [updated] = await db.update(customersTable)
      .set({ clerkUserId: userId, name, phone: phone ?? existingByEmail.phone })
      .where(eq(customersTable.id, existingByEmail.id))
      .returning();
    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      referralCode: updated.referralCode,
      referralCredits: Number(updated.referralCredits),
    });
  }

  const { referralCode: appliedCode } = req.body as { referralCode?: string };
  let referredById: number | null = null;
  if (appliedCode) {
    const [referrer] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.referralCode, appliedCode)).limit(1);
    if (referrer) referredById = referrer.id;
  }

  let myCode = generateReferralCode();
  for (let attempts = 0; attempts < 10; attempts++) {
    const [check] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.referralCode, myCode)).limit(1);
    if (!check) break;
    myCode = generateReferralCode();
  }

  const [customer] = await db.insert(customersTable).values({
    clerkUserId: userId,
    name,
    email,
    phone,
    referralCode: myCode,
    referredBy: referredById,
    referralCredits: referredById ? "50" : "0",
  }).returning();

  if (referredById) {
    await db.update(customersTable)
      .set({ referralCredits: sql`${customersTable.referralCredits} + 50` })
      .where(eq(customersTable.id, referredById));
  }

  return res.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    referralCode: customer.referralCode,
    referralCredits: Number(customer.referralCredits),
  });
});

router.get("/me", requireCustomer, async (req, res) => {
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, req.customerId!)).limit(1);
  if (!customer) return res.status(404).json({ error: "Not found" });
  return res.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    referralCode: customer.referralCode,
    referralCredits: Number(customer.referralCredits),
  });
});

export default router;
