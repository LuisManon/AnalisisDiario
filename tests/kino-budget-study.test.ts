import assert from "node:assert/strict";
import { test } from "node:test";
import { orderBudgetTickets, prepareBudgetEvaluator } from "../lib/kino-budget-study.ts";
import { buildExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";
import { evaluatePortfolio } from "../lib/kino-experiment-metrics.ts";
import { jointObjective } from "../lib/kino-experiment-joint.ts";

const tickets = buildExperimentPortfolio("balanced", "budget-test");
test("subset ordering is a reproducible permutation, immutable and nested", () => {
  const original = JSON.stringify(tickets);
  for (const mode of ["random", "coverage"] as const) {
    const order = orderBudgetTickets(tickets, mode, "fixed");
    assert.equal(new Set(order).size, 200);
    assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: 200 }, (_, i) => i));
    assert.deepEqual(order, orderBudgetTickets(tickets, mode, "fixed"));
  }
  assert.equal(JSON.stringify(tickets), original);
});
test("coverage ordering chooses the lowest added exact pair objective at each step", () => {
  const order = orderBudgetTickets(tickets, "coverage", "objective");
  for (const k of [1, 5, 19]) {
    const prefix = order.slice(0, k).map(i => tickets[i]);
    const actual = jointObjective([...prefix, tickets[order[k]]]);
    for (const i of order.slice(k)) assert.ok(actual <= jointObjective([...prefix, tickets[i]]) + 1e-14);
  }
});
test("budget evaluation agrees with direct ticket counts and full portfolio metrics", () => {
  const winning = Array.from({ length: 20 }, (_, i) => i + 1), prizes = [{ hits: 0, amount: 80 }, { hits: 5, amount: 60 }];
  const evaluate = prepareBudgetEvaluator(tickets, [20, 50, 100, 200], prizes), rows = evaluate(winning);
  for (const row of rows) {
    const hits = tickets.slice(0, row.tickets).map(t => t.filter(n => winning.includes(n)).length);
    assert.equal(row.maxHits, Math.max(...hits));
    assert.equal(row.gross, hits.reduce((s, h) => s + (prizes.find(p => p.hits === h)?.amount ?? 0), 0));
  }
  assert.equal(rows[3].maxHits, evaluatePortfolio(tickets, winning).maxHits);
  assert.ok(rows.every((r, i) => i === 0 || r.maxHits >= rows[i - 1].maxHits));
  assert.throws(() => prepareBudgetEvaluator(tickets, [50, 20], prizes));
  assert.throws(() => evaluate(Array(20).fill(1)));
});
