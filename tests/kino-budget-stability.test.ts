import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeStability, type StabilityRow } from "../lib/kino-budget-stability.ts";
const rows: StabilityRow[] = ["2026-11-02", "2026-11-04", "2026-11-06"].flatMap((date, i) => [20, 50, 100].map(budget => ({ date, seed: 0, budget, randomRate: 0.1, coverageRate: 0.1 + i * 0.001 })));
test("cluster inference counts snapshot dates, not seeds, as independent units", () => {
  const a = summarizeStability(rows, "fixed", 200), repeated = rows.flatMap(r => [r, { ...r, seed: 1 }, { ...r, seed: 2 }]);
  const b = summarizeStability(repeated, "fixed", 200);
  a.forEach((r, i) => {
    assert.equal(r.snapshots, 3); assert.equal(b[i].snapshots, 3); assert.equal(b[i].subsetReplicates, 9);
    assert.ok(Math.abs(r.difference - b[i].difference) < 1e-14);
    assert.ok(r.adjustedClusterInterval.every((p, k) => Math.abs(p - b[i].adjustedClusterInterval[k]) < 1e-14));
  });
});
test("equal designs yield zero differences and never pass the gate; reproduction is stable", () => {
  const equal = rows.map(r => ({ ...r, coverageRate: r.randomRate }));
  const results = summarizeStability(equal, "fixed", 200);
  assert.deepEqual(results, summarizeStability(equal, "fixed", 200));
  results.forEach(r => { assert.equal(r.difference, 0); assert.deepEqual(r.adjustedClusterInterval, [0, 0]); assert.equal(r.passesExploratoryGate, false); assert.equal(r.comparisons, 3); });
});
test("invalid, duplicated and incomplete designs are rejected", () => {
  assert.throws(() => summarizeStability([...rows, rows[0]], "bad"));
  assert.throws(() => summarizeStability(rows.filter(r => !(r.date === "2026-11-02" && r.budget === 20)), "bad"));
  assert.throws(() => summarizeStability([{ ...rows[0], coverageRate: 2 }], "bad"));
});
