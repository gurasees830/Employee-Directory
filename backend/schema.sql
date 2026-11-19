-- Employee Directory — database schema (MySQL 8.0.16+)
--
-- Run it directly:   mysql -u root -p < backend/schema.sql
-- or let Node do it: npm run db:setup   (also upgrades a database created by an older version)
-- Sample data:       npm run db:seed    (an ~80 person software company)
--
-- Every statement is idempotent, so running this file twice is safe.

CREATE DATABASE IF NOT EXISTS employee_directory
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE employee_directory;

-- Lookup table: departments are business data that grows over time, so they live in a
-- table (with a foreign key) instead of a hard-coded list. Renaming one cascades.
CREATE TABLE IF NOT EXISTS departments (
  name       VARCHAR(50) PRIMARY KEY,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO departments (name) VALUES
  ('Leadership'), ('Engineering'), ('Quality Assurance'), ('DevOps & Infrastructure'),
  ('Data & Analytics'), ('IT & Security'), ('Product'), ('Design'), ('Sales'),
  ('Marketing'), ('Customer Success'), ('Human Resources'), ('Finance'), ('Legal & Admin');

CREATE TABLE IF NOT EXISTS employees (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL,
  phone            VARCHAR(20)  NULL,
  role             VARCHAR(100) NOT NULL,
  department       VARCHAR(50)  NOT NULL DEFAULT 'Engineering',
  level            VARCHAR(20)  NOT NULL DEFAULT 'Mid-Level',
  employment_type  VARCHAR(20)  NOT NULL DEFAULT 'Full-time',
  status           VARCHAR(20)  NOT NULL DEFAULT 'Active',
  joining_date     DATE         NOT NULL,
  manager_id       INT          NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_employees_email UNIQUE (email),

  -- indexes for the filters and sorts the API supports
  INDEX idx_employees_name (name),
  INDEX idx_employees_department (department),
  INDEX idx_employees_level (level),
  INDEX idx_employees_status (status),
  INDEX idx_employees_joining_date (joining_date),

  -- self-reference: who this person reports to. Deleting a manager keeps their reports.
  CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id)
    REFERENCES employees (id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_department FOREIGN KEY (department)
    REFERENCES departments (name) ON UPDATE CASCADE,

  -- the database guards its own data, even if something bypasses the API
  CONSTRAINT chk_employees_email CHECK (email LIKE '%_@_%._%'),
  -- Ágaetis was founded on 3 Dec 2018; time at the company is worked out from this date
  CONSTRAINT chk_employees_joining_date CHECK (joining_date >= '2018-12-03'),
  CONSTRAINT chk_employees_level CHECK (level IN
    ('Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Manager', 'Director', 'Executive')),
  CONSTRAINT chk_employees_employment_type CHECK (employment_type IN
    ('Full-time', 'Part-time', 'Contract', 'Internship')),
  CONSTRAINT chk_employees_status CHECK (status IN ('Active', 'On Leave', 'Inactive'))
);

-- Skills are many-to-many: one employee has many skills, one skill belongs to many people.
CREATE TABLE IF NOT EXISTS skills (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  CONSTRAINT uq_skills_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS employee_skills (
  employee_id INT NOT NULL,
  skill_id    INT NOT NULL,
  PRIMARY KEY (employee_id, skill_id),
  INDEX idx_employee_skills_skill (skill_id),
  CONSTRAINT fk_employee_skills_employee FOREIGN KEY (employee_id)
    REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_skills_skill FOREIGN KEY (skill_id)
    REFERENCES skills (id) ON DELETE CASCADE
);

-- A readable, flattened view for browsing the data in MySQL Workbench / the mysql CLI:
--   SELECT * FROM v_employee_directory WHERE department = 'Engineering';
CREATE OR REPLACE VIEW v_employee_directory AS
SELECT
  e.id,
  e.name,
  e.email,
  e.phone,
  e.role,
  e.department,
  e.level,
  ROUND(GREATEST(TIMESTAMPDIFF(MONTH, e.joining_date, CURDATE()), 0) / 12, 1) AS years_at_agaetis,
  e.employment_type,
  e.status,
  e.joining_date,
  m.name AS reports_to,
  (SELECT COUNT(*) FROM employees r WHERE r.manager_id = e.id) AS direct_reports,
  (SELECT GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ')
     FROM employee_skills es JOIN skills s ON s.id = es.skill_id
    WHERE es.employee_id = e.id) AS skills,
  e.created_at
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;

-- Admin sign-in. Only admins can use the app; there is no public sign-up.
-- Passwords are stored as scrypt hashes, never as plain text.
CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  last_login_at TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_admins_email UNIQUE (email)
);

-- One row per signed-in browser. Only a SHA-256 hash of the session token is stored, so
-- someone reading the database can't reuse a session. Signing out deletes the row.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64)  PRIMARY KEY,
  admin_id   INT       NOT NULL,
  expires_at DATETIME  NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id)
    REFERENCES admins (id) ON DELETE CASCADE
);
