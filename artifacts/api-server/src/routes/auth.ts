import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, adminTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// In-memory OTP store (for demo; production would use DB)
const otpStore: Record<string, { otp: string; expiresAt: number }> = {};

// Admin login
router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const admin = await db.select().from(adminTable).where(eq(adminTable.username, username)).limit(1);
  if (!admin.length || admin[0].password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = Buffer.from(`admin:${username}:${Date.now()}`).toString("base64");
  res.json({ token, username: admin[0].username, role: "admin", phone: admin[0].phone });
});

// Admin request OTP for password change
router.post("/admin/request-otp", async (req, res) => {
  const { username } = req.body;
  const admin = await db.select().from(adminTable).where(eq(adminTable.username, username || "fatima04786")).limit(1);
  if (!admin.length) return res.status(404).json({ error: "Admin not found" });

  const otp = generateOtp();
  otpStore[admin[0].username] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

  // In a real app, send SMS. Here we return it for demo.
  res.json({ message: `OTP sent to ${admin[0].phone}. (Demo OTP: ${otp})`, phone: admin[0].phone });
});

// Admin change password via OTP
router.post("/admin/change-password", async (req, res) => {
  const { username, otp, newPassword } = req.body;
  if (!username || !otp || !newPassword) {
    return res.status(400).json({ error: "Username, OTP, and new password required" });
  }
  const stored = otpStore[username];
  if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  await db.update(adminTable).set({ password: newPassword }).where(eq(adminTable.username, username));
  delete otpStore[username];
  res.json({ message: "Password changed successfully" });
});

// Customer register
router.post("/customer/register", async (req, res) => {
  const { name, phone, password, referralCode } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Name, phone, and password required" });
  }
  const existing = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  if (existing.length) {
    return res.status(400).json({ error: "Phone number already registered" });
  }

  let referredById: number | null = null;
  if (referralCode) {
    const referrer = await db.select().from(customersTable).where(eq(customersTable.referralCode, referralCode)).limit(1);
    if (referrer.length) referredById = referrer[0].id;
  }

  let myCode = generateReferralCode();
  // Ensure unique
  let attempts = 0;
  while (attempts < 10) {
    const check = await db.select().from(customersTable).where(eq(customersTable.referralCode, myCode)).limit(1);
    if (!check.length) break;
    myCode = generateReferralCode();
    attempts++;
  }

  const [customer] = await db.insert(customersTable).values({
    name,
    phone,
    password,
    referralCode: myCode,
    referredBy: referredById,
    referralCredits: "0",
  }).returning();

  // Credit referrer
  if (referredById) {
    await db.execute(`UPDATE customers SET referral_credits = referral_credits + 50 WHERE id = ${referredById}`);
  }

  const token = Buffer.from(`customer:${customer.id}:${Date.now()}`).toString("base64");
  res.json({ token, id: customer.id, name: customer.name, phone: customer.phone, referralCode: customer.referralCode, referralCredits: Number(customer.referralCredits), role: "customer" });
});

// Customer login
router.post("/customer/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password required" });
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  if (!customer || customer.password !== password) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  const token = Buffer.from(`customer:${customer.id}:${Date.now()}`).toString("base64");
  res.json({ token, id: customer.id, name: customer.name, phone: customer.phone, referralCode: customer.referralCode, referralCredits: Number(customer.referralCredits), role: "customer" });
});

export default router;
