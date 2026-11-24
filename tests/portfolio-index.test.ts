import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { buildPublicPortfolioIndexes, createPublicIndexStore } from "../lib/portfolio-index.ts";
import { kinoSnapshotSchema, type KinoDraw } from "../lib/super-kino.ts";
import { kinoNeighborSchema } from "../lib/super-kino-neighbor.ts";

const kino = kinoSnapshotSchema.parse(JSON.parse(fs.readFileSync(new URL("../data/super-kino-portfolios/2026-11-02.json", import.meta.url), "utf8")));
const neighbor = kinoNeighborSchema.parse(JSON.parse(fs.readFileSync(new URL("../data/super-kino-neighbor-portfolios/2026-11-18.json", import.meta.url), "utf8")));
const corrected: KinoDraw = { date: kino.targetDate, numbers: Array.from({ length: 20 }, (_, i) => i + 1), source: "fixture" };
test("indexes preserve frozen prizes and snapshots; repeat publication is idempotent", async () => {
  const before = JSON.stringify({ kino, neighbor });
  const indexes = buildPublicPortfolioIndexes([kino], [neighbor], [corrected], "2026-11-18");
  assert.deepEqual(indexes.kino.snapshots[0].prizeSummary, kino.prizeSummary);
  assert.deepEqual(indexes.neighbor.snapshots[0].prizeSummary, neighbor.prizeSummary);
  assert.equal("plays" in indexes.kino.snapshots[0], false);
  const files = new Map<string, string>(); let writes = 0;
  const store = createPublicIndexStore({ read: async f => files.get(f) ?? null, write: async (f, raw, previous) => {
    assert.equal(files.get(f) ?? null, previous); writes++; files.set(f, raw);
  } });
  await store.publish(indexes); await store.publish(indexes);
  assert.equal(writes, 2);
  assert.deepEqual(await store.readKino(), JSON.parse(JSON.stringify(indexes.kino)));
  assert.deepEqual(await store.readNeighbor(), JSON.parse(JSON.stringify(indexes.neighbor)));
  assert.equal(JSON.stringify({ kino, neighbor }), before);
});
test("public index reads do not scan historical files and a missing index fails explicitly", async () => {
  const indexes = buildPublicPortfolioIndexes([kino], [neighbor], [corrected], "2026-11-18");
  const reads: string[] = [];
  const store = createPublicIndexStore({ read: async f => { reads.push(f); return JSON.stringify(indexes.kino); }, write: async () => { throw new Error("unexpected write"); } });
  await store.readKino();
  assert.deepEqual(reads, ["data/public-portfolios/kino.json"]);
  const missing = createPublicIndexStore({ read: async () => null, write: async () => { throw new Error("unexpected write"); } });
  await assert.rejects(missing.readKino(), /aún no está publicado/);
});


test("source versions are reproducible and change with corrected sources while frozen totals stay fixed", () => {
  const first = buildPublicPortfolioIndexes([kino], [neighbor], [corrected], "2026-11-18");
  const repeated = buildPublicPortfolioIndexes([kino], [neighbor], [corrected], "2026-11-18");
  assert.equal(first.kino.sourceVersion, repeated.kino.sourceVersion);
  const changed = buildPublicPortfolioIndexes([kino], [neighbor], [{ ...corrected, numbers: Array.from({length:20},(_,i)=>i+30) }], "2026-11-18");
  assert.notEqual(first.kino.sourceVersion, changed.kino.sourceVersion);
  assert.deepEqual(first.kino.snapshots[0].prizeSummary, changed.kino.snapshots[0].prizeSummary);
});
