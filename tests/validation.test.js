const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidEmail, isValidDate, isValidTime } = require("../lib/validation");

test("validates email addresses", () => {
  assert.equal(isValidEmail("patient@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});
test("validates calendar dates", () => {
  assert.equal(isValidDate("2026-11-10"), true);
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("10-11-2026"), false);
});
test("validates 24-hour times", () => {
  assert.equal(isValidTime("09:30"), true);
  assert.equal(isValidTime("25:70"), false);
});
