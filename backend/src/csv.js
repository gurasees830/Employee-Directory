// Minimal RFC 4180 CSV writer.

/**
 * Escapes one cell. Values starting with = + - @ (or tab / carriage return) are
 * prefixed with an apostrophe so spreadsheet apps don't execute them as formulas
 * (CSV / formula injection). Plain numbers are left untouched.
 */
function csvCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

module.exports = { csvCell, toCsv };
