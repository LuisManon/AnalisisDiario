import fs from "node:fs/promises";
import path from "node:path";
import { kinoDrawSchema, type KinoDraw } from "./super-kino";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubJsonFile } from "./github-data-store";
const file = "data/super-kino-results.json";
export async function readKinoResults(): Promise<KinoDraw[]> {
  const remote = isGitHubDataStoreEnabled() ? await readGitHubJsonFile(file) : null;
  return kinoDrawSchema.array().parse(JSON.parse(remote ?? await fs.readFile(path.join(process.cwd(),file),"utf8"))).sort((a,b)=>b.date.localeCompare(a.date));
}
export async function writeKinoResults(draws: KinoDraw[]) {
  const valid = kinoDrawSchema.array().parse(draws);
  const sorted = [...new Map(valid.map(d=>[d.date,d])).values()].sort((a,b)=>b.date.localeCompare(a.date));
  const content = `${JSON.stringify(sorted,null,2)}\n`;
  if (isGitHubDataStoreEnabled()) await writeGitHubJsonFile(file,content,"Update Super Kino TV results");
  else await fs.writeFile(path.join(process.cwd(),file),content,"utf8");
  return sorted;
}
