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
export function kinoGroups(draws: KinoDraw[], allowedNumbers?: ReadonlySet<number>) {
  const ranked = kinoStats(draws)
    .filter(item => !allowedNumbers || allowedNumbers.has(item.number))
    .sort((a,b) => b.count-a.count || a.number-b.number);
  const hotSize = Math.ceil(ranked.length / 3);
  const middleSize = Math.ceil((ranked.length - hotSize) / 2);
  return {
    hot: ranked.slice(0, hotSize),
    middle: ranked.slice(hotSize, hotSize + middleSize),
    cold: ranked.slice(hotSize + middleSize).sort((a,b) => a.count-b.count || b.gap-a.gap || a.number-b.number)
  };
}
export const kinoProfiles = ["fuerte", "equilibrada", "exploratoria"] as const;
export type KinoProfile = typeof kinoProfiles[number];
export const kinoProfileLabels = { fuerte: "Fuertes", equilibrada: "Equilibradas", exploratoria: "Exploratorias" };
export const kinoPlaySchema = z.object({
  id: z.number().int().min(1).max(120),
  profile: z.enum(kinoProfiles),
  numbers: z.array(z.number().int().min(1).max(84)).length(10).refine(n => new Set(n).size === 10),
  hot: z.number().int(), middle: z.number().int(), cold: z.number().int(),
  quickHot: z.boolean().optional()
}).refine(p => p.hot + p.middle + p.cold === 10);
export type KinoPlay = z.infer<typeof kinoPlaySchema>;
export function kinoQuickHotStats(draws: KinoDraw[], allowedNumbers?: ReadonlySet<number>) {
  const ordered = [...draws].sort((a,b) => a.date.localeCompare(b.date));
  return kinoGroups(draws, allowedNumbers).hot.flatMap(item => {
    const appearances: number[] = [];
    ordered.forEach((draw, index) => { if (draw.numbers.includes(item.number)) appearances.push(index); });
    const recentIntervals = appearances.slice(1).map((index, previous) => index - appearances[previous]).slice(-3);
    if (recentIntervals.length < 3) return [];
    const averageInterval = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    return averageInterval >= 1 && averageInterval <= 2 ? [{number: item.number, averageInterval: Number(averageInterval.toFixed(2)), recentIntervals}] : [];
  }).sort((a,b) => a.averageInterval-b.averageInterval || a.number-b.number);
}
export function buildKinoPlays(draws: KinoDraw[], profile: KinoProfile = "exploratoria", allowedNumbers?: ReadonlySet<number>, count = 10, quickHotNumbers: readonly number[] = [], quickHotCount = 0) {
  if (!draws.length) return [];
  const groups = kinoGroups(draws, allowedNumbers);
  const quickHotSet = new Set(quickHotNumbers);
  const quickHotPool = groups.hot.filter(item => quickHotSet.has(item.number));
  const usage = new Map<number, number>();
  const seen = new Set<string>();
  return Array.from({length: count}, (_, index): KinoPlay => {
    const mix = profile === "fuerte" ? [7, 2, 1] : profile === "equilibrada" ? [4, 4, 2] : [3, 3, 4];
    const reinforced = index < quickHotCount;
    const pools = [reinforced ? quickHotPool : groups.hot, groups.middle, groups.cold];
    if (pools.some((pool, group) => pool.length < mix[group])) {
      throw new Error("Quedan muy pocos números elegibles para mantener la composición de las jugadas.");
    }
    let numbers: number[] = [];
    for (let attempt = 0; attempt < 240; attempt++) {
      numbers = [];
      pools.forEach((pool, group) => {
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
    return { id: index + 1, profile, numbers, hot: mix[0], middle: mix[1], cold: mix[2], ...(reinforced ? {quickHot: true} : {}) };
  });
}
const kinoQuickHotSchema = z.object({
  number: z.number().int().min(1).max(84),
  averageInterval: z.number().min(1).max(2),
  recentIntervals: z.array(z.number().int().positive()).length(3)
});
const kinoPrizeSummarySchema = z.object({
  groups: z.array(z.object({amount: z.number().nonnegative(), count: z.number().int().positive(), total: z.number().nonnegative()})),
  winningPlays: z.number().int().nonnegative(),
  total: z.number().nonnegative()
});
export const kinoSnapshotSchema = z.object({
  targetDate: z.iso.date(), generatedAt: z.iso.datetime(),
  analysisFrom: z.iso.date(), analysisTo: z.iso.date(), sampleSize: z.number().int().positive(),
  algorithm: z.enum(["kino-v2", "kino-v3", "kino-v4", "kino-v5"]),
  delayCutoff: z.iso.date().optional(),
  excludedByDelay: z.array(z.object({
    number: z.number().int().min(1).max(84),
    lastDate: z.iso.date().nullable()
  })).optional(),
  quickHotNumbers: kinoQuickHotSchema.array().optional(),
  prizeSummary: kinoPrizeSummarySchema.optional(),
  prizeDrawNumbers: z.array(z.number().int().min(1).max(84)).length(20).refine(numbers => new Set(numbers).size === 20).optional(),
  plays: kinoPlaySchema.array(),
  prizes: z.array(z.object({hits: z.number().int().min(0).max(10), amount: z.number().nonnegative()})).length(7)
}).superRefine((snapshot, ctx) => {
  if (snapshot.analysisFrom > snapshot.analysisTo || snapshot.analysisTo >= snapshot.targetDate) ctx.addIssue({code: "custom", message: "El análisis debe preceder al sorteo."});
  if (Boolean(snapshot.prizeSummary) !== Boolean(snapshot.prizeDrawNumbers)) ctx.addIssue({code: "custom", message: "El premio registrado requiere conservar también el resultado evaluado."});
  const deadline = new Date(`${snapshot.targetDate}T${new Date(`${snapshot.targetDate}T12:00:00Z`).getUTCDay() === 0 ? "15" : "20"}:55:00-04:00`);
  if (new Date(snapshot.generatedAt) >= deadline) ctx.addIssue({code: "custom", message: "No se admiten jugadas creadas después del cierre."});
  if (snapshot.algorithm === "kino-v5") {
    const ids = new Set(snapshot.plays.map(play => play.id));
    const quickHotNumbers = new Set(snapshot.quickHotNumbers?.map(item => item.number) ?? []);
    const reinforced = snapshot.plays.filter(play => play.quickHot);
    if (snapshot.plays.length !== 120 || snapshot.plays.some(play => play.profile !== "exploratoria" || play.hot !== 3 || play.middle !== 3 || play.cold !== 4)) ctx.addIssue({code: "custom", message: "Kino v5 requiere 120 jugadas exploratorias 3/3/4."});
    if (ids.size !== 120 || snapshot.plays.some(play => play.id < 1 || play.id > 120)) ctx.addIssue({code: "custom", message: "Kino v5 requiere identificadores del 1 al 120."});
    if (quickHotNumbers.size < 3 || quickHotNumbers.size !== (snapshot.quickHotNumbers?.length ?? 0)) ctx.addIssue({code: "custom", message: "Kino v5 requiere al menos tres calientes rápidos distintos."});
    if (reinforced.length < 30 || reinforced.some(play => play.numbers.filter(number => quickHotNumbers.has(number)).length !== 3)) ctx.addIssue({code: "custom", message: "Kino v5 requiere al menos 30 jugadas reforzadas con tres calientes rápidos."});
  } else if (snapshot.algorithm === "kino-v4") {
    const ids = new Set(snapshot.plays.map(play => play.id));
    if (snapshot.plays.length !== 30) ctx.addIssue({code: "custom", message: "Kino v4 requiere 30 jugadas."});
    if (snapshot.plays.some(play => play.profile !== "exploratoria" || play.hot !== 3 || play.middle !== 3 || play.cold !== 4)) ctx.addIssue({code: "custom", message: "Kino v4 requiere 30 jugadas exploratorias 3/3/4."});
    if (ids.size !== 30 || snapshot.plays.some(play => play.id < 1 || play.id > 30)) ctx.addIssue({code: "custom", message: "Kino v4 requiere identificadores del 1 al 30."});
  } else {
    for (const profile of kinoProfiles) {
      const plays = snapshot.plays.filter(p => p.profile === profile);
      if (plays.length !== 10 || new Set(plays.map(p => p.id)).size !== 10 || plays.some(play => play.id > 10)) ctx.addIssue({code: "custom", message: "Cada perfil requiere 10 jugadas."});
    }
  }
  if (new Set(snapshot.plays.map(p => p.numbers.join(","))).size !== snapshot.plays.length) ctx.addIssue({code: "custom", message: "Hay jugadas duplicadas."});
  if (snapshot.algorithm === "kino-v3" || snapshot.algorithm === "kino-v4" || snapshot.algorithm === "kino-v5") {
    if (!snapshot.delayCutoff || !snapshot.excludedByDelay) ctx.addIssue({code: "custom", message: "Falta el filtro de atraso de un mes."});
    if (snapshot.delayCutoff && snapshot.delayCutoff !== kinoOneMonthCutoff(snapshot.targetDate)) ctx.addIssue({code: "custom", message: "El corte de atraso no corresponde al sorteo."});
    const excluded = new Set(snapshot.excludedByDelay?.map(item => item.number) ?? []);
    if (excluded.size !== (snapshot.excludedByDelay?.length ?? 0)) ctx.addIssue({code: "custom", message: "Hay números excluidos repetidos."});
    if (snapshot.delayCutoff && snapshot.excludedByDelay?.some(item => item.lastDate !== null && item.lastDate >= snapshot.delayCutoff!)) ctx.addIssue({code: "custom", message: "Un número excluido no supera el mes de atraso."});
    if (snapshot.plays.some(play => play.numbers.some(number => excluded.has(number)))) ctx.addIssue({code: "custom", message: "Una jugada contiene un número excluido por atraso."});
  }
});
export type KinoSnapshot = z.infer<typeof kinoSnapshotSchema>;

export function formatKinoPortfolioText(snapshot: KinoSnapshot) {
  const quickNumbers = snapshot.quickHotNumbers?.map(item => `${String(item.number).padStart(2,"0")} (${item.averageInterval.toFixed(2)})`).join(", ") ?? "No aplica";
  return [
    `SUPER KINO TV · ${snapshot.plays.length} JUGADAS EXPLORATORIAS`,
    `Sorteo: ${snapshot.targetDate}`,
    `Base histórica: ${snapshot.analysisFrom} a ${snapshot.analysisTo} (${snapshot.sampleSize} sorteos)`,
    "Composición: 3 calientes · 3 intermedios · 4 fríos",
    `Calientes rápidos · promedio de los 3 intervalos recientes: ${quickNumbers}`,
    `[RÁPIDA 1–2] identifica las ${snapshot.plays.filter(play => play.quickHot).length} jugadas reforzadas.`,
    "",
    ...snapshot.plays.map(play => `${String(play.id).padStart(3,"0")} ${play.quickHot ? "[RÁPIDA 1–2]" : "[EXPLORATORIA]"} ${play.numbers.map(number => String(number).padStart(2,"0")).join(" ")}`)
  ].join("\n");
}

export function kinoOneMonthCutoff(targetDate: string) {
  const value = new Date(`${targetDate}T12:00:00Z`);
  const targetDay = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() - 1);
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(targetDay, lastDay));
  return value.toISOString().slice(0, 10);
}

export function getKinoStaleNumbers(draws: KinoDraw[], targetDate: string) {
  const cutoff = kinoOneMonthCutoff(targetDate);
  const prior = draws.filter(draw => draw.date < targetDate).sort((a,b) => b.date.localeCompare(a.date));
  return Array.from({length: 84}, (_, index) => {
    const number = index + 1;
    return {number, lastDate: prior.find(draw => draw.numbers.includes(number))?.date ?? null};
  }).filter(item => item.lastDate === null || item.lastDate < cutoff);
}

export function buildKinoSnapshot(draws: KinoDraw[], targetDate: string, now = new Date()): KinoSnapshot {
  const sample = draws.filter(d => d.date >= KINO_ANALYSIS_START && d.date < targetDate).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
  if (!sample.length) throw new Error("No hay historial anterior suficiente para generar las jugadas.");
  const delayCutoff = kinoOneMonthCutoff(targetDate);
  const excludedByDelay = getKinoStaleNumbers(draws, targetDate);
  const excluded = new Set(excludedByDelay.map(item => item.number));
  const allowedNumbers = new Set(Array.from({length: 84}, (_, index) => index + 1).filter(number => !excluded.has(number)));
  const quickHotNumbers = kinoQuickHotStats(sample, allowedNumbers);
  if (quickHotNumbers.length < 3) throw new Error("No hay al menos tres números calientes con recurrencia reciente media de 1 a 2 sorteos.");
  return kinoSnapshotSchema.parse({
    targetDate, generatedAt: now.toISOString(), analysisFrom: sample.at(-1)!.date, analysisTo: sample[0].date,
    sampleSize: sample.length, algorithm: "kino-v5", delayCutoff, excludedByDelay, quickHotNumbers, prizes: kinoPrizes,
    plays: buildKinoPlays(sample, "exploratoria", allowedNumbers, 120, quickHotNumbers.map(item => item.number), 30)
  });
}
export function evaluateKinoSnapshot(snapshot: KinoSnapshot, draw: KinoDraw) {
  if (draw.date !== snapshot.targetDate) throw new Error("El resultado no corresponde a las jugadas guardadas.");
  return kinoProfiles.filter(profile => snapshot.plays.some(play => play.profile === profile)).map(profile => {
    const plays = snapshot.plays.filter(p => p.profile === profile).map(play => {
      const matches = play.numbers.filter(n => draw.numbers.includes(n));
      return {...play, matches, hits: matches.length, prize: snapshot.prizes.find(p => p.hits === matches.length)?.amount ?? 0};
    });
    const total = plays.reduce((sum, p) => sum + p.prize, 0);
    const cost = plays.length * 25;
    return {profile, plays, total, cost, net: total - cost, winners: plays.filter(p => p.prize > 0).length};
  });
}
export function summarizeKinoPrizes(snapshot: KinoSnapshot, draw: KinoDraw) {
  const winningPlays = evaluateKinoSnapshot(snapshot, draw).flatMap(evaluation => evaluation.plays).filter(play => play.prize > 0);
  const groups = [...new Set(winningPlays.map(play => play.prize))].sort((a,b) => b-a).map(amount => {
    const count = winningPlays.filter(play => play.prize === amount).length;
    return {amount, count, total: amount * count};
  });
  return {groups, winningPlays: winningPlays.length, total: groups.reduce((sum, group) => sum + group.total, 0)};
}
export function freezeKinoPrizeSummaries(snapshots: KinoSnapshot[], draws: KinoDraw[]) {
  return snapshots.map(snapshot => {
    if (snapshot.prizeSummary && snapshot.prizeDrawNumbers) return snapshot;
    const draw = draws.find(item => item.date === snapshot.targetDate);
    return draw ? {...snapshot, prizeSummary: summarizeKinoPrizes(snapshot, draw), prizeDrawNumbers: [...draw.numbers]} : snapshot;
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
