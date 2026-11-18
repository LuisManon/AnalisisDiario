import assert from "node:assert/strict";
import { test } from "node:test";
import { exactOverlap, priorModel, randomStream, sampleBalls, selectPool, policies, simulateBowl, walkForward } from "../lib/kino-bowl-lab.ts";

test("hypergeometric distribution agrees with complete enumeration of a small bowl", () => {
  const counts = [0, 0, 0];
  for (let a = 1; a <= 5; a++) for (let b = a + 1; b <= 5; b++) counts[Number(a <= 2) + Number(b <= 2)]++;
  const exact = exactOverlap(5, 2, 2);
  exact.forEach((p, k) => assert.ok(Math.abs(p - counts[k] / 10) < 1e-12));
  assert.ok(Math.abs(exactOverlap().slice(10).reduce((s, p) => s + p, 0) - 0.003094267264797114) < 1e-14);
});
test("selectors and bowl never repeat balls and honor the range concentration", () => {
  const model = priorModel([], "2026-11-14");
  for (const policy of policies) {
    const selection = selectPool(policy, randomStream(policy), model);
    assert.equal(selection.length, 20); assert.equal(new Set(selection).size, 20);
    assert.ok(selection.every(n => n >= 1 && n <= 84));
    if (policy === "range10") assert.deepEqual([0, 1, 2].map(r => selection.filter(n => Math.floor((n - 1) / 28) === r).length), [10, 5, 5]);
  }
  assert.throws(() => sampleBalls(randomStream("bad"), [1, 0], 2));
  assert.throws(() => sampleBalls(randomStream("bad"), [1, 1], 3));
});
test("weighted extraction reflects remaining weights, not independent replacement", () => {
  const rng = randomStream("weighted-small-bowl"), counts = [0, 0, 0];
  for (let i = 0; i < 30000; i++) for (const n of sampleBalls(rng, [2, 1, 1], 2)) counts[n - 1]++;
  // Ball 1 absent probability = (1/4)(1/3) twice = 1/6.
  assert.ok(Math.abs(counts[0] / 30000 - 5 / 6) < 0.015);
});
test("target and future results cannot influence historical selection; draws remain untouched", () => {
  const history = Array.from({ length: 32 }, (_, i) => ({ date: new Date(Date.UTC(2026, 9, i + 1)).toISOString().slice(0, 10), numbers: Array.from({ length: 20 }, (_, k) => k + 1) }));
  const before = JSON.stringify(history), target = history[30].date;
  const a = priorModel(history, target);
  const changed = history.map(d => d.date >= target ? { ...d, numbers: Array.from({ length: 20 }, (_, i) => i + 60) } : d);
  assert.deepEqual(priorModel(changed, target), a);
  assert.equal(a.priorCount, 30);
  const rows = walkForward(history, "test", 3);
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.priorLastDate! < r.date));
  assert.equal(JSON.stringify(history), before);
});
test("seeded millions-scale runner primitives reproduce and match exact null distribution", () => {
  const model = priorModel([], "2026-11-14");
  assert.deepEqual(simulateBowl(20, "same", model), simulateBowl(20, "same", model));
  const result = simulateBowl(20000, "null-check", model);
  for (const policy of policies) {
    const stats = result.policies[policy];
    assert.equal(stats.draws, 20000);
    assert.ok(Math.abs(stats.mean - 400 / 84) < 0.08);
    assert.ok(Math.abs(stats.rate10 - 0.003094267264797114) < 0.002);
  }
  assert.throws(() => simulateBowl(0, "bad", model));
});
