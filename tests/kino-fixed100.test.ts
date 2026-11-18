import assert from "node:assert/strict";
import { test } from "node:test";
import { balancedFixed100, fixed100Exposure, fixed100Structure, optimizeFixed100, validateFixed100, compileFixed100 } from "../lib/kino-fixed100.ts";

test("fixed100 construction is unique, reproducible and exactly balanced across all84 balls", () => {
  for (const seed of ["A", "B", "C"]) {
    const tickets = balancedFixed100(seed); validateFixed100(tickets);
    const exposure = fixed100Exposure(tickets);
    assert.equal(exposure.reduce((s, n) => s + n, 0), 1000);
    assert.equal(exposure.filter(n => n === 12).length, 76); assert.equal(exposure.filter(n => n === 11).length, 8);
    assert.deepEqual(tickets, balancedFixed100(seed));
  }
});
test("reciprocal optimization preserves exposure and input, with nonincreasing7/8 pair objectives", () => {
  const base = balancedFixed100("optimizer"), original = JSON.stringify(base), before = fixed100Structure(base);
  const result = optimizeFixed100(base, "optimizer", 1500), after = fixed100Structure(result.tickets);
  assert.deepEqual(fixed100Exposure(result.tickets), before.exposure);
  assert.equal(JSON.stringify(base), original); assert.ok(result.accepted > 0);
  assert.ok(after.sevenBounds.pairIntersectionSum <= before.sevenBounds.pairIntersectionSum + 1e-13);
  assert.ok(after.eightBounds.pairIntersectionSum <= before.eightBounds.pairIntersectionSum + 1e-13);
  assert.deepEqual(result, optimizeFixed100(base, "optimizer", 1500));
  assert.throws(() => optimizeFixed100(base, "bad", 100001));
});
test("compiled100 evaluation agrees with brute force and isolates caller mutation", () => {
  const tickets = balancedFixed100("evaluate"), winning = Array.from({ length: 20 }, (_, i) => i + 1), prizes = [{ hits: 0, amount: 80 }, { hits: 5, amount: 60 }];
  const hits = tickets.map(t => t.filter(n => winning.includes(n)).length), compiled = compileFixed100(tickets, prizes);
  const expected = { maxHits: Math.max(...hits), gross: hits.reduce((s, h) => s + (prizes.find(p => p.hits === h)?.amount ?? 0), 0) };
  assert.deepEqual(compiled(winning), expected);
  tickets[0].fill(84); assert.deepEqual(compiled(winning), expected);
  assert.throws(() => compiled(Array(20).fill(1)));
  assert.throws(() => validateFixed100(Array(100).fill(Array.from({ length: 10 }, (_, i) => i + 1))));
});
