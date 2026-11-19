const express = require("express");
const db = require("../db");
const { validateEmployee, parseId } = require("../validation");
const { parseFilters, buildWhere, parseSort, buildOrderBy, parsePaging } = require("../filters");
const {
  DEPARTMENTS,
  LEVELS,
  EMPLOYMENT_TYPES,
  STATUSES,
} = require("../constants");
const { toCsv } = require("../csv");

const router = express.Router();

const SELECT_EMPLOYEE = `
  SELECT e.id, e.name, e.email, e.phone, e.role, e.department, e.level,
         ROUND(GREATEST(TIMESTAMPDIFF(MONTH, e.joining_date, CURDATE()), 0) / 12, 1) AS tenure_years,
         e.employment_type, e.status, e.joining_date, e.manager_id,
         m.name AS manager_name, e.created_at, e.updated_at,
         (SELECT COUNT(*) FROM employees r WHERE r.manager_id = e.id) AS report_count
  FROM employees e
  LEFT JOIN employees m ON m.id = e.manager_id`;

// DB row (snake_case) -> API shape (camelCase)
const toDto = (row, skills = []) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  department: row.department,
  level: row.level,
  tenureYears: Number(row.tenure_years), // years at Ágaetis, from the joining date
  employmentType: row.employment_type,
  status: row.status,
  joiningDate: row.joining_date,
  managerId: row.manager_id,
  managerName: row.manager_name,
  reportCount: Number(row.report_count),
  skills,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});


async function withSkills(rows, conn = db) {
  if (rows.length === 0) return [];
  const [skillRows] = await conn.query(
    `SELECT es.employee_id, s.name FROM employee_skills es
     JOIN skills s ON s.id = es.skill_id
     WHERE es.employee_id IN (?) ORDER BY s.name`,
    [rows.map((r) => r.id)]
  );
  const byEmployee = new Map();
  for (const { employee_id, name } of skillRows) {
    if (!byEmployee.has(employee_id)) byEmployee.set(employee_id, []);
    byEmployee.get(employee_id).push(name);
  }
  return rows.map((r) => toDto(r, byEmployee.get(r.id) || []));
}

async function findEmployee(id, conn = db) {
  const [rows] = await conn.query(`${SELECT_EMPLOYEE} WHERE e.id = ?`, [id]);
  if (rows.length === 0) return null;
  const [dto] = await withSkills(rows, conn);
  return dto;
}

/** Replaces an employee's skills, creating any skill names that don't exist yet. */
async function setSkills(conn, employeeId, skills) {
  await conn.query("DELETE FROM employee_skills WHERE employee_id = ?", [employeeId]);
  if (skills.length === 0) return;
  await conn.query("INSERT IGNORE INTO skills (name) VALUES ?", [skills.map((s) => [s])]);
  const [rows] = await conn.query("SELECT id FROM skills WHERE name IN (?)", [skills]);
  await conn.query("INSERT IGNORE INTO employee_skills (employee_id, skill_id) VALUES ?", [
    rows.map((r) => [employeeId, r.id]),
  ]);
}

async function checkManager(conn, managerId, employeeId = null) {
  if (managerId === null) return null;
  if (managerId === employeeId) return "An employee can't report to themselves";

  let current = managerId;
  for (let depth = 0; current !== null && depth < 100; depth++) {
    const [[row]] = await conn.query("SELECT manager_id FROM employees WHERE id = ?", [current]);
    if (!row) return depth === 0 ? "Selected manager doesn't exist" : null;
    if (employeeId !== null && row.manager_id === employeeId) {
      return "This would create a reporting loop";
    }
    current = row.manager_id;
  }
  return null;
}

async function withTransaction(work) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const countsIn = (rows, options) => {
  const counts = new Map(rows.map((r) => [r.value, Number(r.count)]));
  return options.map((value) => ({ value, count: counts.get(value) || 0 }));
};

