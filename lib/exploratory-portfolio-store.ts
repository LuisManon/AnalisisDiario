import fs from "node:fs/promises";
import path from "node:path";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
import { buildHundredPlayExploratoryPortfolio, hundredPlayExploratoryAlgorithmVersion } from "./game";
import type { DrawResult, HundredPlayExploratoryPortfolio } from "./types";

const exploratoryPath = path.join(process.cwd(), "data", "loto-mas-exploratory-history.json");
const exploratoryRepoPath = "data/loto-mas-exploratory-history.json";

export async function readExploratoryPortfolios(): Promise<HundredPlayExploratoryPortfolio[]> {
  try {
    const remote = isGitHubDataStoreEnabled() ? await readGitHubJsonFile(exploratoryRepoPath) : null;
    const raw = remote ?? await fs.readFile(exploratoryPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeExploratoryPortfolios(portfolios: HundredPlayExploratoryPortfolio[]) {
  const content = `${JSON.stringify(portfolios.sort((a, b) => b.targetDate.localeCompare(a.targetDate)), null, 2)}\n`;
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubJsonFile(exploratoryRepoPath, content, "Save Loto Mas 100-play exploratory portfolio");
    return;
  }
  await fs.writeFile(exploratoryPath, content, "utf8");
}

export async function getOrCreateExploratoryPortfolio(targetDate: string, results: DrawResult[]) {
  const portfolios = await readExploratoryPortfolios();
  const existing = portfolios.find((portfolio) => portfolio.targetDate === targetDate);
  const latestResultDate = results[0]?.date ?? "";
  const shouldRegenerate = existing && targetDate > latestResultDate && existing.algorithmVersion !== hundredPlayExploratoryAlgorithmVersion;
  if (existing && !shouldRegenerate) return existing;

  const portfolio = buildHundredPlayExploratoryPortfolio(results, targetDate);
  await writeExploratoryPortfolios([...portfolios.filter((item) => item.targetDate !== targetDate), portfolio]);
  return portfolio;
}
