import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildNeighborSnapshot, evaluateNeighbor, freezeNeighborResult, kinoNeighborSchema, neighborDayState } from "../lib/super-kino-neighbor.ts";
import { kinoSnapshotSchema, type KinoSnapshot, type KinoDraw } from "../lib/super-kino.ts";
import { createKinoNeighborStore } from "../lib/super-kino-neighbor-store.ts";
import { automationPlan, operationReady } from "../lib/automation-schedule.ts";
import { savedStateReady } from "../lib/automation-status.ts";

const sample = JSON.parse(readFileSync(new URL("../data/super-kino-portfolios/2026-11-14.json", import.meta.url), "utf8"));
const source = (date = "2026-11-18"): KinoSnapshot => kinoSnapshotSchema.parse({ ...sample, targetDate: date, generatedAt: `${date}T12:37:00.000Z`, prizeDrawNumbers: undefined, prizeSummary: undefined });
const now = new Date("2026-11-18T13:00:00Z"), after = new Date("2026-11-19T01:17:00Z");
const result: KinoDraw = { date: "2026-11-18", numbers: Array.from({ length: 20 }, (_, i) => i + 1), source: "https://example.test/kino" };
function memory() {
  const files = new Map<string, string>(), writes: string[] = [];
  const store = createKinoNeighborStore({ read: async file => files.get(file) ?? null, write: async (file, content, expected) => { if ((files.get(file) ?? null) !== expected) throw new Error("CAS conflict"); files.set(file, content); writes.push(file); } });
  return { files, writes, store };
}
test("new200 variants are reproducible, distinct, bounded±1 and preserve source ids/inputs", () => {
  const original = source(), before = JSON.stringify(original), s = buildNeighborSnapshot(original, "a".repeat(64), now);
  assert.equal(s.plays.length, 200); assert.equal(new Set(s.plays.map(p => p.numbers.join(","))).size, 200);
  for (const p of s.plays) {
    assert.deepEqual(p.sourceNumbers, original.plays.find(o => o.id === p.id)!.numbers);
    assert.deepEqual(p.sourceNumbers.map((n, i) => n + p.shifts[i]).sort((a, b) => a - b), p.numbers);
    p.sourceNumbers.forEach((n, i) => { if (n === 1) assert.equal(p.shifts[i], 1); if (n === 84) assert.equal(p.shifts[i], -1); });
  }
  assert.deepEqual(s, buildNeighborSnapshot(original, "a".repeat(64), now)); assert.equal(JSON.stringify(original), before);
  assert.throws(() => buildNeighborSnapshot(source("2026-11-17"), "a".repeat(64), new Date("2026-11-17T13:00:00Z")));
  assert.throws(() => buildNeighborSnapshot(original, "a".repeat(64), new Date("2026-11-19T00:55:00Z")));
});
test("frozen awards count exact winners and survive corrections; summaries validate", () => {
  const s = buildNeighborSnapshot(source(), "a".repeat(64), now);
  assert.equal(freezeNeighborResult(s, [result], now), s);
  const frozen = freezeNeighborResult(s, [result], after), expected = evaluateNeighbor(s, result.numbers);
  assert.deepEqual(frozen.prizeSummary, expected.summary); assert.equal(expected.summary.histogram.reduce((s, n) => s + n, 0), 200);
  const first = s.plays[0], exact = first.numbers.filter(n => result.numbers.includes(n)).length;
  assert.equal(expected.plays[0].hits, exact);
  assert.equal(freezeNeighborResult(frozen, [{ ...result, numbers: Array.from({ length: 20 }, (_, i) => i + 30) }], after), frozen);
  assert.equal(kinoNeighborSchema.safeParse({ ...frozen, prizeSummary: { ...frozen.prizeSummary!, total: frozen.prizeSummary!.total + 1 } }).success, false);
});
test("calendar explicitly excludes16/17, begins18, distinguishes missing from pending", () => {
  for (const date of ["2026-11-16", "2026-11-17"]) assert.equal(neighborDayState(date, undefined, now).label, "Sin Resultados Programados");
  const s = buildNeighborSnapshot(source(), "a".repeat(64), now);
  assert.equal(neighborDayState("2026-11-18", undefined, now).kind, "scheduled");
  assert.equal(neighborDayState("2026-11-18", s, now).kind, "pending");
  assert.equal(neighborDayState("2026-11-18", undefined, after).kind, "missing");
  assert.equal(neighborDayState("2026-11-18", freezeNeighborResult(s, [result], after), after).kind, "complete");
});
test("read-only view never writes; reattempts reuse portfolio and preserve closed numbers/prizes", async () => {
  const { store, writes } = memory();
  assert.equal((await store.view("2026-11-18")).current, null); assert.equal(writes.length, 0);
  const first = await store.sync("2026-11-18", source(), [], now), count = writes.length;
  const again = await store.sync("2026-11-18", { ...source(), generatedAt: "2026-11-18T12:38:00.000Z" }, [], new Date("2026-11-18T14:00:00Z"));
  assert.deepEqual(again.current, first.current); assert.equal(writes.length, count);
  const frozen = await store.sync("2026-11-18", source(), [result], after), writesAfter = writes.length;
  const corrected = await store.sync("2026-11-18", source(), [{ ...result, numbers: Array.from({ length: 20 }, (_, i) => i + 30) }], after);
  assert.deepEqual(corrected.current, frozen.current); assert.equal(writes.length, writesAfter);
  assert.deepEqual(frozen.current!.plays, first.current!.plays);
});
test("store never backfills closed windows or pre-start dates", async () => {
  const { store, writes } = memory();
  assert.equal((await store.sync("2026-11-18", source(), [result], after)).current, null);
  assert.equal((await store.sync("2026-11-17", source("2026-11-17"), [], new Date("2026-11-17T13:00:00Z"))).current, null);
  assert.equal(writes.length, 0);
});
test("Sunday cutoff uses Dominican time and still refuses a late variant", () => {
  const original = source("2026-11-22");
  assert.equal(buildNeighborSnapshot(original, "b".repeat(64), new Date("2026-11-22T19:54:00Z")).targetDate, "2026-11-22");
  assert.throws(() => buildNeighborSnapshot(original, "b".repeat(64), new Date("2026-11-22T19:55:00Z")));
});
test("an index failure is visible and retry recovers saved numbers rather than regenerating", async () => {
  const files = new Map<string, string>(); let failIndex = true;
  const store = createKinoNeighborStore({ read: async f => files.get(f) ?? null, write: async (f, content, previous) => {
    if (failIndex && f.endsWith("index.json")) throw new Error("storage unavailable");
    if ((files.get(f) ?? null) !== previous) throw new Error("conflict"); files.set(f, content);
  } });
  await assert.rejects(store.sync("2026-11-18", source(), [], now), /storage unavailable/);
  const file = "data/super-kino-neighbor-portfolios/2026-11-18.json", original = files.get(file)!;
  assert.ok(original); assert.ok((await store.view("2026-11-18")).current);
  failIndex = false;
  await store.sync("2026-11-18", source(), [], new Date("2026-11-18T14:00:00Z"));
  assert.equal(files.get(file), original); assert.ok(files.has("data/super-kino-neighbor-portfolios/index.json"));
});
test("scheduler prepares±1 only after original from18 and expired windows stay read-only", () => {
  const before = automationPlan("37 12 * * *", new Date("2026-11-17T12:37:00Z"));
  assert.ok(!before.operations.some(o => o.expect === "neighbor-portfolio"));
  const plan = automationPlan("37 12 * * *", new Date("2026-11-18T12:37:00Z"));
  const i = plan.operations.findIndex(o => o.expect === "neighbor-portfolio"); assert.ok(i > 0); assert.equal(plan.operations[i - 1].expect, "portfolio");
  assert.deepEqual(plan.operations[i].body, { date: "2026-11-18" });
  const s = buildNeighborSnapshot(source(), "a".repeat(64), now);
  assert.equal(operationReady(plan.operations[i], { current: s }), true);
  assert.equal(savedStateReady("neighbor-portfolio", "2026-11-18", undefined, s), true);
  assert.equal(savedStateReady("neighbor-portfolio", "2026-11-17", undefined, s), false);
  const expired = automationPlan("37 12 * * *", new Date("2026-11-18T20:00:00Z"));
  assert.ok(expired.expired); assert.ok(expired.operations.every(o => !o.body && o.path.startsWith("/api/automation/status")));
});
