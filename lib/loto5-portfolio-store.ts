import fs from "node:fs/promises";
import path from "node:path";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
import { buildLoto5Portfolio } from "./la-primera-loto5";
import type { LaPrimeraLoto5Draw, Loto5PortfolioSnapshot } from "./types";

const localPath = path.join(process.cwd(), "data", "la-primera-loto5-portfolio-history.json");
const repoPath = "data/la-primera-loto5-portfolio-history.json";

async function readSnapshots(): Promise<Loto5PortfolioSnapshot[]> {
  try {
    const remote = isGitHubDataStoreEnabled() ? await readGitHubJsonFile(repoPath) : null;
    const raw = remote ?? await fs.readFile(localPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSnapshots(snapshots: Loto5PortfolioSnapshot[]) {
  const content = `${JSON.stringify(snapshots.sort((a, b) => b.targetDate.localeCompare(a.targetDate)), null, 2)}\n`;
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubJsonFile(repoPath, content, "Save La Primera Loto 5 60-play portfolio");
    return;
  }
  await fs.writeFile(localPath, content, "utf8");
}

export async function getOrCreateLoto5Portfolio(targetDate: string, results: LaPrimeraLoto5Draw[]) {
  const snapshots = await readSnapshots();
  const existing = snapshots.find((snapshot) => snapshot.targetDate === targetDate);
  if (existing) return existing;
  const snapshot = buildLoto5Portfolio(results, targetDate);
  await writeSnapshots([...snapshots, snapshot]);
  return snapshot;
}
