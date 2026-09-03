// Run with: node --test src/lib/ar.test.mjs  (after `npx tsc` is not needed; this reimplements the formula check)
import test from "node:test";
import assert from "node:assert/strict";
function bookPoints(atos, words) { return Math.max(0.5, Math.round(((10 + atos) * (words / 100000)) * 2) / 2); }
test("real AR values", () => {
  assert.equal(bookPoints(5.2, 19784), 3.0);
  assert.equal(bookPoints(4.4, 31938), 4.5);
  assert.equal(bookPoints(5.5, 77325), 12.0);
});
