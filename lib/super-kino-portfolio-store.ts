import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { buildKinoSnapshot, freezeKinoPrizeSummaries, kinoAlgorithmForDate, kinoSnapshotSchema, kinoStrategyVersionForDate, type KinoDraw, type KinoSnapshot } from "./super-kino.ts";
import { kinoClock, kinoDrawMinutes, kinoExpectedDate, kinoTargetDate, shiftKinoDate } from "./super-kino-clock.ts";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubSnapshot } from "./github-data-store.ts";

const directory = "data/super-kino-portfolios";
const indexFile = `${directory}/index.json`;
const indexSchema = z.array(z.iso.date()).transform(dates => [...new Set(dates)].sort((a, b) => b.localeCompare(a)));
const localDirectory = path.join(process.cwd(), "data", "super-kino-portfolios");
const localPath = (file: string) => path.join(localDirectory, path.basename(file));
const snapshotFile = (date: string) => `${directory}/${date}.json`;

async function readRaw(file: string) {
  if (isGitHubDataStoreEnabled()) return readGitHubJsonFile(file);
  try { return await fs.readFile(localPath(file), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

async function writeRaw(file: string, content: string, previousRaw: string | null, message: string) {
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubSnapshot(file, content, previousRaw, message);
  } else {
    const destination = localPath(file);
    await fs.mkdir(path.dirname(destination), {recursive: true});
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, content, "utf8");
    await fs.rename(temporary, destination);
  }
  return content;
}

function parseSnapshot(raw: string | null, file: string) {
  if (raw === null) return null;
  const snapshot = kinoSnapshotSchema.parse(JSON.parse(raw));
  if (snapshotFile(snapshot.targetDate) !== file) throw new Error(`La cartera Kino no corresponde a ${file}.`);
  return snapshot;
}

async function readIndex() {
  const raw = await readRaw(indexFile);
  return {raw, dates: indexSchema.parse(raw === null ? [] : JSON.parse(raw))};
}

async function readSnapshot(date: string) {
  const file = snapshotFile(date);
  const raw = await readRaw(file);
  return {file, raw, snapshot: parseSnapshot(raw, file)};
}

async function ensureIndexed(date: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const {raw, dates} = await readIndex();
    if (dates.includes(date)) return;
    const next = indexSchema.parse([...dates, date]);
    try {
      await writeRaw(indexFile, `${JSON.stringify(next, null, 2)}\n`, raw, "Index Super Kino TV portfolio");
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

async function saveSnapshot(snapshot: KinoSnapshot, previousRaw: string | null, message: string) {
  const file = snapshotFile(snapshot.targetDate);
  const content = `${JSON.stringify(snapshot, null, 2)}\n`;
  await writeRaw(file, content, previousRaw, message);
  await ensureIndexed(snapshot.targetDate);
  return content;
}

export async function readKinoSnapshots() {
  const {dates} = await readIndex();
  const snapshots = await Promise.all(dates.map(async date => (await readSnapshot(date)).snapshot));
  return snapshots.filter((snapshot): snapshot is KinoSnapshot => snapshot !== null);
}

let queue: Promise<unknown> = Promise.resolve();
export async function getKinoPortfolio(results: KinoDraw[], now = new Date()) {
  const run = queue.then(async () => {
    let targetDate = kinoTargetDate(now);
    if (results.some(d => d.date === targetDate)) targetDate = shiftKinoDate(targetDate, 1);

    let snapshots = await readKinoSnapshots();
    const targetStored = await readSnapshot(targetDate);
    if (targetStored.snapshot && !snapshots.some(snapshot => snapshot.targetDate === targetDate)) {
      await ensureIndexed(targetDate);
      snapshots = [targetStored.snapshot, ...snapshots].sort((a, b) => b.targetDate.localeCompare(a.targetDate));
    }

    const frozenSnapshots = freezeKinoPrizeSummaries(snapshots, results);
    for (let index = 0; index < frozenSnapshots.length; index += 1) {
      if (frozenSnapshots[index] === snapshots[index]) continue;
      const stored = await readSnapshot(frozenSnapshots[index].targetDate);
      try {
        await saveSnapshot(frozenSnapshots[index], stored.raw, "Record Super Kino TV prize tracking");
        snapshots[index] = frozenSnapshots[index];
      } catch {
        const fresh = await readSnapshot(frozenSnapshots[index].targetDate);
        if (fresh.snapshot) snapshots[index] = fresh.snapshot;
      }
    }

    const clock = kinoClock(now);
    const pendingDate = clock.minutes >= kinoDrawMinutes(clock.date) - 5 ? clock.date : kinoExpectedDate(now);
    if (!results.some(d => d.date === pendingDate)) {
      return {current: snapshots.find(s => s.targetDate === pendingDate) ?? null, snapshots, waitingForResult: true};
    }

    const existing = snapshots.find(s => s.targetDate === targetDate);
    const expectedAlgorithm = kinoAlgorithmForDate(targetDate);
    const expectedStrategyVersion = kinoStrategyVersionForDate(targetDate);
    if (existing?.algorithm === expectedAlgorithm && existing.strategyVersion === expectedStrategyVersion) return {current: existing, snapshots};

    const current = buildKinoSnapshot(results, targetDate, now);
    try {
      await saveSnapshot(current, targetStored.raw, `Save Super Kino TV ${current.plays.length}-play portfolio`);
    } catch (error) {
      const fresh = await readSnapshot(targetDate);
      if (fresh.snapshot?.algorithm === expectedAlgorithm && fresh.snapshot.strategyVersion === expectedStrategyVersion) {
        const next = [fresh.snapshot, ...snapshots.filter(snapshot => snapshot.targetDate !== targetDate)].sort((a, b) => b.targetDate.localeCompare(a.targetDate));
        return {current: fresh.snapshot, snapshots: next};
      }
      throw error;
    }
    const next = [current, ...snapshots.filter(snapshot => snapshot.targetDate !== targetDate)].sort((a, b) => b.targetDate.localeCompare(a.targetDate));
    return {current, snapshots: next};
  });
  queue = run.catch(() => undefined);
  return run;
}
