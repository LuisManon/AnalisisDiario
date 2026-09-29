import type { LaPrimeraSession } from "./types";
export type AssignmentNumber = { number: number; source: "casa" | "respaldo"; badge: string; winner: boolean };
export type Assignment = { date: string; session: LaPrimeraSession; smart: boolean; investors: AssignmentNumber[][]; excluded: number; priorCount: number; mixed: boolean; createdAt: string };
export function subtractMonths(date: string, months: number) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() - months);
  value.setUTCDate(Math.min(day, new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate()));
  return value.toISOString().slice(0, 10);
}
export function shiftDate(date: string, days: number) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function nextAssignmentSlot(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { date: minutes >= 1140 ? shiftDate(date, 1) : date, session: (minutes < 720 || minutes >= 1140 ? "dia" : "noche") as LaPrimeraSession };
}
export function previousSlot(slot: { date: string; session: LaPrimeraSession }) { return { date: slot.session === "dia" ? shiftDate(slot.date, -1) : slot.date, session: (slot.session === "dia" ? "noche" : "dia") as LaPrimeraSession }; }
function hash(value: string) { let h = 2166136261; for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; }
// Bipartite matching with capacity slots: hard exclusion of each investor's previous two draws.
export function distribute(pool: AssignmentNumber[], previous: Assignment[], smart: boolean, seed: string) {
  const blocked = Array.from({ length: 4 }, (_, i) => new Set(previous.flatMap(p => p.investors[i].map(n => n.number))));
  const pairs = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].sort((a,b) => hash(seed+a.join())-hash(seed+b.join()));
  function match(capacities: number[], housePair?: number[]) {
    const slots = capacities.flatMap((count, investor) => Array.from({length: count}, () => investor));
    const owners = slots.map(() => -1);
    function place(index: number, visited: Set<number>): boolean {
      const item = pool[index];
      const candidates = slots.map((investor, slot) => ({investor, slot})).filter(({investor}) => !blocked[investor].has(item.number) && (!housePair || housePair.includes(investor) === (item.source === "casa"))).sort((a,b) => hash(`${seed}:${item.number}:${a.slot}`)-hash(`${seed}:${item.number}:${b.slot}`));
      for (const {slot} of candidates) { if (visited.has(slot)) continue; visited.add(slot); if (owners[slot] === -1 || place(owners[slot], visited)) { owners[slot] = index; return true; } }
      return false;
    }
    for (let i=0; i<pool.length; i++) if (!place(i, new Set())) return null;
    const output: AssignmentNumber[][] = [[],[],[],[]];
    owners.forEach((owner, slot) => { if (owner >= 0) output[slots[slot]].push(pool[owner]); });
    output.forEach(items => items.sort((a,b) => pool.indexOf(a)-pool.indexOf(b)));
    return output;
  }
  if (!smart && pool.length === 80 && pool.filter(n => n.source === "casa").length === 40) {
    const casa = pool.filter(n => n.source === "casa"), respaldo = pool.filter(n => n.source === "respaldo");
    const blocks = [casa.slice(0,20), casa.slice(20), respaldo.slice(0,20), respaldo.slice(20)];
    if (previous.length === 0) return {investors: blocks, mixed:false};
    for (const pair of pairs) {
      const others = [0,1,2,3].filter(i => !pair.includes(i));
      for (const house of [pair,[...pair].reverse()]) for (const reserve of [others,[...others].reverse()]) {
        const order = [...house,...reserve];
        if (blocks.every((block,b) => block.every(n => !blocked[order[b]].has(n.number)))) {
          const investors: AssignmentNumber[][] = [[],[],[],[]];
          blocks.forEach((block,b) => { investors[order[b]] = block; });
          return {investors,mixed:false};
        }
      }
    }
    // Never silently break the no-repeat rule to keep the original group split.
    throw new Error("No es posible mantener 20 de Casa / 20 de Respaldo sin repetir las dos tandas anteriores. Activa Repartidor inteligente para permitir mezclar los grupos.");
  }
  const order = [0,1,2,3].sort((a,b) => hash(seed+a)-hash(seed+b));
  // Try every balanced capacity permutation, as a remainder may constrain a particular investor.
  for (let mask=0; mask<16; mask++) {
    if (mask.toString(2).replaceAll("0", "").length !== pool.length%4) continue;
    const capacities = Array(4).fill(Math.floor(pool.length/4));
    order.forEach((investor,i) => { if (mask & (1<<i)) capacities[investor]++; });
    const investors = match(capacities);
    if (investors) return {investors, mixed: true};
  }
  throw new Error("No hay un reparto equilibrado que evite las dos tandas anteriores con estos números. Se conserva el reparto guardado; no se han forzado repeticiones.");
}
