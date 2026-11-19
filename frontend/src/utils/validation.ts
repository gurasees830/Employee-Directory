// Client-side mirror of backend/src/validation.js. The server is still the source of
// truth (it re-validates everything), this just gives instant feedback while typing.
import { COMPANY_FOUNDED, DEPARTMENTS, EMPLOYMENT_TYPES, LEVELS, STATUSES } from "../constants";
import type { EmployeeInput, FieldErrors } from "../types";

export const MAX_SKILLS = 15;
export const MAX_SKILL_LENGTH = 40;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^\p{L}[\p{L}\p{M}\s.'-]*$/u;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const REQUIRED_FIELDS: (keyof EmployeeInput)[] = [
  "name",
  "email",
  "role",
  "department",
  "level",
  "employmentType",
  "status",
  "joiningDate",
];

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function oneYearFromToday(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Validates one field. `form` is passed for cross-field rules. Returns a message or "". */
export function validateField(field: keyof EmployeeInput, form: EmployeeInput, selfId?: number): string {
  switch (field) {
    case "name": {
      const v = form.name.trim().replace(/\s+/g, " ");
      if (!v) return "Name is required";
      if (v.length < 2) return "Name must be at least 2 characters";
      if (v.length > 100) return "Name must be 100 characters or fewer";
      if (!NAME_RE.test(v)) return "Use letters, spaces, dots, apostrophes and hyphens only";
      return "";
    }
    case "email": {
      const v = form.email.trim();
      if (!v) return "Email is required";
      if (v.length > 150) return "Email must be 150 characters or fewer";
      if (!EMAIL_RE.test(v)) return "Enter a valid email, e.g. name@company.com";
      return "";
    }
    case "phone": {
      const v = form.phone.trim();
      if (!v) return "";
      const digits = v.replace(/\D/g, "").length;
      if (!PHONE_RE.test(v) || digits < 7 || digits > 15) return "Enter 7–15 digits, optionally starting with +";
      return "";
    }
    case "role": {
      const v = form.role.trim();
      if (!v) return "Role is required";
      if (v.length < 2) return "Role must be at least 2 characters";
      if (v.length > 100) return "Role must be 100 characters or fewer";
      return "";
    }
    case "department":
      return DEPARTMENTS.includes(form.department) ? "" : "Choose a department";
    case "level":
      return LEVELS.includes(form.level) ? "" : "Choose a seniority level";
    case "employmentType":
      return EMPLOYMENT_TYPES.includes(form.employmentType) ? "" : "Choose an employment type";
    case "status":
      return STATUSES.includes(form.status) ? "" : "Choose a status";
    case "joiningDate": {
      const v = form.joiningDate;
      if (!v) return "Joining date is required";
      if (!isRealDate(v)) return "Enter a valid date";
      if (v < COMPANY_FOUNDED) return "Can't be before Ágaetis was founded (3 Dec 2018)";
      if (v > oneYearFromToday()) return "Can't be more than a year from today";
      return "";
    }
    case "managerId":
      if (form.managerId !== null && selfId !== undefined && form.managerId === selfId) {
        return "An employee can't report to themselves";
      }
      return "";
    case "skills":
      if (form.skills.length > MAX_SKILLS) return `Add at most ${MAX_SKILLS} skills`;
      if (form.skills.some((s) => s.length > MAX_SKILL_LENGTH)) {
        return `Each skill must be ${MAX_SKILL_LENGTH} characters or fewer`;
      }
      return "";
    default:
      return "";
  }
}

export const FIELD_ORDER: (keyof EmployeeInput)[] = [
  "name",
  "email",
  "phone",
  "role",
  "department",
  "level",
  "managerId",
  "employmentType",
  "status",
  "joiningDate",
  "skills",
];

export function validateEmployee(form: EmployeeInput, selfId?: number): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, form, selfId);
    if (message) errors[field] = message;
  }
  return errors;
}
