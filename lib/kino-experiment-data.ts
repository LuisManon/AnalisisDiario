import { createHash } from "node:crypto";
import { z } from "zod";
import { KINO_ANALYSIS_START, kinoDrawSchema, type KinoDraw } from "./super-kino.ts";

export type KinoExperimentDataOptions = {
  cutoff: string;
  warmup?: number;
  validationCount?: number;
};

/** Immutable-by-convention research snapshot; never writes to production storage. */
export function prepareKinoExperimentData(input: unknown, options: KinoExperimentDataOptions) {
  const cutoff = z.iso.date().parse(options.cutoff);
  if (cutoff < KINO_ANALYSIS_START) throw new Error("Cutoff anterior al período de 84 números");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (cutoff > today) throw new Error("Cutoff futuro: el banco histórico requiere una fecha ya alcanzada");
  const warmupCount = z.number().int().min(1).parse(options.warmup ?? 30);
  const validationCount = z.number().int().min(1).parse(options.validationCount ?? 10);
  // Validate the entire input, including excluded records, instead of hiding malformed history.
  const parsed = kinoDrawSchema.array().parse(input);
  const seen = new Set<string>();
  for (const draw of parsed) {
    if (seen.has(draw.date)) throw new Error(`Fecha duplicada: ${draw.date}`);
    seen.add(draw.date);
  }
  const draws = parsed.filter(draw => draw.date >= KINO_ANALYSIS_START && draw.date <= cutoff)
    .map(draw => ({ date: draw.date, numbers: [...draw.numbers].sort((a, b) => a - b), source: draw.source }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (draws.length - warmupCount - validationCount < 5) {
    throw new Error("Se requieren al menos 5 sorteos reservados después de calentamiento y validación");
  }
  const warmup = draws.slice(0, warmupCount);
  const validation = draws.slice(warmupCount, warmupCount + validationCount);
  const holdout = draws.slice(warmupCount + validationCount);
  const sha256 = createHash("sha256").update(JSON.stringify(draws)).digest("hex");
  return {
    draws, warmup, validation, holdout, sha256,
    metadata: {
      analysisStart: KINO_ANALYSIS_START, cutoff, drawCount: draws.length,
      warmupCount, validationCount, holdoutCount: holdout.length,
      firstDate: draws[0].date, lastDate: draws[draws.length - 1].date,
    },
    dates: {
      warmup: warmup.map(draw => draw.date),
      validation: validation.map(draw => draw.date),
      holdout: holdout.map(draw => draw.date),
    },
  };
}

export type KinoExperimentData = ReturnType<typeof prepareKinoExperimentData>;

/** Walk-forward information set: excludes the target itself and every future result. */
export function priorDraws(data: KinoExperimentData, targetDate: string): KinoDraw[] {
  z.iso.date().parse(targetDate);
  if (targetDate > data.metadata.cutoff) throw new Error("Fecha objetivo posterior al cutoff del experimento");
  return data.draws.filter(draw => draw.date < targetDate)
    .map(draw => ({ ...draw, numbers: [...draw.numbers] }));
}
