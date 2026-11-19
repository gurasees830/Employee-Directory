const {
  DEPARTMENTS,
  LEVELS,
  EMPLOYMENT_TYPES,
  STATUSES,
  COMPANY_FOUNDED,
  MAX_SKILLS,
} = require("./constants");

// Keep these in sync with frontend/src/utils/validation.ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^\p{L}[\p{L}\p{M}\s.'-]*$/u; // letters (any language), spaces, . ' -
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const str = (value) => (typeof value === "string" ? value.trim() : "");

/** Returns true for a real calendar date in YYYY-MM-DD form (rejects 2024-02-30). */
function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

/** Trims, drops blanks and removes case-insensitive duplicates, keeping the first spelling. */
function normalizeSkills(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const skills = [];
  for (const item of raw) {
    const skill = str(item).replace(/\s+/g, " ");
    const key = skill.toLowerCase();
    if (!skill || seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
  }
  return skills;
}

/**
 * Validates an employee payload.
 * @returns {{ errors: Record<string,string> } | { data: object }}
 */
function validateEmployee(body = {}) {
  const errors = {};

  const name = str(body.name).replace(/\s+/g, " ");
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone);
  const role = str(body.role);
  // Per the assignment spec, only name, email and role are required by the API.
  // Everything else is optional here and falls back to the same defaults the
  // database columns use. (The UI form asks for more — see frontend validation.)
  const department = str(body.department) || "Engineering";
  const level = str(body.level) || "Mid-Level";
  const employmentType = str(body.employmentType) || "Full-time";
  const status = str(body.status) || "Active";
  const joiningDate = str(body.joiningDate) || toDateString(new Date());
  const skills = normalizeSkills(body.skills);

  if (!name) errors.name = "Name is required";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters";
  else if (name.length > 100) errors.name = "Name must be 100 characters or fewer";
  else if (!NAME_REGEX.test(name)) errors.name = "Name can only contain letters, spaces, dots, apostrophes and hyphens";

  if (!email) errors.email = "Email is required";
  else if (email.length > 150) errors.email = "Email must be 150 characters or fewer";
  else if (!EMAIL_REGEX.test(email)) errors.email = "Please enter a valid email";

  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (!PHONE_REGEX.test(phone) || digits < 7 || digits > 15) {
      errors.phone = "Enter a valid phone number (7–15 digits, optional +country code)";
    }
  }

  if (!role) errors.role = "Role is required";
  else if (role.length < 2) errors.role = "Role must be at least 2 characters";
  else if (role.length > 100) errors.role = "Role must be 100 characters or fewer";

  if (!DEPARTMENTS.includes(department)) errors.department = "Please choose a valid department";
  if (!LEVELS.includes(level)) errors.level = "Please choose a valid level";
  if (!EMPLOYMENT_TYPES.includes(employmentType)) errors.employmentType = "Invalid employment type";
  if (!STATUSES.includes(status)) errors.status = "Invalid status";

  if (!isValidDate(joiningDate)) {
    errors.joiningDate = "Please enter a valid date";
  } else {
    const latest = new Date();
    latest.setUTCFullYear(latest.getUTCFullYear() + 1);
    if (joiningDate < COMPANY_FOUNDED) {
      errors.joiningDate = "Joining date can't be before Ágaetis was founded (3 Dec 2018)";
    } else if (joiningDate > toDateString(latest)) {
      errors.joiningDate = "Joining date can't be more than a year from now";
    }
  }

  let managerId = null;
  if (body.managerId !== undefined && body.managerId !== null && body.managerId !== "") {
    managerId = Number(body.managerId);
    if (!Number.isInteger(managerId) || managerId <= 0) errors.managerId = "Invalid manager";
  }

  if (body.skills !== undefined && !Array.isArray(body.skills)) {
    errors.skills = "Skills must be a list";
  } else if (skills.length > MAX_SKILLS) {
    errors.skills = `Add at most ${MAX_SKILLS} skills`;
  } else if (skills.some((s) => s.length > 40)) {
    errors.skills = "Each skill must be 40 characters or fewer";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      name,
      email,
      phone: phone || null,
      role,
      department,
      level,
      employmentType,
      status,
      joiningDate,
      managerId,
      skills,
    },
  };
}


function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validateEmployee, normalizeSkills, isValidDate, parseId };
