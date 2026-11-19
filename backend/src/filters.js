const {
  DEPARTMENTS,
  LEVELS,
  EMPLOYMENT_TYPES,
  STATUSES,
  MAX_PAGE_SIZE,
  MAX_TENURE_YEARS,
} = require("./constants");
const { isValidDate, normalizeSkills, parseId } = require("./validation");

const DEFAULT_PAGE_SIZE = 10;
const MAX_LIST_VALUES = 50;

/** Accepts ?a=x&a=y (array) or ?a=x (string) and returns a clean string array. */
function toList(value) {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const out = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const v = item.trim();
    if (v && !out.includes(v)) out.push(v);
    if (out.length >= MAX_LIST_VALUES) break;
  }
  return out;
}

/** Keeps only values from an allow-list (unknown values are ignored, not errors). */
const allowed = (value, options) => toList(value).filter((v) => options.includes(v));

function toNumber(value, min, max) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
const escapeLike = (value) => value.replace(/[\\%_]/g, "\\$&");

const SORT_COLUMNS = {
  name: "e.name",
  role: "e.role",
  department: "e.department",
  level: `FIELD(e.level, ${LEVELS.map((l) => `'${l}'`).join(", ")})`,
  joiningDate: "e.joining_date",
  createdAt: "e.created_at",
};

function parseFilters(query = {}) {
  // years at Ágaetis, worked out from the joining date
  let minYears = toNumber(first(query.minYears), 0, MAX_TENURE_YEARS);
  let maxYears = toNumber(first(query.maxYears), 0, MAX_TENURE_YEARS);
  if (minYears !== null && maxYears !== null && minYears > maxYears) [minYears, maxYears] = [maxYears, minYears];

  let joinedFrom = String(first(query.joinedFrom) || "");
  let joinedTo = String(first(query.joinedTo) || "");
  if (!isValidDate(joinedFrom)) joinedFrom = "";
  if (!isValidDate(joinedTo)) joinedTo = "";
  if (joinedFrom && joinedTo && joinedFrom > joinedTo) [joinedFrom, joinedTo] = [joinedTo, joinedFrom];

  const isManager = String(first(query.isManager) || "");

  return {
    search: String(first(query.search) || "").trim().slice(0, 100),
    departments: allowed(query.department, DEPARTMENTS),
    levels: allowed(query.level, LEVELS),
    employmentTypes: allowed(query.employmentType, EMPLOYMENT_TYPES),
    statuses: allowed(query.status, STATUSES),
    roles: toList(query.role),
    skills: normalizeSkills(toList(query.skill)),
    skillsMatch: first(query.skillsMatch) === "all" ? "all" : "any",
    minYears,
    maxYears,
    joinedFrom,
    joinedTo,
    managerId: parseId(first(query.managerId)),
    isManager: isManager === "yes" || isManager === "no" ? isManager : "",
  };
}

/** Builds `WHERE ...` (or "") plus its params for the employees table aliased as `e`. */
function buildWhere(f) {
  const clauses = [];
  const params = [];

  if (f.search) {
    const like = `%${escapeLike(f.search)}%`;
    clauses.push(
      `(e.name LIKE ? OR e.email LIKE ? OR e.role LIKE ? OR e.department LIKE ?
        OR EXISTS (SELECT 1 FROM employee_skills es JOIN skills s ON s.id = es.skill_id
                   WHERE es.employee_id = e.id AND s.name LIKE ?))`
    );
    params.push(like, like, like, like, like);
  }

  const inList = (column, values) => {
    if (values.length === 0) return;
    clauses.push(`${column} IN (?)`);
    params.push(values);
  };
  inList("e.department", f.departments);
  inList("e.level", f.levels);
  inList("e.employment_type", f.employmentTypes);
  inList("e.status", f.statuses);
  inList("e.role", f.roles);

  // "at least N years" = joined on or before today minus N years (and vice versa). Comparing
  // the date itself, rather than computing tenure per row, lets MySQL use the index.
  if (f.minYears !== null) {
    clauses.push("e.joining_date <= DATE_SUB(CURDATE(), INTERVAL ? MONTH)");
    params.push(Math.round(f.minYears * 12));
  }
  if (f.maxYears !== null) {
    clauses.push("e.joining_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)");
    params.push(Math.round(f.maxYears * 12));
  }
  if (f.joinedFrom) {
    clauses.push("e.joining_date >= ?");
    params.push(f.joinedFrom);
  }
  if (f.joinedTo) {
    clauses.push("e.joining_date <= ?");
    params.push(f.joinedTo);
  }
  if (f.managerId) {
    clauses.push("e.manager_id = ?");
    params.push(f.managerId);
  }
  if (f.isManager) {
    const exists = "EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.id)";
    clauses.push(f.isManager === "yes" ? exists : `NOT ${exists}`);
  }

  if (f.skills.length > 0) {
    const sub = `SELECT COUNT(DISTINCT s.id) FROM employee_skills es JOIN skills s ON s.id = es.skill_id
                 WHERE es.employee_id = e.id AND s.name IN (?)`;
    if (f.skillsMatch === "all") {
      clauses.push(`(${sub}) = ?`);
      params.push(f.skills, f.skills.length);
    } else {
      clauses.push(`(${sub}) > 0`);
      params.push(f.skills);
    }
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function parseSort(query = {}) {
  const sortBy = Object.hasOwn(SORT_COLUMNS, first(query.sortBy)) ? first(query.sortBy) : "createdAt";
  const sortOrder = first(query.sortOrder) === "asc" ? "asc" : "desc";
  return { sortBy, sortOrder };
}

function buildOrderBy({ sortBy, sortOrder }) {
  const dir = sortOrder === "asc" ? "ASC" : "DESC";
  // id as a tie-breaker keeps pagination stable when sort values repeat
  return `ORDER BY ${SORT_COLUMNS[sortBy]} ${dir}, e.id ${dir}`;
}

function parsePaging(query = {}) {
  const page = Math.max(parseInt(first(query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(first(query.limit), 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = {
  parseFilters,
  buildWhere,
  parseSort,
  buildOrderBy,
  parsePaging,
  escapeLike,
  toList,
  SORT_COLUMNS,
};