// GET /employees
router.get("/", async (req, res) => {
  const filters = parseFilters(req.query);
  const sort = parseSort(req.query);
  const { page, limit, offset } = parsePaging(req.query);
  const where = buildWhere(filters);

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM employees e ${where.sql}`, where.params);
  const [rows] = await db.query(`${SELECT_EMPLOYEE} ${where.sql} ${buildOrderBy(sort)} LIMIT ? OFFSET ?`, [
    ...where.params,
    limit,
    offset,
  ]);

  res.json({
    employees: await withSkills(rows),
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  });
});

// GET /employees/facets — the options (and counts) shown in the filter panel
router.get("/facets", async (req, res) => {
  const group = (column) =>
    db.query(`SELECT ${column} AS value, COUNT(*) AS count FROM employees GROUP BY ${column}`);

  const [
    [departments],
    [levels],
    [employmentTypes],
    [statuses],
    [roles],
    [skills],
    [[tenure]],
    [people],
  ] = await Promise.all([
    group("department"),
    group("level"),
    group("employment_type"),
    group("status"),
    db.query("SELECT role AS value, COUNT(*) AS count FROM employees GROUP BY role ORDER BY count DESC, role"),
    db.query(
      `SELECT s.name AS value, COUNT(*) AS count FROM employee_skills es
       JOIN skills s ON s.id = es.skill_id GROUP BY s.id, s.name ORDER BY count DESC, s.name`
    ),
    db.query(`SELECT ROUND(MAX(GREATEST(TIMESTAMPDIFF(MONTH, e.joining_date, CURDATE()), 0) / 12), 1) AS max FROM employees e`),
    // lightweight list of everyone: powers the "Reports to" pickers and the org chart
    db.query(
      `SELECT e.id, e.name, e.role, e.department, e.status, e.manager_id AS managerId,
              (SELECT COUNT(*) FROM employees r WHERE r.manager_id = e.id) AS reportCount
       FROM employees e ORDER BY e.name LIMIT 2000`
    ),
  ]);

  const num = (rows) => rows.map((r) => ({ value: r.value, count: Number(r.count) }));

  res.json({
    departments: countsIn(departments, DEPARTMENTS),
    levels: countsIn(levels, LEVELS),
    employmentTypes: countsIn(employmentTypes, EMPLOYMENT_TYPES),
    statuses: countsIn(statuses, STATUSES),
    roles: num(roles),
    skills: num(skills),
    tenure: { max: Number(tenure.max) || 0 },
    people: people.map((p) => ({ ...p, reportCount: Number(p.reportCount) })),
  });
});

// GET /employees/stats — headline numbers for the current filter
router.get("/stats", async (req, res) => {
  const where = buildWhere(parseFilters(req.query));
  const grouped = (column) =>
    db.query(
      `SELECT e.${column} AS value, COUNT(*) AS count FROM employees e ${where.sql}
       GROUP BY e.${column} ORDER BY count DESC, value`,
      where.params
    );

  const [[[summary]], [byDepartment], [byLevel]] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(e.status = 'Active'), 0) AS active,
              COALESCE(SUM(e.status = 'On Leave'), 0) AS onLeave,
              COALESCE(AVG(GREATEST(TIMESTAMPDIFF(MONTH, e.joining_date, CURDATE()), 0) / 12), 0) AS avgTenure,
              COALESCE(SUM(e.joining_date >= CURDATE() - INTERVAL 90 DAY), 0) AS newHires,
              COUNT(DISTINCT e.department) AS departments
       FROM employees e ${where.sql}`,
      where.params
    ),
    grouped("department"),
    grouped("level"),
  ]);

  const num = (rows) => rows.map((r) => ({ value: r.value, count: Number(r.count) }));
  const levelOrder = (a, b) => LEVELS.indexOf(a.value) - LEVELS.indexOf(b.value);

  res.json({
    total: Number(summary.total),
    active: Number(summary.active),
    onLeave: Number(summary.onLeave),
    avgTenure: Math.round(Number(summary.avgTenure) * 10) / 10,
    newHires: Number(summary.newHires),
    departments: Number(summary.departments),
    byDepartment: num(byDepartment),
    byLevel: num(byLevel).sort(levelOrder),
  });
});

