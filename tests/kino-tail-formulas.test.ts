import assert from "node:assert/strict";
import { test } from "node:test";
import { formulaPool, tailFormulas } from "../lib/kino-tail-formulas.ts";
import { exactOverlap, randomStream, sampleBalls } from "../lib/kino-bowl-lab.ts";

const rng = randomStream("tail-test-history");
const history = Array.from({ length: 35 }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 15 + i)).toISOString().slice(0, 10), numbers: sampleBalls(rng, Array(84).fill(1)) }));
test("formulas preserve unique pools, deterministic reproduction and input immutability", () => {
  const original = JSON.stringify(history);
  for (const f of tailFormulas) {
    const result = formulaPool(history, "2026-11-01", f);
    assert.equal(result.pool.length, 20); assert.equal(new Set(result.pool).size, 20);
    assert.ok(result.pool.every(n => n >= 1 && n <= 84));
    assert.deepEqual(result, formulaPool(history, "2026-11-01", f));
  }
  assert.equal(JSON.stringify(history), original);
});
test("neither formula can see the target or later outcomes", () => {
  const target = history[30].date;
  const altered = history.map(d => d.date >= target ? { ...d, numbers: Array.from({ length: 20 }, (_, i) => i + 60) } : d);
  for (const f of tailFormulas) {
    const before = formulaPool(history, target, f);
    assert.deepEqual(before, formulaPool(altered, target, f));
    assert.equal(before.priorCount, 30); assert.ok(before.priorLastDate < target);
    assert.throws(() => formulaPool(history.slice(0, 29), target, f));
  }
});
test("1% target is unattainable by selecting a different fixed pool under the uniform null", () => {
  const exact = exactOverlap().slice(10).reduce((s, n) => s + n, 0);
  assert.ok(exact < 0.01);
  // Changing size would change the experiment, not validate prediction of 20.
  assert.ok(exactOverlap(84, 20, 22).slice(10).reduce((s, n) => s + n, 0) < 0.01);
  assert.ok(exactOverlap(84, 20, 23).slice(10).reduce((s, n) => s + n, 0) > 0.01);
});
