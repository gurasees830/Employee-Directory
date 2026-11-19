import {
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  LEVELS,
  MAX_TENURE_YEARS,
  PAGE_SIZES,
  STATUSES,
} from "../constants";
import type { Filters, Person, QueryState, SortKey } from "../types";
import { formatDate, formatYears } from "./format";

export const DEFAULT_FILTERS: Filters = {
  search: "",
  department: [],
  level: [],
  role: [],
  employmentType: [],
  status: [],
  skill: [],
  skillsMatch: "any",
  minYears: null,
  maxYears: null,
  joinedFrom: "",
  joinedTo: "",
  managerId: null,
  isManager: "",
};

export const DEFAULT_QUERY: QueryState = {
  filters: DEFAULT_FILTERS,
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: PAGE_SIZES[0],
  tab: "directory",
  screen: "employees",
};

const LIST_KEYS = [
  "department",
  "level",
  "role",
  "employmentType",
  "status",
  "skill",
] as const;
type ListKey = (typeof LIST_KEYS)[number];

const LIST_LABELS: Record<ListKey, string> = {
  department: "Department",
  level: "Level",
  role: "Role",
  employmentType: "Type",
  status: "Status",
  skill: "Skill",
};

/** Restricts URL values for fixed-choice fields to known options. */
const ALLOWED: Partial<Record<ListKey, string[]>> = {
  department: DEPARTMENTS,
  level: LEVELS,
  employmentType: EMPLOYMENT_TYPES,
  status: STATUSES,
};

const SORT_KEYS: SortKey[] = ["name", "role", "department", "level", "joiningDate", "createdAt"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Serialises filters as repeated params (?department=A&department=B), the format the API expects. */
export function filtersToParams(f: Filters, params = new URLSearchParams()): URLSearchParams {
  if (f.search.trim()) params.set("search", f.search.trim());
  for (const key of LIST_KEYS) for (const value of f[key]) params.append(key, value);
  if (f.skill.length > 0 && f.skillsMatch === "all") params.set("skillsMatch", "all");
  if (f.minYears !== null) params.set("minYears", String(f.minYears));
  if (f.maxYears !== null) params.set("maxYears", String(f.maxYears));
  if (f.joinedFrom) params.set("joinedFrom", f.joinedFrom);
  if (f.joinedTo) params.set("joinedTo", f.joinedTo);
  if (f.managerId !== null) params.set("managerId", String(f.managerId));
  if (f.isManager) params.set("isManager", f.isManager);
  return params;
}

/** Params for GET /employees — always explicit about sort and paging. */
export function toApiParams(q: QueryState): URLSearchParams {
  const params = filtersToParams(q.filters);
  params.set("sortBy", q.sortBy);
  params.set("sortOrder", q.sortOrder);
  params.set("page", String(q.page));
  params.set("limit", String(q.limit));
  return params;
}

/** Params for the browser URL — only what differs from the defaults, so links stay short. */
export function toUrlParams(q: QueryState): URLSearchParams {
  const params = filtersToParams(q.filters);
  if (q.sortBy !== DEFAULT_QUERY.sortBy || q.sortOrder !== DEFAULT_QUERY.sortOrder) {
    params.set("sortBy", q.sortBy);
    params.set("sortOrder", q.sortOrder);
  }
  if (q.page !== 1) params.set("page", String(q.page));
  if (q.limit !== DEFAULT_QUERY.limit) params.set("limit", String(q.limit));
  if (q.tab !== DEFAULT_QUERY.tab) params.set("tab", q.tab);
  if (q.screen !== DEFAULT_QUERY.screen) params.set("screen", q.screen);
  return params;
}

function readNumber(params: URLSearchParams, key: string, min: number, max: number): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Reads state from a URL query string, ignoring anything malformed. */
export function parseQuery(search: string): QueryState {
  const params = new URLSearchParams(search);

  const list = (key: ListKey) => {
    const allowed = ALLOWED[key];
    const values = params
      .getAll(key)
      .map((v) => v.trim())
      .filter((v) => v && (!allowed || allowed.includes(v)));
    return [...new Set(values)];
  };

  const date = (key: string) => {
    const v = params.get(key) ?? "";
    return DATE_RE.test(v) ? v : "";
  };

  const managerId = readNumber(params, "managerId", 1, Number.MAX_SAFE_INTEGER);
  const isManager = params.get("isManager");
  const sortBy = params.get("sortBy") as SortKey | null;
  const limit = Number(params.get("limit"));
  const tab = params.get("tab");

  return {
    filters: {
      search: (params.get("search") ?? "").slice(0, 100),
      department: list("department"),
      level: list("level"),
      role: list("role"),
      employmentType: list("employmentType"),
      status: list("status"),
      skill: list("skill"),
      skillsMatch: params.get("skillsMatch") === "all" ? "all" : "any",
      minYears: readNumber(params, "minYears", 0, MAX_TENURE_YEARS),
      maxYears: readNumber(params, "maxYears", 0, MAX_TENURE_YEARS),
      joinedFrom: date("joinedFrom"),
      joinedTo: date("joinedTo"),
      managerId: managerId !== null && Number.isInteger(managerId) ? managerId : null,
      isManager: isManager === "yes" || isManager === "no" ? isManager : "",
    },
    sortBy: sortBy && SORT_KEYS.includes(sortBy) ? sortBy : DEFAULT_QUERY.sortBy,
    sortOrder: params.get("sortOrder") === "asc" ? "asc" : params.get("sortOrder") === "desc" ? "desc" : DEFAULT_QUERY.sortOrder,
    page: Math.max(Math.floor(Number(params.get("page"))) || 1, 1),
    limit: PAGE_SIZES.includes(limit) ? limit : DEFAULT_QUERY.limit,
    tab: tab === "list" || tab === "org" ? tab : "directory",
    screen: params.get("screen") === "dashboard" ? "dashboard" : "employees",
  };
}

/** Number of filter groups in use (search excluded — it has its own box). */
export function countActiveFilters(f: Filters): number {
  let n = LIST_KEYS.filter((key) => f[key].length > 0).length;
  if (f.minYears !== null || f.maxYears !== null) n++;
  if (f.joinedFrom || f.joinedTo) n++;
  if (f.managerId !== null) n++;
  if (f.isManager) n++;
  return n;
}

export function hasAnyFilter(f: Filters): boolean {
  return countActiveFilters(f) > 0 || f.search.trim() !== "";
}

export function yearsLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return min === max ? formatYears(min) : `${min}–${max} yrs`;
  if (min !== null) return `${min}+ yrs`;
  if (max !== null) return `Up to ${formatYears(max)}`;
  return "Any";
}

