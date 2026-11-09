import assert from "node:assert/strict";
import { test } from "node:test";
import { optimizeDirectCoverage } from "../lib/kino-experiment-direct.ts";
import { buildExperimentPortfolio, validateExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";

const base = buildExperimentPortfolio("balanced", "direct-test-base");
const training = Array.from({ length: 128 }, (_, d) => Array.from({ length: 20 }, (_, n) => (d * 17 + n * 5) % 84 + 1));
const covered = (tickets: number[][], draws: number[][]) => draws.filter(draw =>
  tickets.some(ticket => ticket.filter(number => draw.includes(number)).length >= 7)).length;
const exposure = (tickets: number[][]) => Array.from({ length: 84 }, (_, i) => tickets.flat().filter(n => n === i + 1).length);

test("direct training caches agree with naive coverage and preserve all invariants", () => {
  const original = structuredClone(base);
  const draws = structuredClone(training);
  const result = optimizeDirectCoverage(base, training, "direct-test", 2000);
  assert.equal(result.beforeCovered, covered(base, training));
  assert.equal(result.afterCovered, covered(result.tickets, training));
  assert.ok(result.afterCovered > result.beforeCovered);
  assert.ok(result.accepted > 0);
  assert.ok(result.afterCovered - result.beforeCovered >= result.accepted);
  assert.deepEqual(exposure(result.tickets), exposure(base));
  assert.deepEqual(base, original);
  assert.deepEqual(training, draws);
  validateExperimentPortfolio(result.tickets);
  assert.deepEqual(result, optimizeDirectCoverage(base, training, "direct-test", 2000));
});

test("zero attempts is an unchanged copied portfolio", () => {
  const result = optimizeDirectCoverage(base, training, "zero", 0);
  assert.deepEqual(result.tickets, base);
  assert.notEqual(result.tickets, base);
  assert.equal(result.beforeCovered, result.afterCovered);
  assert.equal(result.accepted, 0);
});

test("invalid portfolios, training and budgets are rejected", () => {
  assert.throws(() => optimizeDirectCoverage(base.slice(1), training, "bad"));
  for (const draws of [[], [[1]], [Array(20).fill(1)], [Array.from({ length: 20 }, (_, n) => n + 70)]]) {
    assert.throws(() => optimizeDirectCoverage(base, draws, "bad"));
  }
  for (const attempts of [-1, 1.5, Infinity, NaN]) assert.throws(() => optimizeDirectCoverage(base, training, "bad", attempts));
});
