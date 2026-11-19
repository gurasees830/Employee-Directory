export interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string;
  level: string;
  tenureYears: number; // years at Ágaetis, derived from the joining date
  employmentType: string;
  status: string;
  joiningDate: string; // YYYY-MM-DD
  managerId: number | null;
  managerName: string | null;
  reportCount: number;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonSummary {
  id: number;
  name: string;
  role: string;
  status?: string;
}

export interface EmployeeDetail extends Employee {
  directReports: PersonSummary[];
}

export interface EmployeeInput {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  level: string;
  employmentType: string;
  status: string;
  joiningDate: string;
  managerId: number | null;
  skills: string[];
}

export type FieldErrors = Partial<Record<keyof EmployeeInput, string>>;

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FacetOption {
  value: string;
  count: number;
}

export interface Person {
  id: number;
  name: string;
  role: string;
  department: string;
  status: string;
  managerId: number | null;
  reportCount: number;
}

export interface Facets {
  departments: FacetOption[];
  levels: FacetOption[];
  employmentTypes: FacetOption[];
  statuses: FacetOption[];
  roles: FacetOption[];
  skills: FacetOption[];
  tenure: { max: number };
  people: Person[];
}

export interface Stats {
  total: number;
  active: number;
  onLeave: number;
  avgTenure: number;
  newHires: number;
  departments: number;
  byDepartment: FacetOption[];
  byLevel: FacetOption[];
}

export type SortKey = "name" | "role" | "department" | "level" | "joiningDate" | "createdAt";
export type SortOrder = "asc" | "desc";
export type Tab = "list" | "directory" | "org";
export type Screen = "employees" | "dashboard";

export interface Filters {
  search: string;
  department: string[];
  level: string[];
  role: string[];
  employmentType: string[];
  status: string[];
  skill: string[];
  skillsMatch: "any" | "all";
  minYears: number | null; // years at Ágaetis
  maxYears: number | null;
  joinedFrom: string;
  joinedTo: string;
  managerId: number | null;
  isManager: "" | "yes" | "no";
}

export interface QueryState {
  filters: Filters;
  sortBy: SortKey;
  sortOrder: SortOrder;
  page: number;
  limit: number;
  tab: Tab;
  screen: Screen;
}
