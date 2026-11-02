import fs from "node:fs";
import path from "node:path";
import { buildLaPrimeraFrequencyRanking } from "../lib/la-primera.ts";
import {
  distribute,
  numberDelayBadge,
  previousSlot,
  projectedAssignmentTier,
  shiftDate,
  smartDistributionVersion,
  subtractMonths,
  validateAssignment,
  winnerRotationContext,
  type Assignment,
  type AssignmentNumber,
} from "../lib/quinielon-distributor.ts";
import type { LaPrimeraDraw, LaPrimeraSession } from "../lib/types.ts";

const [date, ...winnerArgs] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || winnerArgs.length === 0) {
  throw new Error("Uso: reconstruct-quinielon-retrospective.ts AAAA-MM-DD dia=NN noche=NN");
}

const requested = winnerArgs.map(value => {
  const match = /^(dia|noche)=(\d{1,2})$/.exec(value);
  if (!match) throw new Error(`Ganador inválido: ${value}`);
  return {session: match[1] as LaPrimeraSession, winner: Number(match[2])};
});
const sourceResultsThrough = shiftDate(date, -1);
const results = (JSON.parse(fs.readFileSync("data/la-primera-results.json", "utf8")) as LaPrimeraDraw[])
  .filter(draw => draw.date <= sourceResultsThrough);

function rankingsFor(session: LaPrimeraSession) {
  const scoped = results.filter(draw => draw.session === session);
  const ranking = buildLaPrimeraFrequencyRanking(scoped);
  const referenceDate = results.reduce((latest, draw) => draw.date > latest ? draw.date : latest, "");
  const delayThreshold = referenceDate ? subtractMonths(referenceDate, 6) : "";
  const lastDate = (number: number) => scoped.reduce(
    (latest, draw) => draw.number === number && draw.date > latest ? draw.date : latest,
    "",
  );
  const isDelayed = (number: number) => !lastDate(number) || lastDate(number) <= delayThreshold;
  const originalTop = ranking.slice(0, 40);
  const displacedTop = new Set(originalTop.filter(item => isDelayed(item.number)).map(item => item.number));
  const nosotros = ranking.filter(item => !isDelayed(item.number)).slice(0, 40);
  const ours = new Set(nosotros.map(item => item.number));
  const remaining = ranking.filter(item => !ours.has(item.number));
  const banca = remaining.filter(item => !displacedTop.has(item.number)).sort((a, b) =>
    Number(isDelayed(b.number)) - Number(isDelayed(a.number)) ||
    a.count - b.count || lastDate(a.number).localeCompare(lastDate(b.number)) || a.number - b.number
  ).slice(0, 20);
  const bankNumbers = new Set(banca.map(item => item.number));
  return {nosotros, inversionistas: remaining.filter(item => !bankNumbers.has(item.number)), banca};
}

function assignmentFile(slot: {date: string; session: LaPrimeraSession}) {
  return path.join("data", "quinielon-assignments", `${slot.date}-${slot.session}.json`);
}
function readAssignment(slot: {date: string; session: LaPrimeraSession}) {
  try { return JSON.parse(fs.readFileSync(assignmentFile(slot), "utf8")) as Assignment; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

for (const {session, winner} of requested) {
  const slot = {date, session};
  const destination = assignmentFile(slot);
  if (fs.existsSync(destination)) throw new Error(`Ya existe ${destination}; no se sobrescribió.`);
  const p1 = previousSlot(slot), p2 = previousSlot(p1);
  const history = [readAssignment(p1), readAssignment(p2)].filter((item): item is Assignment => Boolean(item));
  const source = history.find(item => item.date === p2.date && item.session === slot.session) ?? null;
  const sourceDraw = results.find(draw => draw.date === p2.date && draw.session === slot.session);
  const rankings = rankingsFor(session);
  const roster = [
    ...rankings.nosotros.map(item => ({number:item.number, group:"nosotros" as const, badge:numberDelayBadge(results,item.number,slot)})),
    ...rankings.inversionistas.map(item => ({number:item.number, group:"inversionistas" as const, badge:numberDelayBadge(results,item.number,slot)})),
    ...rankings.banca.map(item => ({number:item.number, group:"banca" as const, badge:numberDelayBadge(results,item.number,slot)})),
  ];
  const pool: AssignmentNumber[] = (["casa", "respaldo"] as const).flatMap(group =>
    (group === "casa" ? rankings.nosotros : rankings.inversionistas).map(item => ({
      number:item.number, source:group, badge:numberDelayBadge(results,item.number,slot), winner:false,
    })),
  );
  const strength = new Map(buildLaPrimeraFrequencyRanking(results.filter(draw => draw.session === session)).map((item,index) => [item.number,index]));
  const candidates = pool.filter(item => !item.badge).sort((a,b) => strength.get(a.number)! - strength.get(b.number)!);
  const requestedItem = pool.find(item => item.number === winner);
  if (!requestedItem) throw new Error(`El ganador ${winner} pertenece a Banca y no puede incorporarse al reparto simulado.`);
  const base = candidates.slice(0, 48);
  const attempts = base.some(item => item.number === winner)
    ? [base]
    : base.map((item,index) => ({item,index})).filter(entry => entry.item.source === requestedItem.source).reverse().map(entry =>
        base.map((item,index) => index === entry.index ? {...requestedItem,badge:""} : item));
  let allocation: ReturnType<typeof distribute> | null = null;
  for (const eligible of attempts) {
    try {
      const priorWinner = sourceDraw && source?.investors.flat().find(item => item.number === sourceDraw.number);
      const protectedTier = priorWinner?.tier === "hot" || priorWinner?.tier === "intermediate"
        ? priorWinner.tier : sourceDraw ? projectedAssignmentTier(eligible,sourceDraw.number) : undefined;
      const rotation = winnerRotationContext(slot,source,sourceDraw,protectedTier);
      allocation = distribute(eligible,history,true,`${slot.date}-${slot.session}-retrospective`,rotation);
      break;
    } catch { /* Try another same-group replacement while preserving the winner. */ }
  }
  if (!allocation) throw new Error(`No se pudo reconstruir ${date} ${session} conservando al ganador ${winner}.`);
  const assignment: Assignment = {
    ...slot, roster, smart:true, ...allocation, excluded:pool.length-48, priorCount:history.length,
    createdAt:new Date().toISOString(),
    simulation:{kind:"retrospective",requestedWinningNumber:winner,sourceResultsThrough,
      reason:"El reparto no se guardó antes del cierre; simulación retrospectiva solicitada para trazabilidad."},
  };
  if (assignment.algorithmVersion !== smartDistributionVersion) throw new Error("La reconstrucción no utilizó el algoritmo activo.");
  const validationError = validateAssignment(assignment);
  if (validationError) throw new Error(`${date} ${session}: ${validationError}`);
  fs.writeFileSync(destination, `${JSON.stringify(assignment,null,2)}\n`);
  console.log(`${destination}: ganador ${String(winner).padStart(2,"0")} asignado y validado.`);
}
