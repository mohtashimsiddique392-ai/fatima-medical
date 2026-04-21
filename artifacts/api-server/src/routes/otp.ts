import { Router } from "express";

const router = Router();

interface OtpRecord {
  otp: string;
  expiresAt: number;
  invalidAttempts: number;
  lastAttemptDay: string;
  lockedUntil: number | null;
  resendCount: number;
  lastSentAt: number;
}

const otpStore: Record<string, OtpRecord> = {};

const OTP_VALIDITY_MS = 5 * 60 * 1000;
const MAX_INVALID_PER_DAY = 5;
const LOCKOUT_MS = 24 * 60 * 60 * 1000;
const MIN_RESEND_INTERVAL_MS = 30 * 1000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function getOrInit(phone: string): OtpRecord {
  const key = normalizePhone(phone);
  const today = todayKey();
  let rec = otpStore[key];
  if (!rec) {
    rec = {
      otp: "",
      expiresAt: 0,
      invalidAttempts: 0,
      lastAttemptDay: today,
      lockedUntil: null,
      resendCount: 0,
      lastSentAt: 0,
    };
    otpStore[key] = rec;
  }
  if (rec.lastAttemptDay !== today && (!rec.lockedUntil || rec.lockedUntil <= Date.now())) {
    rec.invalidAttempts = 0;
    rec.resendCount = 0;
    rec.lastAttemptDay = today;
    rec.lockedUntil = null;
  }
  return rec;
}

router.post("/send", (req, res) => {
  const phone = normalizePhone(req.body?.phone || "");
  if (phone.length !== 10) return res.status(400).json({ error: "Valid 10-digit phone number required" });

  const rec = getOrInit(phone);
  const now = Date.now();

  if (rec.lockedUntil && rec.lockedUntil > now) {
    const hours = Math.ceil((rec.lockedUntil - now) / (60 * 60 * 1000));
    return res.status(429).json({
      error: `Too many invalid OTP attempts. Resend OTP unavailable. Try again in ${hours} hour${hours === 1 ? "" : "s"}.`,
      lockedUntil: rec.lockedUntil,
    });
  }

  if (rec.lastSentAt && now - rec.lastSentAt < MIN_RESEND_INTERVAL_MS) {
    const wait = Math.ceil((MIN_RESEND_INTERVAL_MS - (now - rec.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${wait} seconds before requesting another OTP.` });
  }

  const otp = generateOtp();
  rec.otp = otp;
  rec.expiresAt = now + OTP_VALIDITY_MS;
  rec.lastSentAt = now;
  rec.resendCount += 1;

  // In production: send via SMS gateway. For demo we return it.
  return res.json({
    message: `OTP sent to +91 ${phone}. Valid for 5 minutes.`,
    phone,
    expiresInSeconds: OTP_VALIDITY_MS / 1000,
    demoOtp: otp,
  });
});

router.post("/verify", (req, res) => {
  const phone = normalizePhone(req.body?.phone || "");
  const otp = String(req.body?.otp || "").trim();
  if (phone.length !== 10) return res.status(400).json({ error: "Valid 10-digit phone number required" });
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ error: "OTP must be a 6-digit number" });

  const rec = getOrInit(phone);
  const now = Date.now();

  if (rec.lockedUntil && rec.lockedUntil > now) {
    const hours = Math.ceil((rec.lockedUntil - now) / (60 * 60 * 1000));
    return res.status(429).json({
      error: `Too many invalid OTP attempts. Try again in ${hours} hour${hours === 1 ? "" : "s"}.`,
      lockedUntil: rec.lockedUntil,
    });
  }

  if (!rec.otp || !rec.expiresAt) {
    return res.status(400).json({ error: "No OTP requested for this number. Please send OTP first." });
  }

  if (rec.expiresAt < now) {
    rec.otp = "";
    rec.expiresAt = 0;
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  if (rec.otp !== otp) {
    rec.invalidAttempts += 1;
    const remaining = Math.max(0, MAX_INVALID_PER_DAY - rec.invalidAttempts);
    if (rec.invalidAttempts >= MAX_INVALID_PER_DAY) {
      rec.lockedUntil = now + LOCKOUT_MS;
      rec.otp = "";
      rec.expiresAt = 0;
      return res.status(429).json({
        error: "5 invalid OTP attempts reached. Resend OTP is unavailable for 24 hours.",
        lockedUntil: rec.lockedUntil,
      });
    }
    return res.status(400).json({
      error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} left today.`,
      attemptsLeft: remaining,
    });
  }

  rec.otp = "";
  rec.expiresAt = 0;
  rec.invalidAttempts = 0;
  return res.json({ verified: true, phone, message: "OTP verified successfully." });
});

router.get("/status", (req, res) => {
  const phone = normalizePhone(String(req.query?.phone || ""));
  if (phone.length !== 10) return res.status(400).json({ error: "Valid 10-digit phone number required" });
  const rec = getOrInit(phone);
  const now = Date.now();
  res.json({
    phone,
    hasActiveOtp: !!(rec.otp && rec.expiresAt > now),
    expiresAt: rec.expiresAt || null,
    invalidAttemptsToday: rec.invalidAttempts,
    attemptsLeft: Math.max(0, MAX_INVALID_PER_DAY - rec.invalidAttempts),
    locked: !!(rec.lockedUntil && rec.lockedUntil > now),
    lockedUntil: rec.lockedUntil,
  });
});

export default router;
