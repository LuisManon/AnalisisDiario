import assert from "node:assert/strict";
import { test } from "node:test";
import { groupQuinielonHistory, HISTORY_PAGE_SIZE } from "../lib/history-pagination.ts";
import type { LaPrimeraDraw } from "../lib/types.ts";

const results: LaPrimeraDraw[] = [
  { date: "2026-11-07", session: "dia", number: 12, verification: "confirmed" },
  { date: "2026-11-08", session: "dia", number: 3, verification: "provisional" },
  { date: "2026-11-07", session: "noche", number: 42 },
  { date: "2026-11-06", session: "noche", number: 3 }
];
test("history groups sessions by date, newest first, without altering records", () => {
  const groups = groupQuinielonHistory(results);
  assert.equal(HISTORY_PAGE_SIZE, 5);
  assert.deepEqual(groups.map(group => group.date), ["2026-11-08", "2026-11-07", "2026-11-06"]);
  assert.equal(groups[1].draws.length, 2);
  assert.equal(groups[0].draws[0], results[1]);
  assert.equal(groups[0].draws[0].verification, "provisional");
});
test("number and session searches retain the companion session on matched dates", () => {
  assert.deepEqual(groupQuinielonHistory(results, "dia", "", "12")[0].draws, [results[0], results[2]]);
  assert.equal(groupQuinielonHistory(results, "noche", "", "12").length, 0);
  assert.equal(groupQuinielonHistory(results, "todos", "2026-11-07").length, 1);
  assert.equal(groupQuinielonHistory(results, "todos", "", "bad").length, 0);
  assert.equal(groupQuinielonHistory([]).length, 0);
});
test("five-date pages never split day and night across pages", () => {
  const draws = Array.from({length: 12}, (_, index): LaPrimeraDraw => ({date: `2026-11-${String(Math.floor(index / 2) + 1).padStart(2,"0")}`, session: index % 2 ? "noche" : "dia", number: index}));
  const groups = groupQuinielonHistory(draws);
  assert.equal(groups.slice(0,HISTORY_PAGE_SIZE).length, 5);
  assert.equal(groups.slice(HISTORY_PAGE_SIZE).length, 1);
  assert.ok(groups.every(group => group.draws.length === 2));
});
