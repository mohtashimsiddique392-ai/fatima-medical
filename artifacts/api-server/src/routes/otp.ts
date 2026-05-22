import { Router } from "express";
import { verifyFirebaseIdToken } from "../lib/firebase-admin";

const router = Router();

interface AbuseRecord {
  invalidAttempts: number;
  lastAttemptDay: string;
  lockedUntil: number | null;
  lastSentAt: number;
}

const abuseStore: Record<string, AbuseRecord> = {};

const MAX_INVALID_PER_DAY = 5;
const LOCKOUT_MS = 24 * 60 * 60 * 1000;
const MIN_RESEND_INTERVAL_MS = 30 * 1000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizePhone(phone: string): string {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function getOrInit(phone: string): AbuseRecord {
  const today = todayKey();
  let rec = abuseStore[phone];
  if (!rec) {
    rec = { invalidAttempts: 0, lastAttemptDay: today, lockedUntil: null, lastSentAt: 0 };
    abuseStore[phone] = rec;
  }
  if (rec.lastAttemptDay !== today && (!rec.lockedUntil || rec.lockedUntil <= Date.now())) {
    rec.invalidAttempts = 0;
    rec.lastAttemptDay = today;
    rec.lockedUntil = null;
  }
  return rec;
}

// GATE: called BEFORE the client triggers Firebase signInWithPhoneNumber.
// Enforces resend cooldown and the daily lockout.
router.post("/check-allowed", (req, res) => {
  const phone = normalizePhone(req.body?.phone || "");
  if (phone.length !== 10) return res.status(400).json({ error: "Valid 10-digit phone number required" });

  const rec = getOrInit(phone);
  const now = Date.now();

  if (rec.lockedUntil && rec.lockedUntil > now) {
    const hours = Math.ceil((rec.lockedUntil - now) / (60 * 60 * 1000));
    return res.status(429).json({
      error: `Too many invalid OTP attempts today. Resend OTP unavailable for ${hours} hour${hours === 1 ? "" : "s"}.`,
      lockedUntil: rec.lockedUntil,
    });
  }

  if (rec.lastSentAt && now - rec.lastSentAt < MIN_RESEND_INTERVAL_MS) {
    const wait = Math.ceil((MIN_RESEND_INTERVAL_MS - (now - rec.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${wait} seconds before requesting another OTP.` });
  }

  rec.lastSentAt = now;
  return res.json({
    allowed: true,
    phone,
    attemptsLeft: Math.max(0, MAX_INVALID_PER_DAY - rec.invalidAttempts),
  });
});

// Called when Firebase confirmationResult.confirm() fails (wrong OTP).
router.post("/record-failure", (req, res) => {
  const phone = normalizePhone(req.body?.phone || "");
  if (phone.length !== 10) return res.status(400).json({ error: "Valid 10-digit phone number required" });

  const rec = getOrInit(phone);
  const now = Date.now();
  rec.invalidAttempts += 1;
  const remaining = Math.max(0, MAX_INVALID_PER_DAY - rec.invalidAttempts);

  if (rec.invalidAttempts >= MAX_INVALID_PER_DAY) {
    rec.lockedUntil = now + LOCKOUT_MS;
    return res.status(429).json({
      error: "5 invalid OTP attempts reached. Resend OTP is unavailable for 24 hours.",
      lockedUntil: rec.lockedUntil,
      attemptsLeft: 0,
    });
  }

  return res.json({
    error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} left today.`,
    attemptsLeft: remaining,
  });
});

// Verifies a Firebase ID token returned after successful phone OTP verification.
router.post("/verify-token", async (req, res) => {
  const { idToken, phone } = req.body || {};
  if (!idToken) return res.status(400).json({ error: "Firebase ID token is required" });

  try {
    const verified = await verifyFirebaseIdToken(idToken);
    const expectedPhone = normalizePhone(phone || "");
    if (expectedPhone && expectedPhone !== verified.phoneDigits) {
      return res.status(400).json({ error: "Phone number mismatch" });
    }
    // Clear abuse counter on successful verification
    const rec = getOrInit(verified.phoneDigits);
    rec.invalidAttempts = 0;
    rec.lockedUntil = null;
    return res.json({ verified: true, phone: verified.phoneDigits, uid: verified.uid });
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid or expired Firebase token" });
  }
});

router.get("/status", (req, res) => {
  const phone = normalizePhone(String(req.query?.phone || ""));
  if (phone.length !== 10) return res.status(400).json({ error: "Valid 10-digit phone number required" });
  const rec = getOrInit(phone);
  const now = Date.now();
  return res.json({
    phone,
    invalidAttemptsToday: rec.invalidAttempts,
    attemptsLeft: Math.max(0, MAX_INVALID_PER_DAY - rec.invalidAttempts),
    locked: !!(rec.lockedUntil && rec.lockedUntil > now),
    lockedUntil: rec.lockedUntil,
  });
});

export default router;
