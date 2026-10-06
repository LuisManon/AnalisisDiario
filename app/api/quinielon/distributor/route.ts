import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { readLaPrimeraResults } from "../../../../lib/data";
import { buildLaPrimeraFrequencyRanking } from "../../../../lib/la-primera";
import { buildQuinielonV2Rankings } from "../../../../lib/quinielon-rankings";
import { assignmentDeadline, winnerRotationContext, validateAssignment, investorWinnerStartDate, resolveInvestorWinner, rotateBlocks, blockRotationVersion, smartDistributionVersion, distribute, selectedAssignmentSlot, followingSlot, previousSlot, numberDelayBadge, shiftDate, type Assignment, type AssignmentNumber } from "../../../../lib/quinielon-distributor";
import { isGitHubDataStoreEnabled, readGitHubJsonFile, writeGitHubSnapshot } from "../../../../lib/github-data-store";
export const runtime = "nodejs";
const file = (slot: { date: string; session: string }) => `data/quinielon-assignments/${slot.date}-${slot.session}.json`;
async function read(slot: {date:string;session:string}): Promise<Assignment | null> {
  if (isGitHubDataStoreEnabled()) { const raw = await readGitHubJsonFile(file(slot)); return raw ? JSON.parse(raw) : null; }
  try { return JSON.parse(await fs.readFile(path.join(process.cwd(),file(slot)),"utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
}
let pending = Promise.resolve();
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.smart !== undefined && typeof body.smart !== "boolean") return NextResponse.json({error:"Modo inválido"},{status:400});
  if (body?.session !== undefined && !["auto", "dia", "noche"].includes(body.session)) return NextResponse.json({error:"Tanda inválida"},{status:400});
  // Serialize same-process requests so two tabs cannot generate different histories concurrently.
  const previous = pending; let release!: () => void;
  pending = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const slot = selectedAssignmentSlot(body?.session ?? "auto");
    const existing = await read(slot);
    const p1 = previousSlot(slot), p2 = previousSlot(p1);
    const history = (await Promise.all([read(p1), read(p2)])).filter((a): a is Assignment => Boolean(a));
    const smart = body?.smart ?? existing?.smart ?? history[0]?.smart ?? false;
    const results = (await readLaPrimeraResults()).filter(d => d.date < slot.date || (d.date === slot.date && slot.session === "noche" && d.session === "dia"));
    const source = history.find(a => a.date === p2.date && a.session === slot.session) ?? null;
    const sourceDraw = results.find(d => d.date === p2.date && d.session === slot.session);
    const rotation = smart ? winnerRotationContext(slot, source, sourceDraw) : undefined;
    const rotationKey = rotation ? `${rotation.draw.date}:${rotation.draw.session}:${rotation.draw.number}` : "";
    const savedRotationKey = existing?.winnerRotation ? `${existing.winnerRotation.sourceDate}:${existing.winnerRotation.session}:${existing.winnerRotation.winner}` : "";
    if (existing && existing.smart === smart && existing.algorithmVersion === (smart ? smartDistributionVersion : blockRotationVersion) && rotationKey === savedRotationKey) {
      const error = validateAssignment(existing);
      if(error) throw new Error(`Reparto pendiente de revisión: ${error}.`);
      return NextResponse.json(existing);
    }
    if (!results.length) throw new Error("No hay resultados disponibles para construir el reparto.");
    const rankings = buildQuinielonV2Rankings(results)[slot.session];
    const d = new Date(`${slot.date}T00:00:00Z`); const monday = shiftDate(slot.date,-((d.getUTCDay()+6)%7));
    const pool: AssignmentNumber[] = (["casa","respaldo"] as const).flatMap(source => (source === "casa" ? rankings.nosotros : rankings.inversionistas).map(item => {
      return { number:item.number, source, badge: numberDelayBadge(results,item.number,slot), winner: results.some(draw => draw.session === slot.session && draw.number === item.number && draw.date >= monday) };
    }));
    const strength = new Map(buildLaPrimeraFrequencyRanking(results.filter(draw => draw.session === slot.session)).map((item, index) => [item.number, index]));
    const eligible = smart ? pool.filter(n => !n.badge).sort((a,b) => strength.get(a.number)! - strength.get(b.number)!) : pool;
    // A later draw may already have been prepared from the selector. Protect it too.
    const n1 = followingSlot(slot), n2 = followingSlot(n1);
    const future = smart ? (await Promise.all([read(n1), read(n2)])).filter((a): a is Assignment => Boolean(a)) : [];
    const allocation = smart ? distribute(eligible,[...history,...future],true,`${slot.date}-${slot.session}`,rotation) : rotateBlocks(pool,slot);
    const assignment: Assignment = {...slot, roster: [...rankings.nosotros.map(item=>({number:item.number,group:"nosotros" as const,badge:numberDelayBadge(results,item.number,slot)})),...rankings.inversionistas.map(item=>({number:item.number,group:"inversionistas" as const,badge:numberDelayBadge(results,item.number,slot)})),...rankings.banca.map(item=>({number:item.number,group:"banca" as const,badge:numberDelayBadge(results,item.number,slot)}))], smart, ...allocation, excluded:pool.length-eligible.length, priorCount:history.length, createdAt:new Date().toISOString()};
    const validationError=validateAssignment(assignment);
    if(validationError) throw new Error(`No se guardó el reparto: ${validationError}.`);
    if(Date.now() >= assignmentDeadline(slot)) throw new Error("La tanda cerró mientras se preparaba el reparto. Actualiza para cargar la próxima.");
    const content = JSON.stringify(assignment,null,2)+"\n";
    if (isGitHubDataStoreEnabled()) await writeGitHubSnapshot(file(slot),content,existing ? JSON.stringify(existing,null,2)+"\n" : null,`Save Quinielon assignment ${slot.date} ${slot.session}`);
    else { if (process.env.VERCEL) throw new Error("Configura el almacenamiento de GitHub para guardar los repartos."); const destination=path.join(process.cwd(),file(slot)); await fs.mkdir(path.dirname(destination),{recursive:true}); await fs.writeFile(destination,content,"utf8"); }
    return NextResponse.json(assignment);
  } catch(e) { return NextResponse.json({error:e instanceof Error ? e.message : "No se pudo guardar el reparto."},{status:409}); }
  finally { release(); }
}

export async function GET(request: Request) {
  const start = new URL(request.url).searchParams.get("week") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(Date.parse(`${start}T00:00:00Z`)) || new Date(`${start}T00:00:00Z`).toISOString().slice(0,10) !== start) return NextResponse.json({error:"Semana inválida"},{status:400});
  try {
    const end = shiftDate(start,6);
    const results = await readLaPrimeraResults();
    const draws = results.filter(draw => draw.date >= start && draw.date <= end && draw.date >= investorWinnerStartDate);
    const winners = await Promise.all(draws.map(async draw => [`${draw.date}-${draw.session}`, resolveInvestorWinner(draw,await read(draw),results)]));
    return NextResponse.json({winners:Object.fromEntries(winners)}, {headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"No se pudieron consultar los inversionistas ganadores."},{status:503}); }
}
