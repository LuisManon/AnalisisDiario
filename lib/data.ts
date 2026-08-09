import fs from "node:fs/promises";
import path from "node:path";
import { drawSchema, laPrimeraDrawSchema, lotekaRepartideraDrawSchema } from "./validation";
import type { DrawResult, LaPrimeraDraw, LotekaRepartideraDraw } from "./types";

const dataPath = path.join(process.cwd(), "data", "results.json");
const laPrimeraDataPath = path.join(process.cwd(), "data", "la-primera-results.json");
const lotekaRepartideraDataPath = path.join(process.cwd(), "data", "loteka-repartidera-results.json");

export async function readResults(): Promise<DrawResult[]> {
  const raw = await fs.readFile(dataPath, "utf8");
  const parsed = JSON.parse(raw);
  const results = drawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function writeResults(results: DrawResult[]) {
  const unique = new Map<string, DrawResult>();
  for (const result of results) unique.set(result.date, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
  await fs.writeFile(dataPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return sorted;
}

export async function readLaPrimeraResults(): Promise<LaPrimeraDraw[]> {
  const raw = await fs.readFile(laPrimeraDataPath, "utf8");
  const parsed = JSON.parse(raw);
  const results = laPrimeraDrawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
}

export async function writeLaPrimeraResults(results: LaPrimeraDraw[]) {
  const unique = new Map<string, LaPrimeraDraw>();
  for (const result of results) unique.set(`${result.date}-${result.session}`, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
  await fs.writeFile(laPrimeraDataPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return sorted;
}

export async function readLotekaRepartideraResults(): Promise<LotekaRepartideraDraw[]> {
  const raw = await fs.readFile(lotekaRepartideraDataPath, "utf8");
  const parsed = JSON.parse(raw);
  const results = lotekaRepartideraDrawSchema.array().parse(parsed);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function writeLotekaRepartideraResults(results: LotekaRepartideraDraw[]) {
  const unique = new Map<string, LotekaRepartideraDraw>();
  for (const result of results) unique.set(result.date, result);
  const sorted = [...unique.values()].sort((a, b) => b.date.localeCompare(a.date));
  await fs.writeFile(lotekaRepartideraDataPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return sorted;
}
