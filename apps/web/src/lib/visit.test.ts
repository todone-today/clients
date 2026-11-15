import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanVisit } from "./visit.ts";

test("keeps the launch tag and drops everything else", () => {
  assert.deepEqual(cleanVisit("https://todone.today/?ref=email&x=1#k", null), { url: "https://todone.today/ref/email", ref: "email" });
  assert.equal(cleanVisit("https://todone.today/login?next=/app&email=a@b.c", null).url, "https://todone.today/login");
});

test("remembers the tag for the rest of the visit", () => {
  assert.equal(cleanVisit("https://todone.today/app", "wa").url, "https://todone.today/app/ref/wa");
  assert.equal(cleanVisit("https://todone.today/app?ref=EMAIL", "wa").ref, "email");
});

test("never reports secrets in the path or odd tags", () => {
  assert.equal(cleanVisit("https://todone.today/t/abc123secret#key", null).url, "https://todone.today/t/[id]");
  assert.equal(cleanVisit("https://todone.today/calendar/tok/x", null).url, "https://todone.today/calendar/[id]/x");
  assert.equal(cleanVisit("https://todone.today/invite/xyz", null).url, "https://todone.today/invite/[id]");
  assert.equal(cleanVisit("https://todone.today/app/receipt/r1", null).url, "https://todone.today/app/receipt/[id]");
  assert.equal(cleanVisit("https://todone.today/reset-password?token=s3cret", null).url, "https://todone.today/reset-password");
  assert.equal(cleanVisit("https://todone.today/?ref=a@b.com", null).ref, null);
});
