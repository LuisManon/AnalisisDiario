import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJointPortfolio, jointObjective, JOINT_MAX_ATTEMPTS } from "../lib/kino-experiment-joint.ts";
import { buildV2Portfolio } from "../lib/kino-experiment-v2.ts";
import { portfolioCoverageBounds } from "../lib/kino-math.ts";
import { validateExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";

function exposure(tickets: number[][]) {
  const counts = Array<number>(85).fill(0);
  tickets.flat().forEach(n => counts[n]++);
  return counts;
}

test("joint optimization strictly lowers S2 and preserves validity and exact exposures across three seeds", () => {
  for (let i = 0; i < 3; i++) {
    const seed = `joint-invariants:${i}`;
    const baseline = buildV2Portfolio("balanced-diverse", seed);
    const result = buildJointPortfolio(seed);
    validateExperimentPortfolio(result);
    assert.equal(result.length, 200);
    assert.equal(new Set(result.map(ticket => ticket.join(","))).size, 200);
    assert.deepEqual(exposure(result), exposure(baseline));
    for (const ticket of result) assert.deepEqual(ticket, [...ticket].sort((a, b) => a - b));
    assert.ok(jointObjective(result) < jointObjective(baseline));
    const expected = portfolioCoverageBounds({ universe: 84, drawSize: 20, ticketSize: 10, threshold: 7 }, result);
    assert.ok(Math.abs(jointObjective(result) - expected.pairIntersectionSum) < 1e-14);
  }
});

test("joint optimization is reproducible, seed sensitive and has an exact zero-budget baseline", () => {
  const first = buildJointPortfolio("joint-reproduce");
  assert.deepEqual(first, buildJointPortfolio("joint-reproduce"));
  assert.notDeepEqual(first, buildJointPortfolio("joint-other"));
  assert.deepEqual(buildJointPortfolio("joint-zero", 0), buildV2Portfolio("balanced-diverse", "joint-zero"));
});

test("joint optimizer rejects unsafe search budgets and invalid objective tickets", () => {
  for (const attempts of [-1, 0.5, NaN, Infinity, JOINT_MAX_ATTEMPTS + 1]) {
    assert.throws(() => buildJointPortfolio("invalid", attempts), /attempts/);
  }
  assert.throws(() => jointObjective([[1, 2]]), /Invalid/);
  assert.throws(() => jointObjective([[1, 2, 3, 4, 5, 6, 7, 8, 9, 85]]), /Invalid/);
  assert.throws(() => jointObjective([[1, 2, 3, 4, 5, 6, 7, 8, 9, 9]]), /Invalid/);
  assert.equal(jointObjective([]), 0);
});
