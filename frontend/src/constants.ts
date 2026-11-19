import type { SortKey, SortOrder } from "./types";

export const DEPARTMENTS = [
  "Leadership",
  "Engineering",
  "Quality Assurance",
  "DevOps & Infrastructure",
  "Data & Analytics",
  "IT & Security",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Customer Success",
  "Human Resources",
  "Finance",
  "Legal & Admin",
];

export const LEVELS = ["Intern", "Junior", "Mid-Level", "Senior", "Lead", "Manager", "Director", "Executive"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
export const STATUSES = ["Active", "On Leave", "Inactive"];

// Ágaetis was founded on 3 Dec 2018. Experience in this app means time at Ágaetis, worked
// out from the joining date, so nobody can have more than ~8 years.
export const COMPANY_FOUNDED = "2018-12-03";
export const MAX_TENURE_YEARS = 50; // parsing bound only

/** The years slider stops here; the top position means "and above". */
export const TENURE_SLIDER_MAX = 8;

export const TENURE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under 1 yr", min: null, max: 1 },
  { label: "1–3 yrs", min: 1, max: 3 },
  { label: "3–5 yrs", min: 3, max: 5 },
  { label: "5+ yrs", min: 5, max: null },
];

export const SORT_OPTIONS: { label: string; sortBy: SortKey; sortOrder: SortOrder }[] = [
  { label: "Recently added", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Name (A–Z)", sortBy: "name", sortOrder: "asc" },
  { label: "Name (Z–A)", sortBy: "name", sortOrder: "desc" },
  { label: "Longest at Ágaetis", sortBy: "joiningDate", sortOrder: "asc" },
  { label: "Newest joiners", sortBy: "joiningDate", sortOrder: "desc" },
  { label: "Most senior level", sortBy: "level", sortOrder: "desc" },
  { label: "Department", sortBy: "department", sortOrder: "asc" },
];

// multiples of 3 (and 2) so the card grid always fills complete rows
export const PAGE_SIZES = [12, 24, 48];
