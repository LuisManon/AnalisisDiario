import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubSnapshot } from "./github-data-store.ts";
import { buildNeighborSnapshot, freezeNeighborResult, kinoNeighborSchema, KINO_NEIGHBOR_START, neighborClose, neighborScheduled, type KinoNeighborSnapshot } from "./super-kino-neighbor.ts";
import type { KinoDraw, KinoSnapshot } from "./super-kino.ts";

const directory = "data/super-kino-neighbor-portfolios", indexFile = `${directory}/index.json`;
const dateSchema = z.iso.date(), indexSchema = z.array(dateSchema).transform(dates => [...new Set(dates)].sort((a, b) => b.localeCompare(a)));
const fileFor = (date: string) => `${directory}/${dateSchema.parse(date)}.json`;
const localPath = (file: string) => path.join(process.cwd(), "data", "super-kino-neighbor-portfolios", path.basename(file));
type Storage = { read: (file: string) => Promise<string | null>; write: (file: string, content: string, previous: string | null, message: string) => Promise<void> };

/** Injectable CAS storage keeps tests and fixtures separate from operational data. */
export function createKinoNeighborStore(storage: Storage) {
  let queue: Promise<unknown> = Promise.resolve();
  const readIndex = async () => { const raw = await storage.read(indexFile); return { raw, dates: indexSchema.parse(raw === null ? [] : JSON.parse(raw)) }; };
  const parsedRecords = new Map<string, { raw: string; snapshot: KinoNeighborSnapshot }>();
  const readOne = async (date: string) => {
    const file = fileFor(date), raw = await storage.read(file);
    const cached = parsedRecords.get(file);
    const snapshot = raw === null ? null : cached?.raw === raw ? cached.snapshot : kinoNeighborSchema.parse(JSON.parse(raw));
    if (snapshot && raw !== null && cached?.raw !== raw) {
      if (parsedRecords.size >= 128) parsedRecords.delete(parsedRecords.keys().next().value!);
      parsedRecords.set(file, { raw, snapshot });
    }
    if (snapshot && snapshot.targetDate !== date) throw new Error("La cartera ±1 no corresponde a su fecha.");
    return { file, raw, snapshot };
  };
  const ensureIndex = async (date: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { raw, dates } = await readIndex(); if (dates.includes(date)) return;
      try { await storage.write(indexFile, `${JSON.stringify(indexSchema.parse([...dates, date]), null, 2)}\n`, raw, "Index Super Kino TV ±1 portfolio"); return; }
      catch (error) { if (attempt === 2) throw error; }
    }
  };
  const readAll = async () => {
    const { dates } = await readIndex();
    const records = await Promise.all(dates.map(async date => (await readOne(date)).snapshot));
    return records.filter((s): s is KinoNeighborSnapshot => s !== null);
  };
  const view = async (date: string) => {
    dateSchema.parse(date); const snapshots = await readAll();
    if (!snapshots.some(s => s.targetDate === date)) {
      const orphan = (await readOne(date)).snapshot;
      if (orphan) snapshots.push(orphan);
    }
    snapshots.sort((a, b) => b.targetDate.localeCompare(a.targetDate));
    return { current: snapshots.find(s => s.targetDate === date) ?? null, snapshots, startDate: KINO_NEIGHBOR_START };
  };
  const sync = async (date: string, source: KinoSnapshot | null, results: KinoDraw[], now = new Date()) => {
    dateSchema.parse(date);
    const task = queue.then(async () => {
      let snapshots = await readAll();
      const stored = await readOne(date);
      if (stored.snapshot && !snapshots.some(s => s.targetDate === date)) { await ensureIndex(date); snapshots.push(stored.snapshot); }
      for (let i = 0; i < snapshots.length; i++) {
        const frozen = freezeNeighborResult(snapshots[i], results, now);
        if (frozen === snapshots[i]) continue;
        const old = await readOne(frozen.targetDate);
        // A concurrent evaluator may already have frozen a different source version.
        if (old.snapshot?.prizeSummary) { snapshots[i] = old.snapshot; continue; }
        try { await storage.write(old.file, `${JSON.stringify(frozen, null, 2)}\n`, old.raw, "Record Super Kino TV ±1 prizes"); snapshots[i] = frozen; }
        catch (error) { const fresh = (await readOne(frozen.targetDate)).snapshot; if (!fresh?.prizeSummary) throw error; snapshots[i] = fresh; }
      }
      if (!stored.snapshot && source && source.targetDate === date && neighborScheduled(date) && now.getTime() < neighborClose(date) && !results.some(r => r.date === date)) {
        const sourceContent = JSON.stringify({ targetDate: source.targetDate, generatedAt: source.generatedAt, algorithm: source.algorithm, plays: source.plays });
        const generated = buildNeighborSnapshot(source, createHash("sha256").update(sourceContent).digest("hex"), now);
        let saved = generated;
        try { await storage.write(fileFor(date), `${JSON.stringify(generated, null, 2)}\n`, null, "Save Super Kino TV ±1 200-play portfolio"); }
        catch (error) { const fresh = (await readOne(date)).snapshot; if (!fresh) throw error; saved = fresh; }
        await ensureIndex(date); snapshots.push(saved);
      }
      snapshots = snapshots.sort((a, b) => b.targetDate.localeCompare(a.targetDate));
      return { current: snapshots.find(s => s.targetDate === date) ?? null, snapshots, startDate: KINO_NEIGHBOR_START };
    });
    queue = task.catch(() => undefined); return task;
  };
  return { view, sync, read: async (date: string) => (await readOne(date)).snapshot };
}
async function localRead(file: string) {
  try { return await fs.readFile(localPath(file), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
const store = createKinoNeighborStore({
  read: file => isGitHubDataStoreEnabled() ? readGitHubJsonFile(file) : localRead(file),
  write: async (file, content, previous, message) => {
    if (isGitHubDataStoreEnabled()) { await writeGitHubSnapshot(file, content, previous, message); return; }
    const destination = localPath(file), lockFile = `${destination}.lock`, temporary = `${destination}.${randomUUID()}.tmp`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const lock = await fs.open(lockFile, "wx");
    try {
      if (await localRead(file) !== previous) throw new Error("La cartera ±1 cambió en otra sesión.");
      await fs.writeFile(temporary, content, "utf8"); await fs.rename(temporary, destination);
    } finally { await lock.close(); await fs.unlink(lockFile); await fs.unlink(temporary).catch(() => undefined); }
  }
});
export const readKinoNeighborPortfolio = store.view;
export const readSavedNeighborSnapshot = store.read;
export const syncKinoNeighborPortfolio = store.sync;
