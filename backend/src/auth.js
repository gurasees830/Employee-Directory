// Admin authentication helpers. No extra dependencies — everything here is node:crypto.
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const db = require("./db");

const scrypt = promisify(crypto.scrypt);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

const COOKIE_NAME = "agaetis_session";
const SESSION_HOURS = 8;

/** "scrypt$<salt hex>$<hash hex>" — the salt is random per password. */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, SCRYPT_OPTIONS);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// Used when the email doesn't exist, so a wrong email takes as long as a wrong password
// and response times don't reveal which admin emails are real.
const DUMMY_HASH = `scrypt$${"00".repeat(16)}$${"00".repeat(KEY_LENGTH)}`;

/** The browser gets a random token; the database only ever stores its SHA-256. */
const newToken = () => crypto.randomBytes(32).toString("base64url");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // ignore a malformed cookie rather than failing the request
    }
  }
  return cookies;
}

/** httpOnly so page scripts can't read it; SameSite=Strict so other sites can't send it (CSRF). */
function sessionCookie(token, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

async function createSession(adminId) {
  const token = newToken();
  await db.query(
    "INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
    [hashToken(token), adminId, SESSION_HOURS]
  );
  return { token, cookie: sessionCookie(token, SESSION_HOURS * 3600) };
}

async function findSession(token) {
  if (!token) return null;
  const [[admin]] = await db.query(
    `SELECT a.id, a.name, a.email FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  return admin || null;
}

/** Express middleware: lets the request through only with a valid admin session. */
async function requireAdmin(req, res, next) {
  const admin = await findSession(parseCookies(req.headers.cookie)[COOKIE_NAME]);
  if (!admin) return res.status(401).json({ message: "Please sign in to continue" });
  req.admin = admin;
  next();
}

module.exports = {
  COOKIE_NAME,
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
  hashToken,
  parseCookies,
  sessionCookie,
  createSession,
  findSession,
  requireAdmin,
};
