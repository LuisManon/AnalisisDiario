import { NextResponse } from "next/server";
import { readKinoResults, writeKinoResults } from "../../../../lib/super-kino-store";
import { fetchLatestKinoResults, missingKinoDates, fetchKinoAnchor } from "../../../../lib/remote-super-kino";
import { kinoClock, kinoExpectedDate, kinoYearStart } from "../../../../lib/super-kino-clock";
export const dynamic = "force-dynamic";
let pending: Promise<unknown> | null = null;
async function update() {
  const existing = await readKinoResults();
  const expectedDate = kinoExpectedDate();
  const remote = await fetchLatestKinoResults(expectedDate);
  // Repair one oldest missing block per update without refetching the entire year every minute.
  const gaps = missingKinoDates([...existing,...remote], expectedDate, kinoYearStart(kinoClock().date));
  if (gaps.length) {
    try { remote.push(...await fetchKinoAnchor(gaps[Math.min(13, gaps.length - 1)])); }
    catch { /* Keep valid current results and report outstanding gaps below. */ }
  }
  const merged = [...new Map([...existing,...remote].map(d=>[d.date,d])).values()];
  const results = await writeKinoResults(merged);
  const added = results.length-existing.length;
  const missing = missingKinoDates(results,expectedDate,kinoYearStart(kinoClock().date));
  const waiting = !results.some(d=>d.date===expectedDate);
  return {results, expectedDate, waiting, missingCount:missing.length,
    message: waiting ? `Esperando el sorteo del ${expectedDate}. Volveremos a consultar en 60 segundos.` : `${added} sorteos nuevos. Último publicado: ${results[0]?.date ?? "sin datos"}.`};
}
export async function GET() {
  try {
    if (!pending) pending = update().finally(()=>{pending=null;});
    return NextResponse.json(await pending);
  } catch (error) {
    return NextResponse.json({message:error instanceof Error ? error.message : "No se pudo actualizar Kino."},{status:502});
  }
}
