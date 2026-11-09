import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExperimentPortfolio, validateExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";
import { buildV2Portfolio, diversityPenalty, v2Modes } from "../lib/kino-experiment-v2.ts";

const quotas = (tickets: number[][]) => {
  const counts = Array<number>(85).fill(0);
  tickets.flat().forEach(number => counts[number]++);
  return counts;
};

test("v2 declares fixed offline modes and rejects unknown strategies", () => {
  assert.deepEqual(v2Modes, ["uniform", "balanced", "balanced-diverse", "v133-production"]);
  assert.throws(() => buildV2Portfolio("unknown", "seed"), /desconocida/);
  for (const mode of ["uniform", "balanced"]) {
    assert.deepEqual(buildV2Portfolio(mode, "wrapper"), buildExperimentPortfolio(mode, "wrapper"));
  }
});

test("diversification preserves exact quotas, uniqueness and improves frozen objective across seeds", () => {
  for (let seed = 0; seed < 5; seed++) {
    const label = `v2-quota:${seed}`;
    const baseline = buildExperimentPortfolio("balanced", label);
    const result = buildV2Portfolio("balanced-diverse", label);
    validateExperimentPortfolio(result);
    assert.deepEqual(quotas(result), quotas(baseline));
    assert.equal(quotas(result).filter(count => count === 24).length, 68);
    assert.equal(quotas(result).filter(count => count === 23).length, 16);
    assert.ok(diversityPenalty(result) < diversityPenalty(baseline));
    result.forEach(ticket => assert.deepEqual(ticket, [...ticket].sort((a, b) => a - b)));
  }
});

test("diversification is deterministic and seed-sensitive with no winning-outcome input", () => {
  const first = buildV2Portfolio("balanced-diverse", "no-outcome-required");
  assert.deepEqual(first, buildV2Portfolio("balanced-diverse", "no-outcome-required"));
  assert.notDeepEqual(first, buildV2Portfolio("balanced-diverse", "another-seed"));
  assert.equal(buildV2Portfolio.length, 2);
});

test("objective counts repeated number-pairs and separately penalizes high ticket overlap", () => {
  assert.equal(diversityPenalty([[1, 2, 3], [1, 2, 4]]), 1);
  assert.equal(diversityPenalty([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]]), 110);
});
