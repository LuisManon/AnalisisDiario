import { z } from "zod";
import { kinoDrawSchema, kinoSnapshotSchema, type KinoDraw, type KinoSnapshot } from "./super-kino.ts";
import { isKinoNoDraw, kinoClock, kinoDrawMinutes } from "./super-kino-clock.ts";
import { KINO_NEIGHBOR_START, KINO_NEIGHBOR_VERSION } from "./super-kino-neighbor-schedule.ts";
export { KINO_NEIGHBOR_START, KINO_NEIGHBOR_VERSION } from "./super-kino-neighbor-schedule.ts";

export function neighborClose(date: string) { return new Date(`${date}T${new Date(`${date}T12:00:00Z`).getUTCDay() === 0 ? "15" : "20"}:55:00-04:00`).getTime(); }
export function neighborScheduled(date: string) { return date >= KINO_NEIGHBOR_START && !isKinoNoDraw(date); }
const numbers = z.array(z.number().int().min(1).max(84)).length(10).refine(n => new Set(n).size === 10);
const summarySchema = z.object({
  groups: z.array(z.object({ hits: z.number().int().min(0).max(10), amount: z.number().nonnegative(), count: z.number().int().positive(), total: z.number().nonnegative() })),
  total: z.number().nonnegative(), winningPlays: z.number().int().nonnegative(), maxHits: z.number().int().min(0).max(10), histogram: z.array(z.number().int().nonnegative()).length(11)
});
const baseSchema = z.object({
  version: z.literal(KINO_NEIGHBOR_VERSION), targetDate: z.iso.date(), generatedAt: z.iso.datetime(), seed: z.string().min(1),
  source: z.object({ generatedAt: z.iso.datetime(), algorithm: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  plays: z.array(z.object({ id: z.number().int().min(1).max(200), sourceNumbers: numbers, shifts: z.array(z.union([z.literal(-1), z.literal(1)])).length(10), numbers })).length(200),
  prizes: z.array(z.object({ hits: z.number().int().min(0).max(10), amount: z.number().nonnegative() })).length(7),
  prizeDrawNumbers: z.array(z.number().int().min(1).max(84)).length(20).refine(n => new Set(n).size === 20).optional(),
  prizeSummary: summarySchema.optional()
});
export type KinoNeighborSnapshot = z.infer<typeof baseSchema>;
export function evaluateNeighbor(snapshot: KinoNeighborSnapshot, winning: number[]) {
  const winners = new Set(winning), histogram = Array<number>(11).fill(0);
  const plays = snapshot.plays.map(play => {
    const matches = play.numbers.filter(n => winners.has(n)), hits = matches.length, prize = snapshot.prizes.find(p => p.hits === hits)?.amount ?? 0;
    histogram[hits]++; return { ...play, matches, hits, prize };
  });
  const groups = snapshot.prizes.flatMap(p => histogram[p.hits] && p.amount > 0 ? [{ hits: p.hits, amount: p.amount, count: histogram[p.hits], total: histogram[p.hits] * p.amount }] : []);
  return { plays, summary: { groups, total: groups.reduce((s, g) => s + g.total, 0), winningPlays: groups.reduce((s, g) => s + g.count, 0), maxHits: Math.max(...plays.map(p => p.hits)), histogram } };
}
export const kinoNeighborSchema = baseSchema.superRefine((s, ctx) => {
  const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
  if (!neighborScheduled(s.targetDate)) invalid("Fecha anterior al inicio de Super Kino TV ±1 o sin sorteo.");
  if (Date.parse(s.generatedAt) >= neighborClose(s.targetDate) || Date.parse(s.source.generatedAt) >= neighborClose(s.targetDate)) invalid("La cartera y su origen deben guardarse antes del cierre.");
  if (Date.parse(s.generatedAt) < Date.parse(s.source.generatedAt)) invalid("La variante no puede preceder a su origen.");
  if (new Set(s.plays.map(p => p.id)).size !== 200 || new Set(s.plays.map(p => [...p.numbers].sort((a, b) => a - b).join(","))).size !== 200) invalid("Se requieren 200 jugadas únicas y sus identificadores originales.");
  if (new Set(s.prizes.map(p => p.hits)).size !== s.prizes.length) invalid("Tabla de premios duplicada.");
  const originals = new Set(s.plays.map(p => [...p.sourceNumbers].sort((a, b) => a - b).join(",")));
  for (const p of s.plays) {
    const shifted = p.sourceNumbers.map((n, i) => n + p.shifts[i]).sort((a, b) => a - b);
    if (shifted.some(n => n < 1 || n > 84) || shifted.join(",") !== [...p.numbers].sort((a, b) => a - b).join(",")) invalid("Cada número debe desplazarse exactamente ±1, sin circularidad.");
    if (originals.has([...p.numbers].sort((a, b) => a - b).join(","))) invalid("La variante debe ser diferente de las jugadas originales.");
  }
  if (Boolean(s.prizeSummary) !== Boolean(s.prizeDrawNumbers)) invalid("El resultado y resumen deben congelarse juntos.");
  if (s.prizeDrawNumbers && s.prizeSummary && JSON.stringify(evaluateNeighbor(s, s.prizeDrawNumbers).summary) !== JSON.stringify(s.prizeSummary)) invalid("El premio congelado no corresponde a los aciertos exactos guardados.");
});
function seededRandom(seed: string) {
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
  return () => { state = (state + 0x6d2b79f5) >>> 0; let t = Math.imul(state ^ (state >>> 15), state | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function buildNeighborSnapshot(input: KinoSnapshot, sourceSha256: string, now = new Date()): KinoNeighborSnapshot {
  const source = kinoSnapshotSchema.parse(input);
  if (source.simulation || !neighborScheduled(source.targetDate) || source.plays.length !== 200 || now.getTime() >= neighborClose(source.targetDate)) throw new Error("No se puede crear esta cartera ±1 fuera de su ventana previa al sorteo.");
  const seed = `${KINO_NEIGHBOR_VERSION}/${source.targetDate}/${sourceSha256}`, random = seededRandom(seed);
  const seen = new Set(source.plays.map(p => [...p.numbers].sort((a, b) => a - b).join(",")));
  const plays = source.plays.map(play => {
    for (let attempt = 0; attempt < 512; attempt++) {
      const shifts: (-1 | 1)[] = play.numbers.map(n => n === 1 ? 1 : n === 84 ? -1 : random() < 0.5 ? -1 : 1);
      const shifted = play.numbers.map((n, i) => n + shifts[i]).sort((a, b) => a - b), key = shifted.join(",");
      if (new Set(shifted).size !== 10 || seen.has(key)) continue;
      seen.add(key); return { id: play.id, sourceNumbers: [...play.numbers], shifts, numbers: shifted };
    }
    throw new Error(`No se pudo construir una variante única para la jugada ${play.id}.`);
  });
  return kinoNeighborSchema.parse({ version: KINO_NEIGHBOR_VERSION, targetDate: source.targetDate, generatedAt: now.toISOString(), seed,
    source: { generatedAt: source.generatedAt, algorithm: source.algorithm, sha256: sourceSha256 }, plays, prizes: source.prizes });
}
export function freezeNeighborResult(snapshot: KinoNeighborSnapshot, results: KinoDraw[], now = new Date()) {
  if (snapshot.prizeSummary) return snapshot;
  const clock = kinoClock(now);
  if (snapshot.targetDate > clock.date || (snapshot.targetDate === clock.date && clock.minutes < kinoDrawMinutes(clock.date))) return snapshot;
  const result = results.find(r => r.date === snapshot.targetDate);
  if (!result) return snapshot;
  kinoDrawSchema.parse(result);
  return kinoNeighborSchema.parse({ ...snapshot, prizeDrawNumbers: [...result.numbers], prizeSummary: evaluateNeighbor(snapshot, result.numbers).summary });
}
export function neighborDayState(date: string, snapshot: Pick<KinoNeighborSnapshot, "prizeSummary"> | undefined, now = new Date()) {
  if (!neighborScheduled(date)) return { kind: "not-scheduled" as const, label: "Sin Resultados Programados" };
  if (snapshot?.prizeSummary) return { kind: "complete" as const, label: snapshot.prizeSummary.total > 0 ? "Resultado registrado" : "Sin premios" };
  const clock = kinoClock(now);
  if (snapshot) return { kind: "pending" as const, label: "Esperando resultado" };
  if (date < clock.date || (date === clock.date && now.getTime() >= neighborClose(date))) return { kind: "missing" as const, label: "Sin cartera guardada" };
  return { kind: "scheduled" as const, label: date === clock.date ? "Esperando cartera original" : "Programado" };
}
