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
export function buildKinoPlays(draws: KinoDraw[]) {
  if (!draws.length) return [];
  const groups = kinoGroups(draws);
  const usage = new Map<number,number>();
  return Array.from({length:10}, (_,index) => {
    const mix = index % 3 === 0 ? [4,3,3] : index % 3 === 1 ? [3,3,4] : [3,4,3];
    const numbers: number[] = [];
    [groups.hot,groups.middle,groups.cold].forEach((pool,group) => {
      const rotated = pool.map((_,i) => pool[(i+index*5)%pool.length]);
      rotated.sort((a,b) => (usage.get(a.number)??0)-(usage.get(b.number)??0));
      numbers.push(...rotated.slice(0,mix[group]).map(x=>x.number));
    });
    numbers.forEach(n=>usage.set(n,(usage.get(n)??0)+1));
    return {id:index+1,numbers:numbers.sort((a,b)=>a-b),hot:mix[0],middle:mix[1],cold:mix[2]};
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
