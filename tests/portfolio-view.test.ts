import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compactKinoPortfolio, compactNeighborPortfolio } from "../lib/portfolio-view.ts";
import { kinoSnapshotSchema, summarizeKinoPrizes, type KinoDraw } from "../lib/super-kino.ts";
import { kinoNeighborSchema, neighborDayState } from "../lib/super-kino-neighbor.ts";
import { createKinoNeighborStore } from "../lib/super-kino-neighbor-store.ts";

const snapshot = kinoSnapshotSchema.parse(JSON.parse(readFileSync(new URL("../data/super-kino-portfolios/2026-11-02.json", import.meta.url), "utf8")));
const corrected: KinoDraw = { date: snapshot.targetDate, numbers: Array.from({ length: 20 }, (_, i) => i + 1), source: "fixture" };

test("compact calendars omit historical plays, preserve frozen prizes and keep latest postgame detail", () => {
  const before = JSON.stringify(snapshot);
  const result = compactKinoPortfolio({ current: null, snapshots: [snapshot] }, [corrected]);
  assert.equal(result.latest, snapshot);
  assert.deepEqual(result.snapshots[0].prizeSummary, snapshot.prizeSummary);
  assert.equal("plays" in result.snapshots[0], false);
  assert.ok(JSON.stringify(result.snapshots).length < JSON.stringify([snapshot]).length / 5);
  assert.equal(JSON.stringify(snapshot), before);
});

test("unfrozen calendars retain evaluated totals without inventing a persisted prize or portfolio", () => {
  const unfrozen = { ...snapshot, prizeSummary: undefined, prizeDrawNumbers: undefined };
  const view = compactKinoPortfolio({ current: null, snapshots: [unfrozen] }, [corrected]);
  assert.deepEqual(view.snapshots[0].prizeSummary, summarizeKinoPrizes(unfrozen, corrected));
  assert.equal(unfrozen.prizeSummary, undefined);
  assert.deepEqual(compactKinoPortfolio({ current: null, snapshots: [] }, []), { current: null, latest: null, snapshots: [], waitingForResult: undefined });
});

test("neighbor date reads touch one file; unchanged records reuse validation and changed contents are revalidated", async () => {
  const raw = readFileSync(new URL("../data/super-kino-neighbor-portfolios/2026-11-18.json", import.meta.url), "utf8");
  const expected = kinoNeighborSchema.parse(JSON.parse(raw));
  let content = raw, reads: string[] = [];
  const store = createKinoNeighborStore({ read: async file => { reads.push(file); return content; }, write: async () => { throw new Error("unexpected write"); } });
  const first = await store.read("2026-11-18");
  assert.equal(await store.read("2026-11-18"), first);
  assert.ok(reads.every(file => file === "data/super-kino-neighbor-portfolios/2026-11-18.json"));
  const compact = compactNeighborPortfolio({ current: first, snapshots: [first!], startDate: "2026-11-18" });
  assert.equal(compact.snapshots[0].playCount, 200);
  assert.equal("plays" in compact.snapshots[0], false);
  assert.deepEqual(neighborDayState("2026-11-18", compact.snapshots[0]), neighborDayState("2026-11-18", expected));
  content = JSON.stringify({ ...expected, plays: [] });
  await assert.rejects(store.read("2026-11-18"));
});
