import fs from "node:fs/promises";
import path from "node:path";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
import { buildThirtyPlayPortfolio } from "./game";
import type { DrawResult, ThirtyPlayPortfolio } from "./types";

const portfolioPath = path.join(process.cwd(), "data", "portfolio-history.json");
const portfolioRepoPath = "data/portfolio-history.json";

async function readPortfolios(): Promise<ThirtyPlayPortfolio[]> {
  try {
    const remote = isGitHubDataStoreEnabled() ? await readGitHubJsonFile(portfolioRepoPath) : null;
    const raw = remote ?? await fs.readFile(portfolioPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePortfolios(portfolios: ThirtyPlayPortfolio[]) {
  const content = `${JSON.stringify(portfolios.sort((a, b) => b.targetDate.localeCompare(a.targetDate)), null, 2)}\n`;
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubJsonFile(portfolioRepoPath, content, "Save Loto Mas 30-play portfolio");
    return;
  }
  await fs.writeFile(portfolioPath, content, "utf8");
}

export async function getOrCreatePortfolio(targetDate: string, results: DrawResult[]) {
  const portfolios = await readPortfolios();
  const existing = portfolios.find((portfolio) => portfolio.targetDate === targetDate);
  if (existing) return existing;

  const portfolio = buildThirtyPlayPortfolio(results, targetDate);
  await writePortfolios([...portfolios, portfolio]);
  return portfolio;
}
