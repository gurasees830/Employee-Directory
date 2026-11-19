const express = require("express");
const db = require("../db");
const {
  COOKIE_NAME,
  DUMMY_HASH,
  verifyPassword,
  hashToken,
  parseCookies,
  sessionCookie,
  createSession,
  requireAdmin,
} = require("../auth");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory brute-force guard: 10 failed sign-ins per IP per 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map();

function tooManyAttempts(ip) {
  const entry = failures.get(ip);
  if (!entry || entry.resetAt < Date.now()) return 0;
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - Date.now()) / 60000) : 0;
}

function recordFailure(ip) {
  // drop expired entries now and then so the map can't grow forever
  if (failures.size > 1000) {
    for (const [key, value] of failures) if (value.resetAt < Date.now()) failures.delete(key);
  }
  const entry = failures.get(ip);
  if (!entry || entry.resetAt < Date.now()) failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else entry.count++;
}

// POST /auth/login
router.post("/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const errors = {};
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(email) || email.length > 150) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  else if (password.length > 200) errors.password = "Password is too long";
  if (Object.keys(errors).length) return res.status(400).json({ message: "Please fix the highlighted fields", errors });

  const waitMinutes = tooManyAttempts(req.ip);
  if (waitMinutes) {
    return res
      .status(429)
      .json({ message: `Too many failed attempts. Try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.` });
  }

  const [[admin]] = await db.query("SELECT id, name, email, password_hash FROM admins WHERE email = ?", [email]);
  const ok = await verifyPassword(password, admin ? admin.password_hash : DUMMY_HASH);
  if (!admin || !ok) {
    recordFailure(req.ip);
    return res.status(401).json({ message: "That email and password don't match an admin account" });
  }

  failures.delete(req.ip);
  await db.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()"); // tidy up old sessions
  await db.query("UPDATE admins SET last_login_at = NOW() WHERE id = ?", [admin.id]);
  const { cookie } = await createSession(admin.id);

  res.setHeader("Set-Cookie", cookie);
  res.json({ admin: { id: admin.id, name: admin.name, email: admin.email } });
});

// POST /auth/logout — ends this browser's session
router.post("/logout", async (req, res) => {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (token) await db.query("DELETE FROM admin_sessions WHERE token_hash = ?", [hashToken(token)]);
  res.setHeader("Set-Cookie", sessionCookie("", 0));
  res.json({ message: "Signed out" });
});

// GET /auth/me — who is signed in (401 if nobody)
router.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
