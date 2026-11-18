import assert from "node:assert/strict";
import { test } from "node:test";
import { matchKinoNear, auditNearPortfolio } from "../lib/kino-near-matches.ts";

const winners = [3, 5, 6, 13, 23, 30, 34, 36, 43, 48, 49, 50, 54, 57, 58, 63, 65, 79, 81, 84];
test("reproduces saved ticket54: five real hits and four distinct neighbors", () => {
  const ticket = [12, 20, 23, 35, 36, 44, 51, 54, 57, 65], original = JSON.stringify(ticket);
  const r = matchKinoNear(ticket, winners);
  assert.deepEqual(r.exact, [23, 36, 54, 57, 65]); assert.equal(r.nearTotal, 9);
  assert.deepEqual(r.neighbors.map(p => [p.number, p.winner]), [[12, 13], [35, 34], [44, 43], [51, 50]]);
  assert.deepEqual(r.unmatched, [20]); assert.equal(JSON.stringify(ticket), original);
});
test("a winner used for an exact hit cannot also credit its neighbors", () => {
  const w = [50, ...Array.from({ length: 19 }, (_, i) => i + 1)];
  const r = matchKinoNear([49, 50, 51, 60, 62, 64, 66, 68, 70, 72], w);
  assert.equal(r.exactCount, 1); assert.equal(r.neighborCount, 0);
  const sharing = matchKinoNear([49, 51, 60, 62, 64, 66, 68, 70, 72, 74], w);
  assert.equal(sharing.neighborCount, 1); assert.equal(new Set(sharing.neighbors.map(p => p.winner)).size, 1);
});
test("remaining matching maximizes unique neighbors and never wraps84 to1", () => {
  const w = [2, 4, ...Array.from({ length: 18 }, (_, i) => i + 20)];
  const r = matchKinoNear([1, 3, 41, 43, 45, 47, 49, 51, 53, 84], w);
  assert.equal(r.neighborCount, 2); assert.equal(r.nearTotal, 2);
  assert.deepEqual(r, matchKinoNear([...r.exact, ...r.neighbors.map(p => p.number), ...r.unmatched].reverse(), [...w].reverse()));
});
test("ranking separates the nearest ticket from the ticket with most real hits", () => {
  const result = auditNearPortfolio([
    { id: 54, numbers: [12, 20, 23, 35, 36, 44, 51, 54, 57, 65] },
    { id: 151, numbers: [5, 13, 22, 27, 36, 39, 54, 61, 79, 84] }
  ], winners);
  assert.equal(result.bestNear.id, 54); assert.equal(result.maxNear, 9);
  assert.equal(result.maxExact, 6); assert.equal(result.bestExact[0].id, 151);
  assert.equal(result.nearHistogram.reduce((s, n) => s + n, 0), 2);
  assert.throws(() => matchKinoNear(Array(10).fill(1), winners));
});
