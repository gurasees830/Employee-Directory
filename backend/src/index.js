const express = require("express");
const cors = require("cors");
require("dotenv").config({ quiet: true });

const db = require("./db");
const { requireAdmin } = require("./auth");
const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");

const app = express();
const PORT = process.env.PORT || 5000;

// The session cookie needs `credentials: true`, which rules out a wildcard origin.
// Any localhost port is allowed for development; add real domains via CORS_ORIGIN.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.disable("x-powered-by");
app.set("trust proxy", "loopback"); // so req.ip (used by the login rate limit) is the real client
app.use(
  cors({
    origin: (origin, done) => done(null, !origin || LOCALHOST.test(origin) || allowedOrigins.includes(origin)),
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

app.use("/auth", authRoutes);
// everything about employees is admin-only
app.use("/employees", requireAdmin, employeeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must be valid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err.code === "ER_DUP_ENTRY") {
    const message = "An employee with this email already exists";
    return res.status(409).json({ message, errors: { email: message } });
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    const message = "Selected manager no longer exists";
    return res.status(400).json({ message, errors: { managerId: message } });
  }
  if (err.code === "ECONNREFUSED" || err.code === "ER_ACCESS_DENIED_ERROR" || err.code === "ER_BAD_DB_ERROR") {
    console.error("Database error:", err.message);
    return res.status(503).json({ message: "Database is unavailable. Check the backend .env and run npm run db:setup" });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
