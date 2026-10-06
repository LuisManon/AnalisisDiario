import { z } from "zod";

export const KINO_OFFICIAL = "https://www.leidsa.com/play/draw/leidsa-kinotv";
// First observed draw containing 81–84 in the imported archive; not an official rule-change date.
export const KINO_ANALYSIS_START = "2026-09-15";
export const kinoDrawSchema = z.object({
  date: z.iso.date(),
  numbers: z.array(z.number().int().min(1).max(84)).length(20).refine(n => new Set(n).size === 20, "Números repetidos"),
  source: z.url()
});
export type KinoDraw = z.infer<typeof kinoDrawSchema>;
export const kinoPrizes = [{hits:10,amount:25000000},{hits:9,amount:200000},{hits:8,amount:10000},{hits:7,amount:1000},{hits:6,amount:300},{hits:5,amount:60},{hits:0,amount:80}];
export function kinoPrize(hits: number) { return kinoPrizes.find(p => p.hits === hits)?.amount ?? 0; }
export function kinoStats(draws: KinoDraw[]) {
  const ordered = [...draws].sort((a,b) => b.date.localeCompare(a.date));
  return Array.from({length:84}, (_,i) => {
    const number = i+1;
    const appearances = ordered.filter(d => d.numbers.includes(number));
    const gap = ordered.findIndex(d => d.numbers.includes(number));
    return {number, count:appearances.length, percent:ordered.length ? appearances.length / ordered.length * 100 : 0, gap:gap < 0 ? ordered.length : gap, lastDate:appearances[0]?.date ?? null};
  });
}
export function kinoGroups(draws: KinoDraw[]) {
  const ranked = kinoStats(draws).sort((a,b) => b.count-a.count || a.number-b.number);
  return { hot:ranked.slice(0,28), middle:ranked.slice(28,56), cold:ranked.slice(56).sort((a,b) => a.count-b.count || b.gap-a.gap || a.number-b.number) };
}
export const kinoProfiles = ["fuerte", "equilibrada", "exploratoria"] as const;
export type KinoProfile = typeof kinoProfiles[number];
export const kinoProfileLabels = { fuerte: "Fuertes", equilibrada: "Equilibradas", exploratoria: "Exploratorias" };
export const kinoPlaySchema = z.object({
  id: z.number().int().min(1).max(10),
  profile: z.enum(kinoProfiles),
  numbers: z.array(z.number().int().min(1).max(84)).length(10).refine(n => new Set(n).size === 10),
  hot: z.number().int(), middle: z.number().int(), cold: z.number().int()
}).refine(p => p.hot + p.middle + p.cold === 10);
export type KinoPlay = z.infer<typeof kinoPlaySchema>;
export function buildKinoPlays(draws: KinoDraw[], profile: KinoProfile = "exploratoria") {
  if (!draws.length) return [];
  const groups = kinoGroups(draws);
  const usage = new Map<number, number>();
  const seen = new Set<string>();
  return Array.from({length: 10}, (_, index): KinoPlay => {
    const mix = profile === "fuerte" ? [7, 2, 1] : profile === "equilibrada" ? [4, 4, 2] : [3, 3, 4];
    let numbers: number[] = [];
    for (let attempt = 0; attempt < 84; attempt++) {
      numbers = [];
      [groups.hot, groups.middle, groups.cold].forEach((pool, group) => {
        const rotated = pool.map((_, i) => pool[(i + index * 5 + attempt) % pool.length]);
        rotated.sort((a, b) => (usage.get(a.number) ?? 0) - (usage.get(b.number) ?? 0));
        numbers.push(...rotated.slice(0, mix[group]).map(x => x.number));
      });
      numbers.sort((a, b) => a - b);
      if (!seen.has(numbers.join(","))) break;
    }
    if (seen.has(numbers.join(","))) throw new Error("No se pudieron diversificar las jugadas.");
    seen.add(numbers.join(","));
    numbers.forEach(n => usage.set(n, (usage.get(n) ?? 0) + 1));
    return { id: index + 1, profile, numbers, hot: mix[0], middle: mix[1], cold: mix[2] };
  });
}
export const kinoSnapshotSchema = z.object({
  targetDate: z.iso.date(), generatedAt: z.iso.datetime(),
  analysisFrom: z.iso.date(), analysisTo: z.iso.date(), sampleSize: z.number().int().positive(),
  algorithm: z.literal("kino-v2"),
  plays: kinoPlaySchema.array().length(30),
  prizes: z.array(z.object({hits: z.number().int().min(0).max(10), amount: z.number().nonnegative()})).length(7)
}).superRefine((snapshot, ctx) => {
  if (snapshot.analysisFrom > snapshot.analysisTo || snapshot.analysisTo >= snapshot.targetDate) ctx.addIssue({code: "custom", message: "El análisis debe preceder al sorteo."});
  const deadline = new Date(`${snapshot.targetDate}T${new Date(`${snapshot.targetDate}T12:00:00Z`).getUTCDay() === 0 ? "15" : "20"}:55:00-04:00`);
  if (new Date(snapshot.generatedAt) >= deadline) ctx.addIssue({code: "custom", message: "No se admiten jugadas creadas después del cierre."});
  for (const profile of kinoProfiles) {
    const plays = snapshot.plays.filter(p => p.profile === profile);
    if (plays.length !== 10 || new Set(plays.map(p => p.id)).size !== 10) ctx.addIssue({code: "custom", message: "Cada perfil requiere 10 jugadas."});
  }
  if (new Set(snapshot.plays.map(p => p.numbers.join(","))).size !== 30) ctx.addIssue({code: "custom", message: "Hay jugadas duplicadas."});
});
export type KinoSnapshot = z.infer<typeof kinoSnapshotSchema>;
export function buildKinoSnapshot(draws: KinoDraw[], targetDate: string, now = new Date()): KinoSnapshot {
  const sample = draws.filter(d => d.date >= KINO_ANALYSIS_START && d.date < targetDate).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
  if (!sample.length) throw new Error("No hay historial anterior suficiente para generar las jugadas.");
  return kinoSnapshotSchema.parse({
    targetDate, generatedAt: now.toISOString(), analysisFrom: sample.at(-1)!.date, analysisTo: sample[0].date,
    sampleSize: sample.length, algorithm: "kino-v2", prizes: kinoPrizes,
    plays: kinoProfiles.flatMap(profile => buildKinoPlays(sample, profile))
  });
}
export function evaluateKinoSnapshot(snapshot: KinoSnapshot, draw: KinoDraw) {
  if (draw.date !== snapshot.targetDate) throw new Error("El resultado no corresponde a las jugadas guardadas.");
  return kinoProfiles.map(profile => {
    const plays = snapshot.plays.filter(p => p.profile === profile).map(play => {
      const matches = play.numbers.filter(n => draw.numbers.includes(n));
      return {...play, matches, hits: matches.length, prize: snapshot.prizes.find(p => p.hits === matches.length)?.amount ?? 0};
    });
    const total = plays.reduce((sum, p) => sum + p.prize, 0);
    return {profile, plays, total, cost: 250, net: total - 250, winners: plays.filter(p => p.prize > 0).length};
  });
}
export function parseKinoArchive(html: string, source: string): KinoDraw[] {
  const draws: KinoDraw[] = [];
  for (const [,row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    if (!row.includes("lad-t-kino")) continue;
    const date = row.match(/\/resultados\/(\d{4}-\d{2}-\d{2})\//)?.[1];
    const numbers = [...row.matchAll(/<span class="b">\s*(\d{1,2})\s*<\/span>/g)].map(m=>Number(m[1]));
    const parsed = kinoDrawSchema.safeParse({date,numbers,source});
    if (!parsed.success) throw new Error("El archivo Kino contiene un resultado inválido.");
    draws.push(parsed.data);
  }
  if (!draws.length) throw new Error("La fuente no devolvió resultados de Super Kino TV.");
  return draws;
}
