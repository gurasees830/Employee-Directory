const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseFilters,
  buildWhere,
  parseSort,
  buildOrderBy,
  parsePaging,
  escapeLike,
} = require("../src/filters");

test("no filters produces no WHERE clause", () => {
  const where = buildWhere(parseFilters({}));
  assert.equal(where.sql, "");
  assert.deepEqual(where.params, []);
});

test("multi-value filters accept repeated params and a single value", () => {
  const f = parseFilters({ department: ["Engineering", "Design"], level: "Senior" });
  assert.deepEqual(f.departments, ["Engineering", "Design"]);
  assert.deepEqual(f.levels, ["Senior"]);

  const where = buildWhere(f);
  assert.match(where.sql, /e\.department IN \(\?\)/);
  assert.match(where.sql, /e\.level IN \(\?\)/);
  assert.deepEqual(where.params, [["Engineering", "Design"], ["Senior"]]);
});

test("unknown enum values are ignored rather than queried", () => {
  const f = parseFilters({ department: ["Engineering", "Hackers"], status: "Bogus" });
  assert.deepEqual(f.departments, ["Engineering"]);
  assert.deepEqual(f.statuses, []);
});

test("years-at-Ágaetis range is parsed, bounded and swapped when reversed", () => {
  assert.deepEqual(
    (({ minYears, maxYears }) => ({ minYears, maxYears }))(parseFilters({ minYears: "6", maxYears: "2" })),
    { minYears: 2, maxYears: 6 }
  );
  const f = parseFilters({ minYears: "-1", maxYears: "abc" });
  assert.equal(f.minYears, null);
  assert.equal(f.maxYears, null);

  // compared against the joining date, in months, so the date index can be used
  const where = buildWhere(parseFilters({ minYears: "1.5", maxYears: "5" }));
  assert.match(where.sql, /e\.joining_date <= DATE_SUB\(CURDATE\(\), INTERVAL \? MONTH\)/);
  assert.match(where.sql, /e\.joining_date >= DATE_SUB\(CURDATE\(\), INTERVAL \? MONTH\)/);
  assert.deepEqual(where.params, [18, 60]);
});

test("invalid dates are dropped, valid ranges kept in order", () => {
  assert.equal(parseFilters({ joinedFrom: "2024-02-30" }).joinedFrom, "");
  const f = parseFilters({ joinedFrom: "2025-01-01", joinedTo: "2023-01-01" });
  assert.equal(f.joinedFrom, "2023-01-01");
  assert.equal(f.joinedTo, "2025-01-01");
});

test("skills match 'any' vs 'all'", () => {
  const any = buildWhere(parseFilters({ skill: ["React", "react", "Node.js"] }));
  assert.match(any.sql, /\) > 0/);
  assert.deepEqual(any.params, [["React", "Node.js"]]); // de-duplicated case-insensitively

  const all = buildWhere(parseFilters({ skill: ["React", "Node.js"], skillsMatch: "all" }));
  assert.match(all.sql, /\) = \?/);
  assert.deepEqual(all.params, [["React", "Node.js"], 2]);
});

test("search escapes LIKE wildcards and searches several columns", () => {
  assert.equal(escapeLike("100%_\\"), "100\\%\\_\\\\");
  const where = buildWhere(parseFilters({ search: "  50% " }));
  assert.equal(where.params.length, 5);
  assert.ok(where.params.every((p) => p === "%50\\%%"));
});

test("people-manager filter", () => {
  assert.match(buildWhere(parseFilters({ isManager: "yes" })).sql, /WHERE EXISTS/);
  assert.match(buildWhere(parseFilters({ isManager: "no" })).sql, /WHERE NOT EXISTS/);
  assert.equal(buildWhere(parseFilters({ isManager: "maybe" })).sql, "");
});

test("sorting only allows whitelisted columns", () => {
  assert.deepEqual(parseSort({ sortBy: "name", sortOrder: "asc" }), { sortBy: "name", sortOrder: "asc" });
  assert.deepEqual(parseSort({ sortBy: "id; DROP TABLE employees" }), { sortBy: "createdAt", sortOrder: "desc" });
  assert.deepEqual(parseSort({ sortBy: "__proto__" }), { sortBy: "createdAt", sortOrder: "desc" });
  assert.equal(buildOrderBy({ sortBy: "joiningDate", sortOrder: "asc" }), "ORDER BY e.joining_date ASC, e.id ASC");
  assert.deepEqual(parseSort({ sortBy: "experience" }), { sortBy: "createdAt", sortOrder: "desc" }); // retired key
  assert.match(buildOrderBy({ sortBy: "level", sortOrder: "desc" }), /^ORDER BY FIELD\(e\.level, 'Intern'/);
});

test("paging is clamped to sane bounds", () => {
  assert.deepEqual(parsePaging({}), { page: 1, limit: 10, offset: 0 });
  assert.deepEqual(parsePaging({ page: "3", limit: "20" }), { page: 3, limit: 20, offset: 40 });
  assert.deepEqual(parsePaging({ page: "-5", limit: "5000" }), { page: 1, limit: 100, offset: 0 });
});
