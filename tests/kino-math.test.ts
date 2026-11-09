import assert from "node:assert/strict";
import test from "node:test";
import { choose, jointThresholdProbability, portfolioCoverageBounds, thresholdProbability } from "../lib/kino-math.ts";

test("rare probabilities retain significant figures below1e-18", () => {
  const probability = jointThresholdProbability({universe:84,drawSize:20,ticketSize:10,threshold:10},0);
  assert.ok(probability > 0);
  assert.ok(Math.abs(probability / (1 / Number(choose(84,20))) - 1) < 1e-14);
  const huge = thresholdProbability({universe:1200,drawSize:600,ticketSize:1,threshold:1});
  assert.ok(Math.abs(huge - .5) < 1e-14);
});

function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  function visit(start: number, chosen: number[]) {
    if (chosen.length === k) { result.push(chosen); return; }
    for (let i = start; i <= n; i++) visit(i + 1, [...chosen, i]);
  }
  visit(1, []);
  return result;
}

test("exact combinatorics validates arguments and boundary counts", () => {
  assert.equal(choose(84, 20), 10735998891545372445n);
  assert.equal(choose(5, -1), 0n);
  assert.equal(choose(5, 6), 0n);
  assert.throws(() => choose(5.5, 1));
  assert.throws(() => thresholdProbability({ universe: 5, drawSize: 6, ticketSize: 2, threshold: 1 }));
  assert.throws(() => jointThresholdProbability({ universe: 5, drawSize: 2, ticketSize: 3, threshold: 1 }, 0));
});

test("marginal and joint formulas match exhaustive small universes", () => {
  for (let n = 2; n <= 8; n++) for (let d = 0; d <= n; d++) for (let t = 1; t <= Math.min(3, n); t++) {
    const draws = combinations(n, d);
    const a = Array.from({ length: t }, (_, i) => i + 1);
    for (let k = 0; k <= t; k++) {
      const model = { universe: n, drawSize: d, ticketSize: t, threshold: k };
      const hits = (draw: number[], ticket: number[]) => ticket.filter(x => draw.includes(x)).length >= k;
      const marginal = draws.filter(draw => hits(draw, a)).length / draws.length;
      assert.ok(Math.abs(thresholdProbability(model) - marginal) < 1e-14);
      for (let s = Math.max(0, 2 * t - n); s <= t; s++) {
        const b = [...a.slice(0, s), ...Array.from({ length: t - s }, (_, i) => t + i + 1)];
        const joint = draws.filter(draw => hits(draw, a) && hits(draw, b)).length / draws.length;
        assert.ok(Math.abs(jointThresholdProbability(model, s) - joint) < 1e-14);
      }
    }
  }
});

test("portfolio bounds contain exact union including duplicate tickets and empty portfolio", () => {
  const model = { universe: 8, drawSize: 3, ticketSize: 3, threshold: 2 };
  const tickets = [[1, 2, 3], [1, 2, 3], [4, 5, 6]];
  const bounds = portfolioCoverageBounds(model, tickets);
  const draws = combinations(8, 3);
  const union = draws.filter(draw => tickets.some(ticket => ticket.filter(n => draw.includes(n)).length >= 2)).length / draws.length;
  assert.ok(bounds.bonferroniLower <= union + 1e-14);
  assert.ok(bounds.secondMomentLower <= union + 1e-14);
  assert.ok(bounds.unionUpper >= union - 1e-14);
  assert.equal(portfolioCoverageBounds(model, []).secondMomentLower, 0);
  assert.throws(() => portfolioCoverageBounds(model, [[1, 1, 2]]));
});
