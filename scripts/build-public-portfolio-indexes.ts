/** Bootstrap only derived calendar indexes from local saved records. */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildPublicPortfolioIndexes } from "../lib/portfolio-index.ts";
import { kinoSnapshotSchema, kinoDrawSchema } from "../lib/super-kino.ts";
import { kinoNeighborSchema } from "../lib/super-kino-neighbor.ts";
import { KINO_NEIGHBOR_START } from "../lib/super-kino-neighbor-schedule.ts";

export async function buildLocalPublicIndexes(root = process.cwd()) {
  const read = async (file: string) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
  const dates: string[] = await read("data/super-kino-portfolios/index.json");
  const neighborDates: string[] = await read("data/super-kino-neighbor-portfolios/index.json");
  const kino = await Promise.all(dates.map(async date => kinoSnapshotSchema.parse(await read(`data/super-kino-portfolios/${date}.json`))));
  const neighbor = await Promise.all(neighborDates.map(async date => kinoNeighborSchema.parse(await read(`data/super-kino-neighbor-portfolios/${date}.json`))));
  const results = kinoDrawSchema.array().parse(await read("data/super-kino-results.json"));
  const indexes = buildPublicPortfolioIndexes(kino, neighbor, results, KINO_NEIGHBOR_START);
  const output = path.join(root, "data/public-portfolios");
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, "kino.json"), `${JSON.stringify(indexes.kino, null, 2)}\n`);
  await fs.writeFile(path.join(output, "neighbor.json"), `${JSON.stringify(indexes.neighbor, null, 2)}\n`);
  return { kino: kino.length, neighbor: neighbor.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.VERCEL) throw new Error("Ejecuta el bootstrap fuera de Vercel.");
  console.log(await buildLocalPublicIndexes());
}
