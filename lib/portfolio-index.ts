import { createHash } from "node:crypto";
import { z } from "zod";
import { kinoSnapshotSchema, type KinoDraw, type KinoSnapshot } from "./super-kino.ts";
import { kinoNeighborSchema, type KinoNeighborSnapshot } from "./super-kino-neighbor.ts";
import { compactKinoPortfolio, compactNeighborPortfolio } from "./portfolio-view.ts";

const date = z.iso.date();
const common = { version: z.literal(1), sourceVersion: z.string().regex(/^[a-f0-9]{64}$/) };
export const kinoPublicIndexSchema = z.object({ ...common, latestDate: date.nullable(), snapshots: z.array(z.object({
  targetDate: date, prizes: kinoSnapshotSchema.shape.prizes,
  prizeSummary: kinoSnapshotSchema.shape.prizeSummary, simulation: kinoSnapshotSchema.shape.simulation
})) });
export const neighborPublicIndexSchema = z.object({ ...common, startDate: date, snapshots: z.array(z.object({
  targetDate: date, playCount: z.number().int().positive(), prizeSummary: kinoNeighborSchema.shape.prizeSummary
})) });
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Pure projection of saved records; never generates or freezes a portfolio. */
export function buildPublicPortfolioIndexes(kino: KinoSnapshot[], neighbor: KinoNeighborSnapshot[], results: KinoDraw[], startDate: string) {
  const sorted = [...kino].sort((a,b) => b.targetDate.localeCompare(a.targetDate));
  const sortedNeighbor = [...neighbor].sort((a,b) => b.targetDate.localeCompare(a.targetDate));
  const compact = compactKinoPortfolio({ current: null, snapshots: sorted }, results);
  const compactNeighbor = compactNeighborPortfolio({ current: null, snapshots: sortedNeighbor, startDate });
  return {
    kino: kinoPublicIndexSchema.parse({ version: 1, sourceVersion: hash({ kino: sorted, results: [...results].sort((a,b) => b.date.localeCompare(a.date)) }), latestDate: compact.latest?.targetDate ?? null, snapshots: compact.snapshots }),
    neighbor: neighborPublicIndexSchema.parse({ version: 1, sourceVersion: hash(sortedNeighbor), startDate, snapshots: compactNeighbor.snapshots })
  };
}

type IndexStorage = { read: (file: string) => Promise<string | null>; write: (file: string, content: string, previous: string | null) => Promise<void> };
export function createPublicIndexStore(storage: IndexStorage) {
  const files = { kino: "data/public-portfolios/kino.json", neighbor: "data/public-portfolios/neighbor.json" } as const;
  return {
    async readKino() {
      const raw = await storage.read(files.kino);
      if (raw === null) throw new Error("El índice de Kino aún no está publicado por la automatización.");
      return kinoPublicIndexSchema.parse(JSON.parse(raw));
    },
    async readNeighbor() {
      const raw = await storage.read(files.neighbor);
      if (raw === null) throw new Error("El índice ±1 aún no está publicado por la automatización.");
      return neighborPublicIndexSchema.parse(JSON.parse(raw));
    },
    async publish(indexes: ReturnType<typeof buildPublicPortfolioIndexes>) {
      for (const kind of ["kino", "neighbor"] as const) {
        const file = files[kind], previous = await storage.read(file);
        const content = `${JSON.stringify(indexes[kind], null, 2)}\n`;
        if (previous !== content) await storage.write(file, content, previous);
      }
    }
  };
}
