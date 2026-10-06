import type { LaPrimeraDraw, LaPrimeraSession } from "./types";
export type DelayBadge = "" | "❄️" | "🧊";
export type AssignmentTier = "hot" | "intermediate" | "remaining";
export const tierLabels: Record<AssignmentTier, string> = { hot: "🔥 Caliente", intermediate: "🟡 Intermedio", remaining: "🔵 Restante" };
export const formatInvestment = (amount: number) => `RD$${amount.toLocaleString("en-US")}`;
export type AssignmentNumber = { number: number; source: "casa" | "respaldo"; badge: string; winner: boolean; tier?: AssignmentTier; betAmount?: number };
export type WinnerRotation = {
  sourceDate: string; session: LaPrimeraSession; winner: number; winnerTier: "hot" | "intermediate";
  changes: Array<{number: number; from: AssignmentTier; to: AssignmentTier}>;
};
export type WinnerRotationContext = {target: {date: string; session: LaPrimeraSession}; source: Assignment; draw: LaPrimeraDraw};
export type Assignment = {winnerRotation?: WinnerRotation; date: string; session: LaPrimeraSession; smart: boolean; investors: AssignmentNumber[][]; excluded: number; priorCount: number; mixed: boolean; createdAt: string; roster?: Array<{number:number; group: "nosotros" | "inversionistas" | "banca"; badge?: DelayBadge}>; blockStarts?: number[]; algorithmVersion?: string; prizeMultiplier?: number; allocationWarning?: string };
export function subtractMonths(date: string, months: number) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() - months);
  value.setUTCDate(Math.min(day, new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate()));
  return value.toISOString().slice(0, 10);
}
// Evaluate the same session strictly before the target draw, so the winner
// itself (or later results) cannot erase its historical delay classification.
export function numberDelayBadge(results: LaPrimeraDraw[], number: number, slot: {date: string; session: LaPrimeraSession}): DelayBadge {
  const last = results.reduce((latest, draw) => draw.session === slot.session && draw.number === number && draw.date < slot.date && draw.date > latest ? draw.date : latest, "");
  return !last || last <= subtractMonths(slot.date,6) ? "🧊" : last <= subtractMonths(slot.date,4) ? "❄️" : "";
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
export const smartDistributionVersion = "tiers-v3";
function hash(value: string) { let h = 2166136261; for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; }
// Only a validated, saved tier from the immediately preceding draw of the SAME
// session can trigger the rotation. A weekly winner flag is deliberately ignored.
export function winnerRotationContext(target: {date: string; session: LaPrimeraSession}, source: Assignment | null, draw: LaPrimeraDraw | undefined): WinnerRotationContext | undefined {
  if (!source || !draw || !source.smart || source.session !== target.session || draw.session !== target.session ||
      source.date !== shiftDate(target.date, -1) || draw.date !== source.date) return undefined;
  const error = validateAssignment(source);
  if (error) throw new Error(`No se puede rotar un reparto anterior inválido: ${error}.`);
  const winner = source.investors.flat().find(n => n.number === draw.number);
  if (winner?.tier !== "hot" && winner?.tier !== "intermediate") return undefined;
  return {target, source, draw};
}
function rotationPlan(pool: AssignmentNumber[], context?: WinnerRotationContext): WinnerRotation | undefined {
  if (!context) return undefined;
  const valid = winnerRotationContext(context.target, context.source, context.draw);
  if (!valid) return undefined;
  const prior = context.source.investors.flat();
  const winner = prior.find(n => n.number === context.draw.number)!;
  if (!pool.some(n => n.number === winner.number)) throw new Error("El ganador anterior debe permanecer en la rotación como restante. No se pudo conservar entre los números elegibles.");
  const changes: WinnerRotation["changes"] = [{number: winner.number, from: winner.tier!, to: "remaining"}];
  if (winner.tier === "hot") {
    const promoted = pool.find(n => n.source === "casa" && prior.some(p => p.number === n.number && p.tier === "intermediate"));
    if (!promoted) throw new Error("No hay un intermedio de Casa disponible para reemplazar al caliente ganador.");
    changes.push({number: promoted.number, from: "intermediate", to: "hot"});
  }
  const promoted = pool.find(n => prior.some(p => p.number === n.number && p.tier === "remaining"));
  if (!promoted) throw new Error("No hay un restante disponible para subir a intermedio.");
  changes.push({number: promoted.number, from: "remaining", to: "intermediate"});
  return {sourceDate: context.draw.date, session: context.draw.session, winner: winner.number, winnerTier: winner.tier as "hot" | "intermediate", changes};
}
// The caller supplies the eligible pool in global ranking order. Hashes only break
// ownership ties; they never determine a number's category or strength.
export function distribute(pool: AssignmentNumber[], previous: Assignment[], smart: boolean, seed: string, context?: WinnerRotationContext): Pick<Assignment, "investors" | "mixed" | "algorithmVersion" | "prizeMultiplier" | "allocationWarning" | "winnerRotation"> {
  if (new Set(pool.map(item => item.number)).size !== pool.length) throw new Error("El pool contiene números duplicados.");
  if (smart && (pool.length < 64 || pool.length > 68)) throw new Error("Se necesitan entre 64 y 68 números elegibles para mantener 16/17 jugadas y la inversión de RD$10,250/RD$10,150 por inversionista.");
  const winnerRotation = smart ? rotationPlan(pool, context) : undefined;
  const required = new Map(winnerRotation?.changes.map(change => [change.number, change.to]) ?? []);
  const priorTiers = new Map(context?.source.investors.flat().map(n => [n.number, n.tier]) ?? []);
  // Carry same-session categories forward where the eligible roster permits it.
  const tierOrder = {hot: 0, intermediate: 1, remaining: 2};
  const categoryPool = context ? [...pool].sort((a,b) => (tierOrder[priorTiers.get(a.number) ?? "remaining"]) - (tierOrder[priorTiers.get(b.number) ?? "remaining"])) : pool;
  const forcedHot = pool.filter(n => required.get(n.number) === "hot");
  const hot = new Set([...forcedHot, ...categoryPool.filter(item => item.source === "casa" && !required.has(item.number))].slice(0,16).map(item => item.number));
  if (smart && hot.size < 16) throw new Error("No hay 16 números elegibles de Casa (top 40) para entregar 4 calientes a cada inversionista.");
  const forcedIntermediate = pool.filter(n => required.get(n.number) === "intermediate");
  const intermediate = new Set([...forcedIntermediate, ...categoryPool.filter(item => !hot.has(item.number) && !required.has(item.number))].slice(0,20).map(item => item.number));
  const ranked = pool.map(item => smart ? {...item, tier: (hot.has(item.number) ? "hot" : intermediate.has(item.number) ? "intermediate" : "remaining") as AssignmentTier} : {...item});
  const blocked = Array.from({ length: 4 }, (_, i) => new Set(previous.flatMap(p => p.investors[i].map(n => n.number))));
  function match(capacities: number[], strictTiers: boolean) {
    const slots = capacities.flatMap((count, investor) => Array.from({length: count}, (_, index) => ({investor, tier: index < 4 ? "hot" : index < 9 ? "intermediate" : "remaining"})));
    const owners = slots.map(() => -1);
    const candidates = ranked.map(item => slots.map((slot, index) => ({...slot, index}))
      .filter(slot => !blocked[slot.investor].has(item.number) && (!required.has(item.number) || required.get(item.number) === slot.tier) && (strictTiers ? item.tier === slot.tier : !smart || slot.tier !== "hot" || item.source === "casa"))
      .sort((a,b) => Number(b.tier === item.tier) - Number(a.tier === item.tier) || hash(`${seed}:${item.number}:${a.index}`)-hash(`${seed}:${item.number}:${b.index}`)));
    function place(index: number, visited: Set<number>): boolean {
      for (const {index: slot} of candidates[index]) {
        if (visited.has(slot)) continue;
        visited.add(slot);
        if (owners[slot] === -1 || place(owners[slot], visited)) { owners[slot] = index; return true; }
      }
      return false;
    }
    for (let i=0; i<ranked.length; i++) if (!place(i, new Set())) return null;
    const output: AssignmentNumber[][] = [[],[],[],[]];
    owners.forEach((owner, slot) => { if (owner >= 0) output[slots[slot].investor].push(ranked[owner]); });
    output.forEach(items => items.sort((a,b) => ranked.indexOf(a)-ranked.indexOf(b)));
    if (smart && !strictTiers) {
      // Each investor has at least four Casa numbers from matching. Classify by
      // actual rank within that feasible allocation, never by hash or source alone.
      return output.map(items => {
        const selectedHot = new Set([...items.filter(item => required.get(item.number) === "hot"), ...items.filter(item => item.source === "casa" && !required.has(item.number))].slice(0,4).map(item => item.number));
        const selectedIntermediate = new Set([...items.filter(item => required.get(item.number) === "intermediate"), ...items.filter(item => !selectedHot.has(item.number) && !required.has(item.number))].slice(0,5).map(item => item.number));
        return items.map(item => ({...item, tier: (selectedHot.has(item.number) ? "hot" : selectedIntermediate.has(item.number) ? "intermediate" : "remaining") as AssignmentTier}));
      });
    }
    return output;
  }
  const order = [0,1,2,3].sort((a,b) => hash(seed+a)-hash(seed+b));
  // First try the globally strongest Casa candidates. If blocked, expand within
  // Casa while preserving all quotas and historical exclusions.
  for (const strictTiers of smart ? [true, false] : [false]) {
    for (let mask=0; mask<16; mask++) {
      if (mask.toString(2).replaceAll("0", "").length !== pool.length%4) continue;
      const capacities = Array<number>(4).fill(Math.floor(pool.length/4));
      order.forEach((investor,i) => { if (mask & (1<<i)) capacities[investor]++; });
      const investors = match(capacities, strictTiers);
      if (!investors) continue;
      if (!smart) return {investors, mixed: true};
      const priced = investors.map(items => items.map(item => ({...item,
        betAmount: item.tier === "hot" ? (items.length === 16 ? 1000 : 850) : item.tier === "intermediate" ? 550 : 500
      })));
      return {investors: priced, mixed: true, algorithmVersion: smartDistributionVersion, prizeMultiplier: 80, ...(winnerRotation ? {winnerRotation} : {})};
    }
  }
  throw new Error("No es posible entregar 4 calientes de Casa, 5 intermedios y 7/8 restantes a cada inversionista sin repetir números de las tandas protegidas. Se conserva el reparto guardado; no se han forzado repeticiones.");
}

// Derive prizes only from the saved wager and saved multiplier, never today's rates.
export function historicalWager(item: AssignmentNumber, assignment: Pick<Assignment, "prizeMultiplier">) {
  if (item.betAmount === undefined || assignment.prizeMultiplier === undefined) return null;
  return {tier: item.tier, betAmount: item.betAmount, potentialPrize: item.betAmount * assignment.prizeMultiplier};
}
export function assignmentInvestment(items: AssignmentNumber[]): number | null {
  return items.length && items.every(item => item.betAmount !== undefined) ? items.reduce((sum, item) => sum + item.betAmount!, 0) : null;
}

export function assignmentDeadline(slot: {date:string; session:LaPrimeraSession}) {
  return Date.parse(`${slot.date}T${slot.session === "dia" ? "12" : "19"}:00:00-04:00`);
}
export function validateAssignment(assignment: Assignment): string | null {
  if (!assignment || !Array.isArray(assignment.investors) || assignment.investors.length !== 4 || assignment.investors.some(items => !Array.isArray(items))) return "Reparto incompleto";
  if (!["dia","noche"].includes(assignment.session) || !Number.isFinite(assignmentDeadline(assignment)) || !Number.isFinite(Date.parse(assignment.createdAt)) || Date.parse(assignment.createdAt) >= assignmentDeadline(assignment)) return "Reparto fuera de la tanda";
  const items=assignment.investors.flat();
  if(items.some(item => !item || !Number.isInteger(item.number) || item.number<0 || item.number>99 || !["casa","respaldo"].includes(item.source))) return "Número o grupo inválido";
  if (assignment.prizeMultiplier !== undefined && (!Number.isFinite(assignment.prizeMultiplier) || assignment.prizeMultiplier <= 0)) return "Multiplicador inválido";
  if (items.some(item => (item.tier !== undefined && !["hot","intermediate","remaining"].includes(item.tier)) || (item.betAmount !== undefined && (!Number.isFinite(item.betAmount) || item.betAmount <= 0 || !item.tier || assignment.prizeMultiplier === undefined)))) return "Apuesta histórica inválida";
  if (assignment.algorithmVersion === "tiers-v1" && (!assignment.smart || assignment.prizeMultiplier === undefined || items.some(item => !item.tier) || assignment.investors.some(numbers => (numbers.length === 16 || numbers.length === 17) && numbers.some(item => item.betAmount === undefined)))) return "Inversión incompleta";
  if(new Set(items.map(item=>item.number)).size !== items.length) return "Número asignado más de una vez";
  const sizes=assignment.investors.map(items=>items.length);
  if(assignment.smart ? items.length>80 || Math.max(...sizes)-Math.min(...sizes)>1 || items.some(item=>Boolean(item.badge)) : sizes.some(size=>size!==20)) return "Cantidades o filtros inconsistentes";
  if (["tiers-v2", smartDistributionVersion].includes(assignment.algorithmVersion ?? "")) {
    if (!assignment.smart || assignment.prizeMultiplier !== 80 || assignment.investors.some(numbers =>
      ![16,17].includes(numbers.length) ||
      numbers.filter(item => item.tier === "hot").length !== 4 ||
      numbers.filter(item => item.tier === "intermediate").length !== 5 ||
      numbers.filter(item => item.tier === "remaining").length !== numbers.length - 9 ||
      numbers.some(item => item.tier === "hot" && item.source !== "casa") ||
      numbers.some(item => item.betAmount !== (item.tier === "hot" ? (numbers.length === 16 ? 1000 : 850) : item.tier === "intermediate" ? 550 : 500))
    )) return "El reparto debe tener 4 calientes de Casa, 5 intermedios, 7/8 restantes y la inversión aprobada";
  }
  if (assignment.winnerRotation) {
    const rotation = assignment.winnerRotation;
    if (!assignment.smart || assignment.algorithmVersion !== smartDistributionVersion || rotation.session !== assignment.session || rotation.sourceDate !== shiftDate(assignment.date,-1) || !["hot","intermediate"].includes(rotation.winnerTier) || !Array.isArray(rotation.changes)) return "Rotación de ganador fuera de la tanda";
    const expected = rotation.winnerTier === "hot" ? ["hot:remaining", "intermediate:hot", "remaining:intermediate"] : ["intermediate:remaining", "remaining:intermediate"];
    if (rotation.changes.length !== expected.length || new Set(rotation.changes.map(c => c.number)).size !== expected.length || rotation.changes.some((c,i) => `${c.from}:${c.to}` !== expected[i]) || rotation.changes[0].number !== rotation.winner) return "Cadena de rotación de ganador inválida";
    if (rotation.changes.some(c => items.find(n => n.number === c.number)?.tier !== c.to)) return "La rotación no coincide con los niveles guardados";
    if (items.find(n => n.number === rotation.winner)?.betAmount !== 500) return "El ganador anterior debe recibir la inversión mínima";
  }
  if(assignment.roster) {
    const roster=assignment.roster;
    if(roster.length!==100 || new Set(roster.map(item=>item.number)).size!==100 || roster.some(item=>!Number.isInteger(item.number)||item.number<0||item.number>99||!["nosotros","inversionistas","banca"].includes(item.group))) return "Clasificación incompleta";
    if(roster.some(item=>item.badge !== undefined && !["", "❄️", "🧊"].includes(item.badge))) return "Indicador de atraso inválido";
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
// Fixed rollout date: earlier winners never receive retroactive wager/prize details.
export const investorPrizeStartDate = "2026-10-02";
export const calendarDelayBadgeStartDate = "2026-10-02";
export type InvestorWinner = { delayBadge?: DelayBadge; tier?: AssignmentTier; betAmount?: number; potentialPrize?: number; number: number; name: string | null; recorded: boolean; validationError?: string; group: "nosotros" | "inversionistas" | "banca" | null };
export function resolveInvestorWinner(draw: LaPrimeraDraw, assignment: Assignment | null, results?: LaPrimeraDraw[]): InvestorWinner | null {
  if (draw.date < investorWinnerStartDate) return null;
  const recorded = Boolean(assignment && assignment.date === draw.date && assignment.session === draw.session);
  const validationError = recorded ? validateAssignment(assignment!) : null;
  if(validationError) return {number:draw.number,name:null,recorded:true,group:null,validationError};
  const index = recorded ? assignment!.investors.findIndex(numbers => numbers.some(item => item.number === draw.number)) : -1;
  const item = index >= 0 ? assignment!.investors[index].find(item => item.number === draw.number) : undefined;
  const group = item ? (item.source === "casa" ? "nosotros" : "inversionistas") : recorded ? assignment!.roster?.find(entry=>entry.number===draw.number)?.group ?? (!assignment!.smart ? "banca" : null) : null;
  const savedBadge = recorded ? assignment!.roster?.find(entry=>entry.number===draw.number)?.badge ?? item?.badge : undefined;
  const delayBadge = savedBadge !== undefined && ["", "❄️", "🧊"].includes(savedBadge) ? savedBadge as DelayBadge : results ? numberDelayBadge(results,draw.number,draw) : undefined;
  return {number:draw.number, name:index >= 0 ? investorNames[index] : null, recorded, group, ...(results || delayBadge ? {delayBadge} : {}), ...(item && draw.date >= investorPrizeStartDate ? historicalWager(item, assignment!) ?? {} : {})};
}
