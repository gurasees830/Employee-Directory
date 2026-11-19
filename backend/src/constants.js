const DEPARTMENTS = [
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

const LEVELS = ["Intern", "Junior", "Mid-Level", "Senior", "Lead", "Manager", "Director", "Executive"];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

const STATUSES = ["Active", "On Leave", "Inactive"];

// Ágaetis was founded on this date, so nobody can have joined before it. Time at the
// company ("years at Ágaetis") is always worked out from the joining date.
const COMPANY_FOUNDED = "2018-12-03";

const MAX_SKILLS = 15;
const MAX_PAGE_SIZE = 100;
const MAX_TENURE_YEARS = 50; // upper bound when parsing the years-at-Ágaetis filter

module.exports = {
  DEPARTMENTS,
  LEVELS,
  EMPLOYMENT_TYPES,
  STATUSES,
  COMPANY_FOUNDED,
  MAX_SKILLS,
  MAX_PAGE_SIZE,
  MAX_TENURE_YEARS,
};
