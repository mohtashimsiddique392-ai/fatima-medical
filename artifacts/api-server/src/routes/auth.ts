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

// Columns that are safe to select in production (excludes otp/otpExpiresAt added later)
const adminCols = {
  id: adminTable.id,
  username: adminTable.username,
  password: adminTable.password,
  phone: adminTable.phone,
};

// Columns that are safe to select in production (excludes address added later)
const customerCols = {
  id: customersTable.id,
  name: customersTable.name,
  phone: customersTable.phone,
  password: customersTable.password,
  referralCode: customersTable.referralCode,
  referredBy: customersTable.referredBy,
  referralCredits: customersTable.referralCredits,
  createdAt: customersTable.createdAt,
};

// Admin login
router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const [admin] = await db.select(adminCols).from(adminTable).where(eq(adminTable.username, username)).limit(1);
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = Buffer.from(`admin:${username}:${Date.now()}`).toString("base64");
  return res.json({ token, username: admin.username, role: "admin", phone: admin.phone });
});

// Admin request OTP for password change
router.post("/admin/request-otp", async (req, res) => {
  const { username } = req.body;
  const [admin] = await db.select(adminCols).from(adminTable).where(eq(adminTable.username, username || "fatima04786")).limit(1);
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const otp = generateOtp();
  otpStore[admin.username] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

  return res.json({ message: `OTP sent to ${admin.phone}. (Demo OTP: ${otp})`, phone: admin.phone });
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
  return res.json({ message: "Password changed successfully" });
});

// Customer register
router.post("/customer/register", async (req, res) => {
  const { name, phone, password, referralCode } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Name, phone, and password required" });
  }
  const [existing] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  if (existing) {
    return res.status(400).json({ error: "Phone number already registered" });
  }

  let referredById: number | null = null;
  if (referralCode) {
    const [referrer] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.referralCode, referralCode)).limit(1);
    if (referrer) referredById = referrer.id;
  }

  let myCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const [check] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.referralCode, myCode)).limit(1);
    if (!check) break;
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
  }).returning({
    id: customersTable.id,
    name: customersTable.name,
    phone: customersTable.phone,
    referralCode: customersTable.referralCode,
    referralCredits: customersTable.referralCredits,
  });

  if (referredById) {
    await db.execute(`UPDATE customers SET referral_credits = referral_credits + 50 WHERE id = ${referredById}`);
  }

  const token = Buffer.from(`customer:${customer.id}:${Date.now()}`).toString("base64");
  return res.json({ token, id: customer.id, name: customer.name, phone: customer.phone, referralCode: customer.referralCode, referralCredits: Number(customer.referralCredits), role: "customer" });
});

// Customer login
router.post("/customer/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Phone and password required" });
  }
  const [customer] = await db.select(customerCols).from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
  if (!customer || customer.password !== password) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }
  const token = Buffer.from(`customer:${customer.id}:${Date.now()}`).toString("base64");
  return res.json({ token, id: customer.id, name: customer.name, phone: customer.phone, referralCode: customer.referralCode, referralCredits: Number(customer.referralCredits), role: "customer" });
});

export default router;
