import assert from "node:assert/strict";
import {test} from "node:test";
import {evaluatePortfolio, pairedDifference, preparePortfolioEvaluator, summarizeEvaluations} from "../lib/kino-experiment-metrics.ts";

const winning = Array.from({length: 20}, (_, i) => i + 1);
const ticketWithHits = (hits: number) => [...winning.slice(0, hits), ...Array.from({length: 10 - hits}, (_, i) => i + 21)];
function* combinations(values: number[], count: number, start = 0, prefix: number[] = []): Generator<number[]> {
  if (prefix.length === count) { yield prefix; return; }
  for (let i = start; i <= values.length - (count - prefix.length); i++) yield* combinations(values, count, i + 1, [...prefix, values[i]]);
}
const portfolio = (hits: number) => {
  const tickets: number[][] = [];
  for (const wins of combinations(winning, hits)) {
    for (const misses of combinations(Array.from({length: 64}, (_, i) => i + 21), 10 - hits)) {
      tickets.push([...wins, ...misses]);
      if (tickets.length === 200) return tickets;
    }
  }
  throw new Error("Insufficient combinations");
};

test("metrics count 200 tickets but threshold success once per draw/portfolio", () => {
  const tickets = portfolio(2);
  tickets[0] = ticketWithHits(8);
  const row = evaluatePortfolio(tickets, winning);
  assert.equal(row.meanHits, 406 / 200);
  assert.equal(row.maxHits, 8);
  assert.equal(row.histogram[2], 199);
  assert.equal(row.histogram[8], 1);
  assert.equal(row.histogram.reduce((a, b) => a + b), 200);
  const summary = summarizeEvaluations([row, evaluatePortfolio(portfolio(2), winning)]);
  assert.equal(summary.draws, 2);
  assert.equal(summary.atLeast6Rate, 0.5);
  assert.equal(summary.atLeast7Rate, 0.5);
  assert.equal(summary.atLeast8Rate, 0.5);
  assert.equal(summary.meanMax, 5);
  assert.equal(summary.histogram.reduce((a, b) => a + b), 400);
});

test("threshold boundaries and perfect/disjoint tickets", () => {
  for (const hits of [0, 5, 6, 7, 8, 10]) {
    const row = evaluatePortfolio(portfolio(hits), winning);
    assert.equal(row.meanHits, hits);
    assert.equal(row.maxHits, hits);
    assert.equal(row.atLeast6, hits >= 6);
    assert.equal(row.atLeast7, hits >= 7);
    assert.equal(row.atLeast8, hits >= 8);
  }
});

test("prepared evaluation is equivalent and isolated from caller mutations", () => {
  const tickets = portfolio(7);
  const expected = evaluatePortfolio(tickets, winning);
  const evaluate = preparePortfolioEvaluator(tickets);
  tickets[0].fill(84);
  tickets.pop();
  assert.deepEqual(evaluate(winning), expected);
  assert.throws(() => evaluate(winning.slice(1)));
});

test("rejects wrong counts, duplicates, out of universe and fractional values", () => {
  assert.throws(() => evaluatePortfolio(portfolio(2).slice(1), winning));
  const duplicates = portfolio(2);
  duplicates[1] = [...duplicates[0]].reverse();
  assert.throws(() => evaluatePortfolio(duplicates, winning), /duplicate ticket/);
  for (const invalid of [winning.slice(1), [...winning.slice(0, 19), 19], [...winning.slice(0, 19), 85], [...winning.slice(0, 19), 2.5]]) {
    assert.throws(() => evaluatePortfolio(portfolio(2), invalid));
  }
  for (const ticket of [[1, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 2, 3, 4, 5, 6, 7, 8, 9, 10], ticketWithHits(2).slice(1)]) {
    const tickets = portfolio(2);
    tickets[0] = ticket;
    assert.throws(() => evaluatePortfolio(tickets, winning));
  }
  assert.throws(() => summarizeEvaluations([]));
});

test("paired bootstrap is deterministic, uses A minus B and preserves identical-pair uncertainty", () => {
  const a = [6, 7, 8].map(hits => evaluatePortfolio(portfolio(hits), winning));
  const b = [5, 6, 7].map(hits => evaluatePortfolio(portfolio(hits), winning));
  const result = pairedDifference(a, b, "maxHits");
  assert.equal(result.meanDifference, 1);
  assert.deepEqual(result.ci95, [1, 1]);
  assert.equal(result.samples, 3);
  assert.deepEqual(result, pairedDifference(a, b, "maxHits"));
  assert.deepEqual(pairedDifference(a, a, "atLeast7").ci95, [0, 0]);
  assert.equal(pairedDifference(a, b, "atLeast8").meanDifference, 1 / 3);
  assert.throws(() => pairedDifference(a, b.slice(1), "maxHits"));
  assert.throws(() => pairedDifference([], [], "maxHits"));
});
