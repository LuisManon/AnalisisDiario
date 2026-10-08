import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { buildKinoSnapshot, freezeKinoPrizeSummaries, kinoSnapshotSchema, type KinoDraw, type KinoSnapshot } from "./super-kino";
import { kinoClock, kinoDrawMinutes, kinoExpectedDate, kinoTargetDate, shiftKinoDate } from "./super-kino-clock";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubSnapshot } from "./github-data-store";
const file = "data/super-kino-portfolio-history.json";
const localPath = path.join(process.cwd(), file);
async function readRaw() {
  if (isGitHubDataStoreEnabled()) return readGitHubJsonFile(file);
  try { return await fs.readFile(localPath, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
function parse(raw: string | null) {
  return kinoSnapshotSchema.array().parse(raw === null ? [] : JSON.parse(raw));
}
async function writeSnapshots(snapshots: KinoSnapshot[], previousRaw: string | null, message: string) {
  const content = `${JSON.stringify(snapshots, null, 2)}\n`;
  if (isGitHubDataStoreEnabled()) await writeGitHubSnapshot(file, content, previousRaw, message);
  else {
    const temporary = `${localPath}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary, content, "utf8");
    await fs.rename(temporary, localPath);
  }
  return content;
}
export async function readKinoSnapshots() { return parse(await readRaw()); }
let queue: Promise<unknown> = Promise.resolve();
export async function getKinoPortfolio(results: KinoDraw[], now = new Date()) {
  const run = queue.then(async () => {
    let targetDate = kinoTargetDate(now);
    if (results.some(d => d.date === targetDate)) targetDate = shiftKinoDate(targetDate, 1);
    let raw = await readRaw();
    let snapshots = parse(raw);
    const frozenSnapshots = freezeKinoPrizeSummaries(snapshots, results);
    if (frozenSnapshots.some((snapshot, index) => snapshot !== snapshots[index])) {
      try {
        raw = await writeSnapshots(frozenSnapshots, raw, "Record Super Kino TV prize tracking");
        snapshots = frozenSnapshots;
      } catch {
        raw = await readRaw();
        snapshots = parse(raw);
      }
    }
    const clock = kinoClock(now);
    const pendingDate = clock.minutes >= kinoDrawMinutes(clock.date) - 5 ? clock.date : kinoExpectedDate(now);
    if (!results.some(d => d.date === pendingDate)) {
      return {current: snapshots.find(s => s.targetDate === pendingDate) ?? null, snapshots, waitingForResult: true};
    }
    const existing = snapshots.find(s => s.targetDate === targetDate);
    if (existing?.algorithm === "kino-v5") return {current: existing, snapshots};
    const current = buildKinoSnapshot(results, targetDate, now);
    const next = (existing ? snapshots.map(snapshot => snapshot.targetDate === targetDate ? current : snapshot) : [...snapshots, current]).sort((a,b) => b.targetDate.localeCompare(a.targetDate));
    if (isGitHubDataStoreEnabled()) {
      try { await writeSnapshots(next, raw, "Save Super Kino TV 120-play portfolio"); }
      catch (error) {
        // A concurrent request may have created the same date; use its immutable snapshot.
        const fresh = await readKinoSnapshots();
        const saved = fresh.find(s => s.targetDate === targetDate && s.algorithm === "kino-v5");
        if (saved) return {current: saved, snapshots: fresh};
        throw error;
      }
    } else {
      await writeSnapshots(next, raw, "Save Super Kino TV 120-play portfolio");
    }
    return {current, snapshots: next};
  });
  queue = run.catch(() => undefined);
  return run;
}
