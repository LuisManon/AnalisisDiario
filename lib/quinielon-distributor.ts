import type { LaPrimeraDraw, LaPrimeraSession } from "./types";
export type AssignmentNumber = { number: number; source: "casa" | "respaldo"; badge: string; winner: boolean };
export type Assignment = { date: string; session: LaPrimeraSession; smart: boolean; investors: AssignmentNumber[][]; excluded: number; priorCount: number; mixed: boolean; createdAt: string; roster?: Array<{number:number; group: "nosotros" | "inversionistas" | "banca"}>; blockStarts?: number[]; algorithmVersion?: string };
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
export type AssignmentSessionChoice = "auto" | LaPrimeraSession;
export function selectedAssignmentSlot(choice: AssignmentSessionChoice = "auto", now = new Date()) {
  const next = nextAssignmentSlot(now);
  if (choice === "auto" || choice === next.session) return next;
  return { date: next.session === "noche" ? shiftDate(next.date, 1) : next.date, session: choice };
}
export function followingSlot(slot: { date: string; session: LaPrimeraSession }) {
  return { date: slot.session === "noche" ? shiftDate(slot.date, 1) : slot.date, session: (slot.session === "dia" ? "noche" : "dia") as LaPrimeraSession };
}
export function previousSlot(slot: { date: string; session: LaPrimeraSession }) { return { date: slot.session === "dia" ? shiftDate(slot.date, -1) : slot.date, session: (slot.session === "dia" ? "noche" : "dia") as LaPrimeraSession }; }
export const blockRotationVersion = "blocks-v1";
export function rotateBlocks(pool: AssignmentNumber[], slot: { date: string; session: LaPrimeraSession }) {
  if (pool.length !== 80 || new Set(pool.map(n => n.number)).size !== 80) throw new Error("Se necesitan 80 números distintos para repartir cuatro bloques de 20.");
  const cycle = [0, 2, 1, 3]; // 1–20 → 41–60 → 21–40 → 61–80
  const days = Math.round((Date.parse(`${slot.date}T00:00:00Z`) - Date.parse("2026-09-29T00:00:00Z")) / 86_400_000);
  if (!Number.isFinite(days)) throw new Error("Fecha de reparto inválida.");
  const turn = days * 2 + (slot.session === "noche" ? 1 : 0);
  const blockIndexes = [0,1,2,3].map(initial => cycle[((cycle.indexOf(initial) + turn) % 4 + 4) % 4]);
  return { investors: blockIndexes.map(block => pool.slice(block * 20, block * 20 + 20)), mixed: false,
    blockStarts: blockIndexes.map(block => block * 20 + 1), algorithmVersion: blockRotationVersion };
}
function hash(value: string) { let h = 2166136261; for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; }
// Bipartite matching with capacity slots: hard exclusion of each investor's previous two draws.
export function distribute(pool: AssignmentNumber[], previous: Assignment[], smart: boolean, seed: string) {
  const blocked = Array.from({ length: 4 }, (_, i) => new Set(previous.flatMap(p => p.investors[i].map(n => n.number))));
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

export function assignmentDeadline(slot: {date:string; session:LaPrimeraSession}) {
  return Date.parse(`${slot.date}T${slot.session === "dia" ? "12" : "19"}:00:00-04:00`);
}
export function validateAssignment(assignment: Assignment): string | null {
  if (!assignment || !Array.isArray(assignment.investors) || assignment.investors.length !== 4 || assignment.investors.some(items => !Array.isArray(items))) return "Reparto incompleto";
  if (!["dia","noche"].includes(assignment.session) || !Number.isFinite(assignmentDeadline(assignment)) || !Number.isFinite(Date.parse(assignment.createdAt)) || Date.parse(assignment.createdAt) >= assignmentDeadline(assignment)) return "Reparto fuera de la tanda";
  const items=assignment.investors.flat();
  if(items.some(item => !item || !Number.isInteger(item.number) || item.number<0 || item.number>99 || !["casa","respaldo"].includes(item.source))) return "Número o grupo inválido";
  if(new Set(items.map(item=>item.number)).size !== items.length) return "Número asignado más de una vez";
  const sizes=assignment.investors.map(items=>items.length);
  if(assignment.smart ? items.length>80 || Math.max(...sizes)-Math.min(...sizes)>1 || items.some(item=>Boolean(item.badge)) : sizes.some(size=>size!==20)) return "Cantidades o filtros inconsistentes";
  if(assignment.roster) {
    const roster=assignment.roster;
    if(roster.length!==100 || new Set(roster.map(item=>item.number)).size!==100 || roster.some(item=>!Number.isInteger(item.number)||item.number<0||item.number>99||!["nosotros","inversionistas","banca"].includes(item.group))) return "Clasificación incompleta";
    if(roster.filter(item=>item.group!=="banca").length!==80) return "Clasificación fuera del top 80";
    if(items.some(item=>roster.find(entry=>entry.number===item.number)?.group !== (item.source==="casa"?"nosotros":"inversionistas"))) return "El grupo no coincide con la clasificación guardada";
  }
  if(!assignment.smart && assignment.blockStarts) {
    if(assignment.blockStarts.length!==4 || [...assignment.blockStarts].sort((a,b)=>a-b).join()!=="1,21,41,61") return "Bloques inválidos";
    if(assignment.investors.some((items,i)=>items.some(item=>item.source!==(assignment.blockStarts![i]<=21?"casa":"respaldo")))) return "El grupo no coincide con su bloque";
  }
  return null;
}

export const investorNames = ["Lenin", "Seibo", "Victor", "Jose Luis"] as const;
export const investorWinnerStartDate = "2026-09-29";
export type InvestorWinner = { number: number; name: string | null; recorded: boolean; validationError?: string; group: "nosotros" | "inversionistas" | "banca" | null };
export function resolveInvestorWinner(draw: LaPrimeraDraw, assignment: Assignment | null): InvestorWinner | null {
  if (draw.date < investorWinnerStartDate) return null;
  const recorded = Boolean(assignment && assignment.date === draw.date && assignment.session === draw.session);
  const validationError = recorded ? validateAssignment(assignment!) : null;
  if(validationError) return {number:draw.number,name:null,recorded:true,group:null,validationError};
  const index = recorded ? assignment!.investors.findIndex(numbers => numbers.some(item => item.number === draw.number)) : -1;
  const item = index >= 0 ? assignment!.investors[index].find(item => item.number === draw.number) : undefined;
  const group = item ? (item.source === "casa" ? "nosotros" : "inversionistas") : recorded ? assignment!.roster?.find(entry=>entry.number===draw.number)?.group ?? (!assignment!.smart ? "banca" : null) : null;
  return {number:draw.number, name:index >= 0 ? investorNames[index] : null, recorded, group};
}
