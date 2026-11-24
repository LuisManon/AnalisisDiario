import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createPublicIndexStore, buildPublicPortfolioIndexes } from "./portfolio-index.ts";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubSnapshot } from "./github-data-store.ts";
import { readKinoSnapshots, readSavedKinoSnapshot } from "./super-kino-portfolio-store.ts";
import { readKinoNeighborPortfolio, readSavedNeighborSnapshot } from "./super-kino-neighbor-store.ts";
import { readKinoResults } from "./super-kino-store";
import { KINO_NEIGHBOR_START } from "./super-kino-neighbor-schedule.ts";
import { isKinoNoDraw, kinoClock, kinoDrawMinutes, kinoExpectedDate, kinoTargetDate, shiftKinoDate } from "./super-kino-clock.ts";
import type { KinoDraw } from "./super-kino.ts";

const store = createPublicIndexStore({
  read: async file => {
    if (isGitHubDataStoreEnabled()) return readGitHubJsonFile(file);
    try { return await fs.readFile(path.join(process.cwd(), "data", "public-portfolios", path.basename(file)), "utf8"); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
  },
  write: async (file, content, previous) => {
    if (process.env.VERCEL) throw new Error("Los índices solo se publican desde la automatización.");
    if (isGitHubDataStoreEnabled()) return writeGitHubSnapshot(file, content, previous, "Publish portfolio calendar indexes");
    const destination = path.join(process.cwd(), "data", "public-portfolios", path.basename(file)), temporary = `${destination}.${randomUUID()}.tmp`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(temporary, content, "utf8"); await fs.rename(temporary, destination);
  }
});

export async function publishPortfolioIndexes() {
  if (process.env.VERCEL) throw new Error("La publicación solo está disponible en el trabajador automático.");
  const [kino, neighbor, results] = await Promise.all([readKinoSnapshots(), readKinoNeighborPortfolio(KINO_NEIGHBOR_START), readKinoResults()]);
  const indexes = buildPublicPortfolioIndexes(kino, neighbor.snapshots, results, KINO_NEIGHBOR_START);
  await store.publish(indexes);
  return { kino: indexes.kino.sourceVersion, neighbor: indexes.neighbor.sourceVersion };
}

export async function readPublicKinoPortfolio(results: KinoDraw[], now = new Date()) {
  const index = await store.readKino();
  const clock = kinoClock(now);
  const pendingDate = !isKinoNoDraw(clock.date) && clock.minutes >= kinoDrawMinutes(clock.date) - 5 ? clock.date : kinoExpectedDate(now);
  const waitingForResult = !results.some(d => d.date === pendingDate);
  let target = kinoTargetDate(now);
  if (results.some(d => d.date === target)) target = shiftKinoDate(target, 1);
  const currentDate = waitingForResult ? pendingDate : target;
  const [current, latest] = await Promise.all([readSavedKinoSnapshot(currentDate), index.latestDate ? readSavedKinoSnapshot(index.latestDate) : null]);
  return { current, latest, snapshots: index.snapshots, waitingForResult, sourceVersion: index.sourceVersion };
}

export async function readPublicNeighborPortfolio(now = new Date()) {
  const index = await store.readNeighbor();
  const target = [KINO_NEIGHBOR_START, kinoTargetDate(now)].sort().at(-1)!;
  return { current: await readSavedNeighborSnapshot(target), snapshots: index.snapshots, startDate: index.startDate, sourceVersion: index.sourceVersion };
}
