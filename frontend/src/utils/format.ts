const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parses YYYY-MM-DD as a local calendar date (new Date("2024-01-05") would be UTC midnight). */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "2023-01-09" -> "09 Jan 2023" */
export function formatDate(value: string): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Today's date as YYYY-MM-DD in the user's timezone. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatYears(years: number): string {
  if (years < 1) return "Under 1 yr";
  return `${years} ${years === 1 ? "yr" : "yrs"}`;
}

/** Time since joining, e.g. "3y 10m", "5m", "New joiner". */
export function tenure(joiningDate: string): string {
  const start = parseLocalDate(joiningDate);
  if (!start) return "";
  const now = new Date();
  if (start > now) return "Joining soon";
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months--;
  if (months < 1) return "New joiner";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y}y` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
}

/** Joined within the last 90 days. */
export function isNewHire(joiningDate: string): boolean {
  const start = parseLocalDate(joiningDate);
  if (!start) return false;
  const days = (Date.now() - start.getTime()) / 86_400_000;
  return days >= 0 && days <= 90;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** A stable hue per name, so the same person always gets the same avatar colour. */
export function avatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
