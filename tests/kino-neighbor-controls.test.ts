import assert from "node:assert/strict";
import { test } from "node:test";
import { uniformControl200, permutePortfolioLabels, compileNearMaximum, buildNeighborPortfolio } from "../lib/kino-neighbor-controls.ts";
import { auditNearPortfolio } from "../lib/kino-near-matches.ts";
import { sampleBalls, randomStream } from "../lib/kino-bowl-lab.ts";
const tickets = uniformControl200("test-input");
test("optimized maximum agrees with reference matching on shared random draws", () => {
  const compiled = compileNearMaximum(tickets), rng = randomStream("test-draws");
  for (let i = 0; i < 30; i++) {
    const winning = sampleBalls(rng, Array(84).fill(1));
    assert.equal(compiled(winning), auditNearPortfolio(tickets.map((numbers, id) => ({ id, numbers })), winning).maxNear);
  }
});
test("label control preserves pair overlaps and distinct tickets", () => {
  const shuffled = permutePortfolioLabels(tickets, "labels");
  assert.deepEqual(shuffled, permutePortfolioLabels(tickets, "labels"));
  for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) assert.equal(tickets[i].filter(n => tickets[j].includes(n)).length, shuffled[i].filter(n => shuffled[j].includes(n)).length);
});
test("neighbors remain200 distinct tickets, preserve input and have explicit valid±1 origins", () => {
  const before = JSON.stringify(tickets);
  for (const mode of ["half", "all"] as const) {
    const result = buildNeighborPortfolio(tickets, mode, `neighbors-${mode}`);
    assert.equal(result.tickets.length, 200); assert.equal(new Set(result.tickets.map(t => t.join(","))).size, 200);
    assert.equal(result.origins.filter(o => o.kept).length, mode === "half" ? 100 : 0);
    result.origins.forEach((o, i) => {
      if (o.kept) assert.deepEqual(result.tickets[i], tickets[o.sourceIndex]);
      else { assert.equal(o.changes.length, 10); assert.ok(o.changes.every(c => Math.abs(c.from - c.to) === 1 && c.to >= 1 && c.to <= 84)); assert.deepEqual(o.changes.map(c => c.to).sort((a, b) => a - b), result.tickets[i]); }
    });
    assert.deepEqual(result, buildNeighborPortfolio(tickets, mode, `neighbors-${mode}`));
  }
  assert.equal(JSON.stringify(tickets), before);
});