// GET /employees/export — CSV of everything matching the current filter
router.get("/export", async (req, res) => {
  const where = buildWhere(parseFilters(req.query));
  const [rows] = await db.query(
    `${SELECT_EMPLOYEE} ${where.sql} ${buildOrderBy(parseSort(req.query))} LIMIT 10000`,
    where.params
  );
  const employees = await withSkills(rows);

  const csv = toCsv(
    [
      "ID", "Name", "Email", "Phone", "Role", "Department", "Level", "Years at Ágaetis",
      "Employment Type", "Status", "Joining Date", "Reports To", "Skills",
    ],
    employees.map((e) => [
      e.id, e.name, e.email, e.phone, e.role, e.department, e.level, e.tenureYears,
      e.employmentType, e.status, e.joiningDate, e.managerName, e.skills.join("; "),
    ])
  );

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="employees-${date}.csv"`);
  res.send("﻿" + csv); // BOM so Excel opens UTF-8 correctly
});

// POST /employees/bulk-delete
router.post("/bulk-delete", async (req, res) => {
  const raw = req.body?.ids;
  const ids = Array.isArray(raw) ? [...new Set(raw.map(parseId))] : [];
  if (ids.length === 0 || ids.length > 100 || ids.includes(null)) {
    return res.status(400).json({ message: "Provide between 1 and 100 valid employee ids" });
  }
  const [result] = await db.query("DELETE FROM employees WHERE id IN (?)", [ids]);
  res.json({ message: `${result.affectedRows} employee(s) deleted`, deleted: result.affectedRows });
});

// GET /employees/:id — full profile incl. manager and direct reports
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid employee id" });

  const employee = await findEmployee(id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const [directReports] = await db.query(
    "SELECT id, name, role, status FROM employees WHERE manager_id = ? ORDER BY name",
    [id]
  );
  res.json({ ...employee, directReports });
});

// POST /employees
router.post("/", async (req, res) => {
  const { errors, data } = validateEmployee(req.body);
  if (errors) return res.status(400).json({ message: "Please fix the highlighted fields", errors });

  const outcome = await withTransaction(async (conn) => {
    const managerError = await checkManager(conn, data.managerId);
    if (managerError) return { managerError };

    const [result] = await conn.query(
      `INSERT INTO employees
         (name, email, phone, role, department, level,
          employment_type, status, joining_date, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name, data.email, data.phone, data.role, data.department, data.level,
        data.employmentType, data.status, data.joiningDate, data.managerId,
      ]
    );
    await setSkills(conn, result.insertId, data.skills);
    return { employee: await findEmployee(result.insertId, conn) };
  });

  if (outcome.managerError) {
    return res.status(400).json({ message: outcome.managerError, errors: { managerId: outcome.managerError } });
  }
  res.status(201).json(outcome.employee);
});

// PUT /employees/:id
router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid employee id" });

  const { errors, data } = validateEmployee(req.body);
  if (errors) return res.status(400).json({ message: "Please fix the highlighted fields", errors });

  const outcome = await withTransaction(async (conn) => {
    const [[exists]] = await conn.query("SELECT id FROM employees WHERE id = ? FOR UPDATE", [id]);
    if (!exists) return { notFound: true };

    const managerError = await checkManager(conn, data.managerId, id);
    if (managerError) return { managerError };

    await conn.query(
      `UPDATE employees SET
         name = ?, email = ?, phone = ?, role = ?, department = ?, level = ?,
         employment_type = ?, status = ?, joining_date = ?, manager_id = ?
       WHERE id = ?`,
      [
        data.name, data.email, data.phone, data.role, data.department, data.level,
        data.employmentType, data.status, data.joiningDate, data.managerId, id,
      ]
    );
    await setSkills(conn, id, data.skills);
    return { employee: await findEmployee(id, conn) };
  });

  if (outcome.notFound) return res.status(404).json({ message: "Employee not found" });
  if (outcome.managerError) {
    return res.status(400).json({ message: outcome.managerError, errors: { managerId: outcome.managerError } });
  }
  res.json(outcome.employee);
});

// DELETE /employees/:id
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid employee id" });

  // Direct reports are kept; their manager is cleared by ON DELETE SET NULL.
  const [result] = await db.query("DELETE FROM employees WHERE id = ?", [id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: "Employee not found" });
  res.json({ message: "Employee deleted" });
});

module.exports = router;
