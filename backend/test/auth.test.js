const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword, hashToken, parseCookies, sessionCookie, DUMMY_HASH } = require("../src/auth");

test("passwords are salted scrypt hashes and verify correctly", async () => {
  const a = await hashPassword("Correct horse 1!");
  const b = await hashPassword("Correct horse 1!");
  assert.match(a, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.notEqual(a, b, "same password, different salt");
  assert.equal(await verifyPassword("Correct horse 1!", a), true);
  assert.equal(await verifyPassword("correct horse 1!", a), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
  assert.equal(await verifyPassword("anything", DUMMY_HASH), false);
});

test("only a hash of the session token is stored", () => {
  assert.match(hashToken("abc"), /^[0-9a-f]{64}$/);
  assert.equal(hashToken("abc"), hashToken("abc"));
  assert.notEqual(hashToken("abc"), "abc");
});

test("cookies are parsed and the session cookie is locked down", () => {
  assert.deepEqual(parseCookies("a=1; agaetis_session=x%2Fy; bad; =z"), { a: "1", agaetis_session: "x/y" });
  const cookie = sessionCookie("tok", 3600);
  for (const part of ["HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=3600"]) assert.ok(cookie.includes(part), part);
});
