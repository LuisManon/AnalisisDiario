import assert from "node:assert/strict";
import { test } from "node:test";
import { exactTicketEconomics, portfolioStructure } from "../lib/kino-portfolio-risk.ts";
import { buildExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";
test("exact economics conserve probability and scale linearly with prize and budget", () => {
  const prizes = [{ hits: 10, amount: 100 }, { hits: 0, amount: 5 }];
  const a = exactTicketEconomics(prizes), b = exactTicketEconomics(prizes.map(p => ({ ...p, amount: p.amount * 2 })));
  assert.ok(Math.abs(a.probabilities.reduce((s, p) => s + p, 0) - 1) < 1e-12);
  assert.equal(b.expectedGrossPerTicket, a.expectedGrossPerTicket * 2);
  assert.equal(a.expectedNetPerTicket, a.expectedGrossPerTicket - 25);
  assert.throws(() => exactTicketEconomics([{ hits: 11, amount: 1 }]));
});
test("structural overlap and exposure accounting agree, and bounds remain ordered", () => {
  const tickets = buildExperimentPortfolio("balanced", "risk-test"), original = JSON.stringify(tickets);
  const r = portfolioStructure(tickets);
  assert.equal(r.exposure.reduce((s, n) => s + n, 0), 2000);
  assert.equal(r.exposureMin, 23); assert.equal(r.exposureMax, 24);
  assert.equal(r.overlapHistogram.reduce((s, n) => s + n, 0), 19900);
  assert.equal(r.overlapHistogram.reduce((s, n, k) => s + n * k, 0), r.exposure.reduce((s, n) => s + n * (n - 1) / 2, 0));
  assert.ok(r.sevenBounds.secondMomentLower <= r.sevenBounds.unionUpper);
  assert.equal(JSON.stringify(tickets), original);
});
