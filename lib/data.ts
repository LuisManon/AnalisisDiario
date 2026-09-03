import fs from "node:fs/promises";
import path from "node:path";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
import { drawSchema, laPrimeraDrawSchema, laPrimeraLoto5DrawSchema, laPrimeraQuinielaDrawSchema, lotekaRepartideraDrawSchema, quinielaPaleDrawSchema } from "./validation";
import type { DrawResult, LaPrimeraDraw, LaPrimeraLoto5Draw, LaPrimeraQuinielaDraw, LotekaRepartideraDraw, QuinielaPaleDraw } from "./types";

const dataPath = path.join(process.cwd(), "data", "results.json");
const laPrimeraDataPath = path.join(process.cwd(), "data", "la-primera-results.json");
const laPrimeraQuinielaDataPath = path.join(process.cwd(), "data", "la-primera-quiniela-results.json");
const laPrimeraLoto5DataPath = path.join(process.cwd(), "data", "la-primera-loto5-results.json");
const lotekaRepartideraDataPath = path.join(process.cwd(), "data", "loteka-repartidera-results.json");
const quinielaPaleDataPath = path.join(process.cwd(), "data", "quiniela-pale-results.json");
const lotoMasRepoPath = "data/results.json";
const laPrimeraRepoPath = "data/la-primera-results.json";
const laPrimeraQuinielaRepoPath = "data/la-primera-quiniela-results.json";
const laPrimeraLoto5RepoPath = "data/la-primera-loto5-results.json";
const lotekaRepartideraRepoPath = "data/loteka-repartidera-results.json";
const quinielaPaleRepoPath = "data/quiniela-pale-results.json";

async function readJsonFile(localPath: string, repoPath: string) {
  if (isGitHubDataStoreEnabled()) {
    const remote = await readGitHubJsonFile(repoPath);
    if (remote) return remote;
  }

  return fs.readFile(localPath, "utf8");
}

async function writeJsonFile(localPath: string, repoPath: string, content: string, commitMessage: string) {
  if (isGitHubDataStoreEnabled()) {
    await writeGitHubJsonFile(repoPath, content, commitMessage);
    return;
  }

  await fs.writeFile(localPath, content, "utf8");
}

export async function readResults(): Promise<DrawResult[]> {
  const raw = await readJsonFile(dataPath, lotoMasRepoPath);
  const parsed = JSON.parse(raw);
  const results = drawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function writeResults(results: DrawResult[]) {
  const unique = new Map<string, DrawResult>();
  for (const result of results) unique.set(result.date, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
  await writeJsonFile(dataPath, lotoMasRepoPath, `${JSON.stringify(sorted, null, 2)}\n`, "Update Loto Mas results");
  return sorted;
}

export async function readLaPrimeraResults(): Promise<LaPrimeraDraw[]> {
  const raw = await readJsonFile(laPrimeraDataPath, laPrimeraRepoPath);
  const parsed = JSON.parse(raw);
  const results = laPrimeraDrawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
}

export async function writeLaPrimeraResults(results: LaPrimeraDraw[]) {
  const unique = new Map<string, LaPrimeraDraw>();
  for (const result of results) unique.set(`${result.date}-${result.session}`, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
  await writeJsonFile(laPrimeraDataPath, laPrimeraRepoPath, `${JSON.stringify(sorted, null, 2)}\n`, "Update La Primera results");
  return sorted;
}

export async function readLaPrimeraQuinielaResults(): Promise<LaPrimeraQuinielaDraw[]> {
  const raw = await readJsonFile(laPrimeraQuinielaDataPath, laPrimeraQuinielaRepoPath);
  const results = laPrimeraQuinielaDrawSchema.array().parse(JSON.parse(raw));
  return results.sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
}

export async function writeLaPrimeraQuinielaResults(results: LaPrimeraQuinielaDraw[]) {
  const unique = new Map<string, LaPrimeraQuinielaDraw>();
  for (const result of results) unique.set(`${result.date}-${result.session}`, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
  await writeJsonFile(laPrimeraQuinielaDataPath, laPrimeraQuinielaRepoPath, `${JSON.stringify(sorted, null, 2)}\n`, "Update La Primera Quiniela results");
  return sorted;
}

export async function readLaPrimeraLoto5Results(): Promise<LaPrimeraLoto5Draw[]> {
  const raw = await readJsonFile(laPrimeraLoto5DataPath, laPrimeraLoto5RepoPath);
  const results = laPrimeraLoto5DrawSchema.array().parse(JSON.parse(raw));
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function writeLaPrimeraLoto5Results(results: LaPrimeraLoto5Draw[]) {
  const unique = new Map<string, LaPrimeraLoto5Draw>();
  for (const result of results) unique.set(result.date, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
  await writeJsonFile(
    laPrimeraLoto5DataPath,
    laPrimeraLoto5RepoPath,
    `${JSON.stringify(sorted, null, 2)}\n`,
    "Update La Primera Loto 5 results"
  );
  return sorted;
}

export async function readLotekaRepartideraResults(): Promise<LotekaRepartideraDraw[]> {
  const raw = await readJsonFile(lotekaRepartideraDataPath, lotekaRepartideraRepoPath);
  const parsed = JSON.parse(raw);
  const results = lotekaRepartideraDrawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function writeLotekaRepartideraResults(results: LotekaRepartideraDraw[]) {
  const unique = new Map<string, LotekaRepartideraDraw>();
  for (const result of results) unique.set(result.date, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
  await writeJsonFile(
    lotekaRepartideraDataPath,
    lotekaRepartideraRepoPath,
    `${JSON.stringify(sorted, null, 2)}\n`,
    "Update Loteka Repartidera results"
  );
  return sorted;
}

export async function readQuinielaPaleResults(): Promise<QuinielaPaleDraw[]> {
  const raw = await readJsonFile(quinielaPaleDataPath, quinielaPaleRepoPath);
  const parsed = JSON.parse(raw);
  const results = quinielaPaleDrawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function writeQuinielaPaleResults(results: QuinielaPaleDraw[]) {
  const unique = new Map<string, QuinielaPaleDraw>();
  for (const result of results) unique.set(result.date, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
  await writeJsonFile(
    quinielaPaleDataPath,
    quinielaPaleRepoPath,
    `${JSON.stringify(sorted, null, 2)}\n`,
    "Update Quiniela Pale results"
  );
  return sorted;
}
