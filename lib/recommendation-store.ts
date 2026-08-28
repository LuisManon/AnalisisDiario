import fs from "node:fs/promises";
import path from "node:path";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
import { buildRecommendedPlays, getDrawDay } from "./game";
import type { DrawResult, RecommendedPlay } from "./types";

export type RecommendationSnapshot = {
  drawDate: string;
  day: "miercoles" | "sabado";
  generatedAt: string;
  plays: RecommendedPlay[];
};

const snapshotPath = path.join(process.cwd(), "data", "recommendation-history.json");
const snapshotRepoPath = "data/recommendation-history.json";

async function readSnapshots(): Promise<RecommendationSnapshot[]> {
  try {
    const remote = isGitHubDataStoreEnabled() ? await readGitHubJsonFile(snapshotRepoPath) : null;
    const raw = remote ?? await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSnapshots(snapshots: RecommendationSnapshot[]) {
  const content = `${JSON.stringify(snapshots.sort((a, b) => b.drawDate.localeCompare(a.drawDate)), null, 2)}\n`;
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubJsonFile(snapshotRepoPath, content, "Save Loto Mas recommendation snapshot");
    return;
  }
  await fs.writeFile(snapshotPath, content, "utf8");
}

export async function getOrCreateRecommendationSnapshot(drawDate: string, results: DrawResult[]) {
  const snapshots = await readSnapshots();
  const existing = snapshots.find((snapshot) => snapshot.drawDate === drawDate);
  if (existing) return existing;

  // A snapshot may only use information that was available before its draw.
  const priorResults = results.filter((result) => result.date < drawDate);
  const snapshot: RecommendationSnapshot = {
    drawDate,
    day: getDrawDay(drawDate),
    generatedAt: new Date().toISOString(),
    plays: buildRecommendedPlays(priorResults, getDrawDay(drawDate), 5)
  };
  await writeSnapshots([...snapshots, snapshot]);
  return snapshot;
}
