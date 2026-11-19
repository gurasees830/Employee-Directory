const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEmployee, normalizeSkills, isValidDate, parseId } = require("../src/validation");
const { csvCell, toCsv } = require("../src/csv");
const seed = require("../src/seed-data");

const valid = {
  name: "  Asha   Rao ",
  email: "ASHA.RAO@Example.com ",
  role: "Backend Developer",
  department: "Engineering",
  level: "Senior",
  joiningDate: "2023-04-10",
  skills: ["Node.js", " node.js ", "MySQL", ""],
};

test("a valid payload is normalised", () => {
  const { data, errors } = validateEmployee(valid);
  assert.equal(errors, undefined);
  assert.equal(data.name, "Asha Rao");
  assert.equal(data.email, "asha.rao@example.com");
  assert.deepEqual(data.skills, ["Node.js", "MySQL"]);
  // defaults
  assert.equal(data.employmentType, "Full-time");
  assert.equal(data.status, "Active");
  assert.equal(data.managerId, null);
  assert.equal(data.phone, null);
});

test("only name, email and role are required by the API (assignment spec)", () => {
  const { errors } = validateEmployee({});
  assert.deepEqual(Object.keys(errors).sort(), ["email", "name", "role"]);

  const { data } = validateEmployee({ name: "Asha Rao", email: "asha@example.com", role: "Developer" });
  assert.equal(data.department, "Engineering");
  assert.equal(data.level, "Mid-Level");
  assert.match(data.joiningDate, /^\d{4}-\d{2}-\d{2}$/);
});

test("bad values are rejected", () => {
  const { errors } = validateEmployee({
    ...valid,
    email: "not-an-email",
    phone: "abc",
    department: "Hackers",
    joiningDate: "2023-02-30",
    managerId: "x",
    skills: "React",
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    "department", "email", "joiningDate", "managerId", "phone", "skills",
  ]);
});

test("name characters and phone digit count are checked", () => {
  assert.ok(validateEmployee({ ...valid, name: "R2-D2" }).errors.name);
  assert.ok(validateEmployee({ ...valid, name: "<script>" }).errors.name);
  assert.equal(validateEmployee({ ...valid, name: "Anne-Marie O'Neil Jr." }).errors, undefined);
  assert.equal(validateEmployee({ ...valid, name: "José Müller" }).errors, undefined);
  assert.ok(validateEmployee({ ...valid, phone: "+-- ---- ---" }).errors.phone);
  assert.ok(validateEmployee({ ...valid, phone: "1234567890123456" }).errors.phone);
  assert.equal(validateEmployee({ ...valid, phone: "+91 98765 43210" }).errors, undefined);
});

test("joining date can't be before the 2018 founding", () => {
  assert.ok(validateEmployee({ ...valid, joiningDate: "2018-12-02" }).errors.joiningDate);
  assert.equal(validateEmployee({ ...valid, joiningDate: "2018-12-03" }).errors, undefined);
});

test("joining date more than a year ahead is rejected", () => {
  const future = new Date();
  future.setUTCFullYear(future.getUTCFullYear() + 2);
  const { errors } = validateEmployee({ ...valid, joiningDate: future.toISOString().slice(0, 10) });
  assert.ok(errors.joiningDate);
});

test("helpers", () => {
  assert.deepEqual(normalizeSkills(["A", "a", " b ", null]), ["A", "b"]);
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(isValidDate("2023-02-29"), false);
  assert.equal(parseId("12"), 12);
  assert.equal(parseId("1.5"), null);
  assert.equal(parseId("0"), null);
});

test("CSV cells are escaped and protected against formula injection", () => {
  assert.equal(csvCell('He said "hi", ok'), '"He said ""hi"", ok"');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell(-5), "-5");
  assert.equal(csvCell(null), "");
  assert.equal(toCsv(["a", "b"], [[1, "x\ny"]]), 'a,b\r\n1,"x\ny"');
});

test("sample company data is valid and its reporting lines resolve", () => {
  const emails = new Set(seed.map((e) => e.email));
  assert.equal(emails.size, seed.length, "emails must be unique");
  assert.ok(seed.length >= 50 && seed.length <= 100);
  for (const emp of seed) {
    const { errors } = validateEmployee(emp);
    assert.equal(errors, undefined, `${emp.email}: ${JSON.stringify(errors)}`);
    if (emp.managerEmail) assert.ok(emails.has(emp.managerEmail), `${emp.email} has unknown manager`);
  }
  assert.equal(seed.filter((e) => !e.managerEmail).length, 1, "only the Managing Director has no manager");

  // founded Dec 2018: nobody joined earlier, and the average time at the company is about 4 years
  const today = new Date("2026-11-19");
  const years = seed.map((e) => (today - new Date(e.joiningDate)) / (365.25 * 86400000));
  assert.ok(seed.every((e) => e.joiningDate >= "2018-12-03"));
  assert.ok(Math.max(...years) < 8, "longest-serving employee is under 8 years");
  const avg = years.reduce((a, b) => a + b, 0) / years.length;
  assert.ok(avg > 3.8 && avg < 4.3, `average tenure ${avg.toFixed(2)} should be about 4 years`);
});