export interface FilterChip {
  id: string;
  label: string;
  remove: (f: Filters) => Filters;
}

/** One removable chip per active filter value, in the order the panel shows them. */
export function getFilterChips(f: Filters, people: Person[]): FilterChip[] {
  const chips: FilterChip[] = [];

  if (f.search.trim()) {
    chips.push({ id: "search", label: `Search: “${f.search.trim()}”`, remove: (x) => ({ ...x, search: "" }) });
  }

  for (const key of LIST_KEYS) {
    for (const value of f[key]) {
      const extra = key === "skill" && f.skillsMatch === "all" && f.skill.length > 1 ? " (all)" : "";
      chips.push({
        id: `${key}:${value}`,
        label: `${LIST_LABELS[key]}: ${value}${extra}`,
        remove: (x) => ({ ...x, [key]: x[key].filter((v) => v !== value) }),
      });
    }
  }

  if (f.minYears !== null || f.maxYears !== null) {
    chips.push({
      id: "years",
      label: `At Ágaetis: ${yearsLabel(f.minYears, f.maxYears)}`,
      remove: (x) => ({ ...x, minYears: null, maxYears: null }),
    });
  }

  if (f.joinedFrom || f.joinedTo) {
    const label =
      f.joinedFrom && f.joinedTo
        ? `${formatDate(f.joinedFrom)} – ${formatDate(f.joinedTo)}`
        : f.joinedFrom
          ? `after ${formatDate(f.joinedFrom)}`
          : `before ${formatDate(f.joinedTo)}`;
    chips.push({ id: "joined", label: `Joined: ${label}`, remove: (x) => ({ ...x, joinedFrom: "", joinedTo: "" }) });
  }

  if (f.managerId !== null) {
    const manager = people.find((p) => p.id === f.managerId);
    chips.push({
      id: "manager",
      label: `Reports to: ${manager ? manager.name : `#${f.managerId}`}`,
      remove: (x) => ({ ...x, managerId: null }),
    });
  }

  if (f.isManager) {
    chips.push({
      id: "isManager",
      label: f.isManager === "yes" ? "People managers" : "Individual contributors",
      remove: (x) => ({ ...x, isManager: "" }),
    });
  }

  return chips;
}
