import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTriplePortfolio, triplePenalty } from "../lib/kino-experiment-triples.ts";
import { buildV2Portfolio, diversityPenalty } from "../lib/kino-experiment-v2.ts";
import { validateExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";

const exposure = (tickets: number[][]) => {
  const counts = Array<number>(85).fill(0);
  tickets.flat().forEach(n => counts[n]++);
  return counts;
};

test("triple penalty counts shared triples exactly", () => {
  assert.equal(triplePenalty([[1, 2, 3], [1, 2, 4]]), 0);
  assert.equal(triplePenalty([[3, 2, 1], [1, 2, 3], [2, 3, 1]]), 3);
  assert.equal(triplePenalty([[1, 2, 3, 4], [4, 3, 2, 1]]), 4);
});

test("triple optimizer preserves V2 exposures, unique sorted tickets and frozen diversity cap", () => {
  for (const seed of ["triple-invariant:0", "triple-invariant:1", "triple-invariant:2"]) {
    const baseline = buildV2Portfolio("balanced-diverse", seed);
    const result = buildTriplePortfolio(seed);
    validateExperimentPortfolio(result);
    assert.deepEqual(exposure(result), exposure(baseline));
    assert.ok(triplePenalty(result) < triplePenalty(baseline));
    assert.ok(diversityPenalty(result) <= diversityPenalty(baseline) * 1.05);
    result.forEach(ticket => assert.deepEqual(ticket, [...ticket].sort((a, b) => a - b)));
  }
});

test("triple optimizer is deterministic, seed sensitive and has no winning-result input", () => {
  const first = buildTriplePortfolio("triple-reproducible");
  assert.deepEqual(first, buildTriplePortfolio("triple-reproducible"));
  assert.notDeepEqual(first, buildTriplePortfolio("triple-other"));
  assert.equal(buildTriplePortfolio.length, 1);
});
