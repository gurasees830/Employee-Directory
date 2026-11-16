const express = require("express");
const db = require("../db");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const role = (body.role || "").trim();

  if (!name || !email || !role) return { error: "Name, email and role are required" };
  if (!EMAIL_REGEX.test(email)) return { error: "Please enter a valid email" };
  if (name.length > 100 || role.length > 100) return { error: "Name or role is too long" };

  return { data: { name, email, role } };
}


router.get("/", async (req, res, next) => {
  try {
    const search = (req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 50);
    const offset = (page - 1) * limit;

    const where = search ? "WHERE name LIKE ?" : "";
    const params = search ? [`%${search}%`] : [];

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM employees ${where}`,
      params
    );
    const [rows] = await db.query(
      `SELECT id, name, email, role, created_at FROM employees ${where}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      employees: rows,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  const { error, data } = validate(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db.query(
      "INSERT INTO employees (name, email, role) VALUES (?, ?, ?)",
      [data.name, data.email, data.role]
    );
    const [[employee]] = await db.query("SELECT * FROM employees WHERE id = ?", [result.insertId]);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  const { error, data } = validate(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db.query(
      "UPDATE employees SET name = ?, email = ?, role = ? WHERE id = ?",
      [data.name, data.email, data.role, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const [[employee]] = await db.query("SELECT * FROM employees WHERE id = ?", [req.params.id]);
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [result] = await db.query("DELETE FROM employees WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json({ message: "Employee deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
