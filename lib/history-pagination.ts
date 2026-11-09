import type { LaPrimeraDraw, LaPrimeraFilter } from "./types.ts";

export const HISTORY_PAGE_SIZE = 5;

export function groupQuinielonHistory(results: LaPrimeraDraw[], session: LaPrimeraFilter = "todos", date = "", number = "") {
  const groups = new Map<string, LaPrimeraDraw[]>();
  for (const draw of results) {
    if (date && draw.date !== date) continue;
    const group = groups.get(draw.date) ?? [];
    group.push(draw);
    groups.set(draw.date, group);
  }
  const query = number.trim();
  return [...groups].sort(([a], [b]) => b.localeCompare(a)).filter(([, draws]) =>
    draws.some(draw => (session === "todos" || draw.session === session) &&
      (!query || (/^\d{1,2}$/.test(query) && draw.number === Number(query))))
  ).map(([date, draws]) => ({ date, draws }));
}
