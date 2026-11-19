// Creates / upgrades the database and optionally loads the sample company.
//
//   npm run db:setup   create the database from schema.sql, upgrading an older table in place
//   npm run db:seed    db:setup + insert/update the sample employees (matched by email)
//   npm run db:reset   DELETES every employee, then loads a fresh copy of the sample data
//   npm run admin:reset  set the admin password back to ADMIN_PASSWORD from .env
//
// schema.sql is the single source of truth. The only extra work here is for databases
// created by the first version of the app (id, name, email, role, created_at): their
// rows are kept and the newer columns and constraints are added around them.

const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const sampleEmployees = require("./seed-data");
const { validateEmployee } = require("./validation");
const { hashPassword } = require("./auth");
const { COMPANY_FOUNDED } = require("./constants");

const args = new Set(process.argv.slice(2));
const RESET = args.has("--reset");
const SEED = args.has("--seed") || RESET;
const RESET_ADMIN = args.has("--reset-admin");

const DB_NAME = process.env.DB_NAME || "employee_directory";
if (!/^[A-Za-z0-9_]+$/.test(DB_NAME)) {
  console.error(`Invalid DB_NAME "${DB_NAME}" (letters, numbers and underscores only)`);
  process.exit(1);
}

// schema.sql minus its CREATE DATABASE / USE lines, so DB_NAME from .env is respected.
function loadSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  return sql.replace(/^CREATE DATABASE[\s\S]*?;/im, "").replace(/^USE\s+\w+;/im, "");
}

// Columns added after v1, used to upgrade an old table before schema.sql runs.
const V1_COLUMNS = {
  phone: "VARCHAR(20) NULL AFTER email",
  department: "VARCHAR(50) NOT NULL DEFAULT 'Engineering' AFTER role",
  level: "VARCHAR(20) NOT NULL DEFAULT 'Mid-Level' AFTER department",
  employment_type: "VARCHAR(20) NOT NULL DEFAULT 'Full-time' AFTER level",
  status: "VARCHAR(20) NOT NULL DEFAULT 'Active' AFTER employment_type",
  joining_date: "DATE NULL AFTER status", // made NOT NULL after backfilling
  manager_id: "INT NULL AFTER joining_date",
  updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
};

// Indexes and constraints from schema.sql that an upgraded v1 table doesn't have yet.
const V1_CONSTRAINTS = {
  idx_employees_department: "ADD INDEX idx_employees_department (department)",
  idx_employees_level: "ADD INDEX idx_employees_level (level)",
  idx_employees_status: "ADD INDEX idx_employees_status (status)",
  idx_employees_joining_date: "ADD INDEX idx_employees_joining_date (joining_date)",
  fk_employees_manager:
    "ADD CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE SET NULL",
  fk_employees_department:
    "ADD CONSTRAINT fk_employees_department FOREIGN KEY (department) REFERENCES departments (name) ON UPDATE CASCADE",
  chk_employees_email: "ADD CONSTRAINT chk_employees_email CHECK (email LIKE '%_@_%._%')",
  chk_employees_joining_date: `ADD CONSTRAINT chk_employees_joining_date CHECK (joining_date >= '${COMPANY_FOUNDED}')`,
  chk_employees_level:
    "ADD CONSTRAINT chk_employees_level CHECK (level IN ('Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Manager', 'Director', 'Executive'))",
  chk_employees_employment_type:
    "ADD CONSTRAINT chk_employees_employment_type CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship'))",
  chk_employees_status: "ADD CONSTRAINT chk_employees_status CHECK (status IN ('Active', 'On Leave', 'Inactive'))",
};

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [DB_NAME, table]
  );
  return rows.length > 0;
}

async function addMissingColumns(conn) {
  const [cols] = await conn.query(
    "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'",
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.name));

  for (const [column, definition] of Object.entries(V1_COLUMNS)) {
    if (existing.has(column)) continue;
    await conn.query(`ALTER TABLE employees ADD COLUMN ${column} ${definition}`);
    console.log(`  + added column employees.${column}`);
    if (column === "joining_date") {
      await conn.query("UPDATE employees SET joining_date = DATE(created_at) WHERE joining_date IS NULL");
      await conn.query("ALTER TABLE employees MODIFY joining_date DATE NOT NULL");
    }
  }
}

// Columns an earlier build had but the app no longer uses: everyone works from the office
// (no location / work mode), and time at the company is now worked out from the joining
// date instead of being typed in. Their CHECK constraints are dropped first.
const RETIRED = [
  { column: "experience_years", constraint: "chk_employees_experience" },
  { column: "work_mode", constraint: "chk_employees_work_mode" },
  { column: "location", constraint: null },
];

async function dropRetiredColumns(conn) {
  const [cols] = await conn.query(
    "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'",
    [DB_NAME]
  );
  const [checks] = await conn.query(
    "SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'",
    [DB_NAME]
  );
  const existing = new Set(cols.map((c) => c.name));
  const constraints = new Set(checks.map((c) => c.name));

  for (const { column, constraint } of RETIRED) {
    if (constraint && constraints.has(constraint)) await conn.query(`ALTER TABLE employees DROP CHECK ${constraint}`);
    if (!existing.has(column)) continue;
    await conn.query(`ALTER TABLE employees DROP COLUMN ${column}`);
    console.log(`  - removed column employees.${column}`);
  }
}

