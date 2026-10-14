import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { buildKinoSnapshot, buildKinoV92Snapshot, freezeKinoPrizeSummaries, kinoAlgorithmForDate, kinoSnapshotSchema, type KinoDraw, type KinoSnapshot } from "./super-kino";
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
const candidateFile = "data/super-kino-v92-portfolio-history.json";
const candidateLocalPath = path.join(process.cwd(),candidateFile);
async function readCandidateRaw() {
  if (isGitHubDataStoreEnabled()) return readGitHubJsonFile(candidateFile);
  try { return await fs.readFile(candidateLocalPath,"utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
async function writeCandidateSnapshots(snapshots: KinoSnapshot[], previousRaw: string | null, message: string) {
  const content = `${JSON.stringify(snapshots,null,2)}\n`;
  if (isGitHubDataStoreEnabled()) await writeGitHubSnapshot(candidateFile,content,previousRaw,message);
  else {
    const temporary = `${candidateLocalPath}.${randomUUID()}.tmp`;
    await fs.writeFile(temporary,content,"utf8");
    await fs.rename(temporary,candidateLocalPath);
  }
  return content;
}
let candidateQueue: Promise<unknown> = Promise.resolve();
export function getKinoV92Portfolio(results: KinoDraw[], now = new Date()) {
  const run = candidateQueue.then(async () => {
    let targetDate = kinoTargetDate(now);
    if (results.some(draw=>draw.date===targetDate)) targetDate=shiftKinoDate(targetDate,1);
    let raw = await readCandidateRaw();
    let snapshots = parse(raw);
    const frozen = freezeKinoPrizeSummaries(snapshots,results);
    if (frozen.some((snapshot,index)=>snapshot!==snapshots[index])) {
      raw=await writeCandidateSnapshots(frozen,raw,"Record Super Kino TV v9.2 candidate prizes");
      snapshots=frozen;
    }
    const clock=kinoClock(now);
    const pendingDate=clock.minutes>=kinoDrawMinutes(clock.date)-5?clock.date:kinoExpectedDate(now);
    if (!results.some(draw=>draw.date===pendingDate)) return {current:snapshots.find(snapshot=>snapshot.targetDate===pendingDate) ?? null,snapshots,waitingForResult:true};
    const existing=snapshots.find(snapshot=>snapshot.targetDate===targetDate);
    if (existing?.algorithm==="kino-v9.2") return {current:existing,snapshots};
    const current=buildKinoV92Snapshot(results,targetDate,now);
    const next=[...snapshots.filter(snapshot=>snapshot.targetDate!==targetDate),current].sort((a,b)=>b.targetDate.localeCompare(a.targetDate));
    await writeCandidateSnapshots(next,raw,"Save Super Kino TV v9.2 candidate portfolio");
    return {current,snapshots:next};
  });
  candidateQueue=run.catch(()=>undefined);
  return run;
}
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
    const expectedAlgorithm = kinoAlgorithmForDate(targetDate);
    if (existing?.algorithm === expectedAlgorithm) return {current: existing, snapshots};
    const current = buildKinoSnapshot(results, targetDate, now);
    const next = (existing ? snapshots.map(snapshot => snapshot.targetDate === targetDate ? current : snapshot) : [...snapshots, current]).sort((a,b) => b.targetDate.localeCompare(a.targetDate));
    if (isGitHubDataStoreEnabled()) {
      try { await writeSnapshots(next, raw, "Save Super Kino TV 120-play portfolio"); }
      catch (error) {
        // A concurrent request may have created the same date; use its immutable snapshot.
        const fresh = await readKinoSnapshots();
        const saved = fresh.find(s => s.targetDate === targetDate && s.algorithm === expectedAlgorithm);
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
