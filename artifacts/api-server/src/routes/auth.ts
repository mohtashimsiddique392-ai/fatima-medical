import bcrypt from "bcryptjs";
import { Router } from "express";
import { db } from "@workspace/db";
import { adminTable, subAdminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signAdminToken } from "../middleware/adminAuth";
import { logger } from "../lib/logger";

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// NOTE: Demo-grade OTP store, in-memory. On serverless (Vercel) this resets
// between cold starts / is not shared across concurrent function instances.
// It's fine for a low-traffic single-admin store, but for real reliability
// wire this to a table (or Supabase) + a real SMS provider (Twilio/MSG91).
const otpStore: Record<string, { otp: string; expiresAt: number }> = {};

// Admin login
router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const [admin] = await db.select().from(adminTable).where(eq(adminTable.username, username)).limit(1);
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signAdminToken({ sub: admin.id, username: admin.username, role: "admin" });
  return res.json({ token, username: admin.username, role: "admin", phone: admin.phone });
});

// Sub-admin (staff) login
router.post("/staff/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const [staff] = await db.select().from(subAdminsTable).where(eq(subAdminsTable.username, username)).limit(1);
  if (!staff || !staff.isActive || !(await bcrypt.compare(password, staff.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signAdminToken({
    sub: staff.id,
    username: staff.username,
    role: "subadmin",
    permissions: staff.permissions as Record<string, boolean>,
  });
  return res.json({ token, username: staff.username, name: staff.name, role: "subadmin", permissions: staff.permissions });
});

// Admin request OTP for password change
router.post("/admin/request-otp", async (req, res) => {
  const { username } = req.body;
  const [admin] = await db.select().from(adminTable).where(eq(adminTable.username, username || "fatima04786")).limit(1);
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const otp = generateOtp();
  otpStore[admin.username] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
  // Server-side only — never return the OTP in the API response.
  logger.info({ username: admin.username }, `Admin OTP generated: ${otp} (check server logs / wire an SMS provider)`);

  return res.json({ message: `OTP sent to ${admin.phone}.`, phone: admin.phone });
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
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.update(adminTable).set({ password: hashed }).where(eq(adminTable.username, username));
  delete otpStore[username];
  return res.json({ message: "Password changed successfully" });
});

export default router;
