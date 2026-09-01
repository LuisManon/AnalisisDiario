import fs from "node:fs/promises";
import path from "node:path";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
import { buildThirtyQuinielaSuggestions, type QuinielaSuggestion } from "./quiniela-pale";
import type { QuinielaPaleDraw } from "./types";

export type QuinielaPortfolioSnapshot = {
  targetDate: string;
  generatedAt: string;
  plays: QuinielaSuggestion[];
};

const localPath = path.join(process.cwd(), "data", "quiniela-pale-portfolio-history.json");
const repoPath = "data/quiniela-pale-portfolio-history.json";

async function readSnapshots(): Promise<QuinielaPortfolioSnapshot[]> {
  try {
    const remote = isGitHubDataStoreEnabled() ? await readGitHubJsonFile(repoPath) : null;
    const raw = remote ?? await fs.readFile(localPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSnapshots(snapshots: QuinielaPortfolioSnapshot[]) {
  const content = `${JSON.stringify(snapshots.sort((a, b) => b.targetDate.localeCompare(a.targetDate)), null, 2)}\n`;
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubJsonFile(repoPath, content, "Save Quiniela Pale 30-play portfolio");
    return;
  }
  await fs.writeFile(localPath, content, "utf8");
}

export async function getOrCreateQuinielaPortfolio(targetDate: string, results: QuinielaPaleDraw[]) {
  const snapshots = await readSnapshots();
  const existing = snapshots.find((snapshot) => snapshot.targetDate === targetDate);
  if (existing) return existing;
  const priorResults = results.filter((draw) => draw.date < targetDate);
  const snapshot: QuinielaPortfolioSnapshot = {
    targetDate,
    generatedAt: new Date().toISOString(),
    plays: buildThirtyQuinielaSuggestions(priorResults, targetDate)
  };
  await writeSnapshots([...snapshots, snapshot]);
  return snapshot;
}
