import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExtendedPortfolio, extendedAttempts } from "../lib/kino-experiment-extended.ts";
import { validateExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";
import { buildV2Portfolio, diversityPenalty } from "../lib/kino-experiment-v2.ts";

function exposure(tickets: number[][]) {
  const counts = Array<number>(85).fill(0);
  tickets.flat().forEach(number => counts[number]++);
  return counts;
}

test("extended search preserves exact exposure and strictly improves the frozen objective across three seeds", () => {
  assert.equal(extendedAttempts, 50_000);
  for (let index = 0; index < 3; index++) {
    const seed = `extended-invariant:${index}`;
    const baseline = buildV2Portfolio("balanced-diverse", seed);
    const result = buildExtendedPortfolio(seed);
    validateExperimentPortfolio(result);
    assert.equal(result.length, 200);
    assert.equal(new Set(result.map(ticket => ticket.join(","))).size, 200);
    assert.deepEqual(exposure(result), exposure(baseline));
    assert.equal(exposure(result).filter(count => count === 24).length, 68);
    assert.equal(exposure(result).filter(count => count === 23).length, 16);
    for (const ticket of result) {
      assert.equal(ticket.length, 10);
      assert.deepEqual(ticket, [...ticket].sort((a, b) => a - b));
    }
    assert.ok(diversityPenalty(result) < diversityPenalty(baseline));
  }
});

test("extended search is deterministic and seed sensitive without any winning-outcome input", () => {
  const first = buildExtendedPortfolio("extended-reproducible");
  assert.deepEqual(first, buildExtendedPortfolio("extended-reproducible"));
  assert.notDeepEqual(first, buildExtendedPortfolio("extended-other"));
  assert.equal(buildExtendedPortfolio.length, 1);
});
