import assert from "node:assert/strict";
import { test } from "node:test";
import { buildExperimentPortfolio, experimentModes, validateExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";

test("offline strategies expose the production reference without invoking it", () => {
  assert.deepEqual(experimentModes, ["uniform", "balanced", "v133-production"]);
  assert.throws(() => buildExperimentPortfolio("unknown", "seed"), /desconocida/);
});

for (const mode of ["uniform", "balanced"]) {
  test(`${mode}: deterministic, valid, unique and seed-sensitive portfolios`, () => {
    const first = buildExperimentPortfolio(mode, "2026-09-14:replicate-0");
    validateExperimentPortfolio(first);
    assert.deepEqual(first, buildExperimentPortfolio(mode, "2026-09-14:replicate-0"));
    assert.notDeepEqual(first, buildExperimentPortfolio(mode, "2026-09-14:replicate-1"));
    for (const ticket of first) assert.deepEqual(ticket, [...ticket].sort((a, b) => a - b));
  });
}

test("balanced quotas are exact over many seeds, without using winning outcomes", () => {
  for (let seed = 0; seed < 50; seed++) {
    const tickets = buildExperimentPortfolio("balanced", `quota:${seed}`);
    const counts = Array<number>(85).fill(0);
    tickets.flat().forEach(number => counts[number]++);
    assert.equal(counts.slice(1).filter(count => count === 24).length, 68);
    assert.equal(counts.slice(1).filter(count => count === 23).length, 16);
    assert.equal(counts.reduce((sum, count) => sum + count, 0), 2000);
  }
});

test("validator rejects wrong counts, invalid balls, repeated balls and duplicate tickets", () => {
  const tickets = buildExperimentPortfolio("uniform", "validation");
  assert.throws(() => validateExperimentPortfolio(tickets.slice(1)), /200/);
  for (const invalid of [0, 85, 1.5, Number.NaN, tickets[0]![1]!]) {
    const changed = tickets.map(ticket => [...ticket]);
    changed[0]![0] = invalid;
    assert.throws(() => validateExperimentPortfolio(changed), /10 números únicos/);
  }
  const duplicate = tickets.map(ticket => [...ticket]);
  duplicate[1] = [...duplicate[0]!].reverse();
  assert.throws(() => validateExperimentPortfolio(duplicate), /duplicadas/);
});