async function addMissingConstraints(conn) {
  const [indexes] = await conn.query(
    "SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'",
    [DB_NAME]
  );
  const [constraints] = await conn.query(
    "SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees'",
    [DB_NAME]
  );
  const existing = new Set([...indexes, ...constraints].map((r) => r.name));

  for (const [name, clause] of Object.entries(V1_CONSTRAINTS)) {
    if (existing.has(name)) continue;
    if (name === "chk_employees_joining_date") {
      // nobody can have joined before the company existed
      const [r] = await conn.query("UPDATE employees SET joining_date = ? WHERE joining_date < ?", [
        COMPANY_FOUNDED,
        COMPANY_FOUNDED,
      ]);
      if (r.affectedRows) console.log(`  ~ moved ${r.affectedRows} joining date(s) up to the founding date`);
    }
    await conn.query(`ALTER TABLE employees ${clause}`);
    console.log(`  + added ${name}`);
  }
}

async function seed(conn) {
  // Validated with the API's own rules, so the sample data can never be something the app rejects.
  const rows = sampleEmployees.map((emp) => {
    const result = validateEmployee(emp);
    if (result.errors) throw new Error(`Invalid seed row ${emp.email}: ${JSON.stringify(result.errors)}`);
    return { ...result.data, managerEmail: emp.managerEmail };
  });

  await conn.beginTransaction();
  try {
    if (RESET) {
      await conn.query("DELETE FROM employee_skills");
      await conn.query("UPDATE employees SET manager_id = NULL");
      await conn.query("DELETE FROM employees");
      await conn.query("DELETE FROM skills");
      console.log("  - removed all existing employees");
    }

    // 1. people, matched on their unique email
    for (const e of rows) {
      await conn.query(
        `INSERT INTO employees
           (name, email, phone, role, department, level, employment_type, status, joining_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), phone = VALUES(phone), role = VALUES(role),
           department = VALUES(department), level = VALUES(level),
           employment_type = VALUES(employment_type), status = VALUES(status),
           joining_date = VALUES(joining_date)`,
        [e.name, e.email, e.phone, e.role, e.department, e.level, e.employmentType, e.status, e.joiningDate]
      );
    }

    // 2. reporting lines, now that every manager has an id
    const [idRows] = await conn.query("SELECT id, email FROM employees WHERE email IN (?)", [rows.map((r) => r.email)]);
    const idByEmail = new Map(idRows.map((r) => [r.email, r.id]));
    for (const e of rows) {
      const managerId = e.managerEmail ? idByEmail.get(e.managerEmail) : null;
      if (e.managerEmail && !managerId) throw new Error(`Unknown manager ${e.managerEmail} for ${e.email}`);
      await conn.query("UPDATE employees SET manager_id = ? WHERE id = ?", [managerId, idByEmail.get(e.email)]);
    }

    // 3. skills
    const allSkills = [...new Set(rows.flatMap((r) => r.skills))];
    await conn.query("INSERT IGNORE INTO skills (name) VALUES ?", [allSkills.map((s) => [s])]);
    const [skillRows] = await conn.query("SELECT id, name FROM skills WHERE name IN (?)", [allSkills]);
    const skillId = new Map(skillRows.map((s) => [s.name.toLowerCase(), s.id]));
    for (const e of rows) {
      const id = idByEmail.get(e.email);
      await conn.query("DELETE FROM employee_skills WHERE employee_id = ?", [id]);
      if (e.skills.length) {
        await conn.query("INSERT INTO employee_skills (employee_id, skill_id) VALUES ?", [
          e.skills.map((s) => [id, skillId.get(s.toLowerCase())]),
        ]);
      }
    }

    await conn.commit();
    console.log(`  ✓ loaded ${rows.length} sample employees`);
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}

// Makes sure the admin account from .env exists. The password is only (re)written when the
// account is first created, or when --reset-admin is passed.
async function ensureAdmin(conn) {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || "Administrator").trim();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("  ! ADMIN_PASSWORD is not set in .env — using the demo password. Change it before deploying.");
  }

  const [[existing]] = await conn.query("SELECT id FROM admins WHERE email = ?", [email]);
  if (existing && !RESET_ADMIN) return;

  const hash = await hashPassword(password);
  if (existing) {
    await conn.query("UPDATE admins SET password_hash = ?, name = ? WHERE id = ?", [hash, name, existing.id]);
    await conn.query("DELETE FROM admin_sessions WHERE admin_id = ?", [existing.id]); // sign out everywhere
    console.log(`  ✓ reset password for admin ${email}`);
  } else {
    await conn.query("INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)", [name, email, hash]);
    console.log(`  ✓ created admin account ${email}`);
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true, // needed to run schema.sql; the API's pool keeps this off
  });

  try {
    console.log(`Setting up database "${DB_NAME}"...`);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS ${DB_NAME} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    await conn.query(`USE ${DB_NAME}`);

    const upgrading = await tableExists(conn, "employees");
    if (upgrading) {
      await addMissingColumns(conn);
      await dropRetiredColumns(conn);
    }
    await conn.query(loadSchema());
    if (upgrading) await addMissingConstraints(conn);
    console.log("  ✓ schema is up to date");

    await ensureAdmin(conn);
    if (SEED) await seed(conn);

    const [[{ total }]] = await conn.query("SELECT COUNT(*) AS total FROM employees");
    console.log(`Done. ${total} employees in the directory.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Database setup failed:", err.message);
  process.exit(1);
});
