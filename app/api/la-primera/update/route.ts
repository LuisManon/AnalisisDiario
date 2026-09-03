import { NextResponse } from "next/server";
import { readLaPrimeraLoto5Results, readLaPrimeraQuinielaResults, readLaPrimeraResults, writeLaPrimeraLoto5Results, writeLaPrimeraQuinielaResults, writeLaPrimeraResults } from "../../../../lib/data";
import { fetchLaPrimeraLoto5ResultsSince, fetchLaPrimeraQuinielaResultsSince, fetchLaPrimeraResultsSince } from "../../../../lib/remote-la-primera";

export const dynamic = "force-dynamic";

function subtractDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const existing = await readLaPrimeraResults();
    const latestDate = existing[0]?.date ?? "2025-07-01";
    const startDate = subtractDays(latestDate, 1);
    const beforeKeys = new Set(existing.map((result) => `${result.date}-${result.session}`));
    const remote = await fetchLaPrimeraResultsSince(startDate);
    const existingQuiniela = await readLaPrimeraQuinielaResults();
    const latestQuinielaDate = existingQuiniela[0]?.date ?? "2025-09-01";
    const remoteQuiniela = await fetchLaPrimeraQuinielaResultsSince(subtractDays(latestQuinielaDate, 1));
    const existingLoto5 = await readLaPrimeraLoto5Results();
    const latestLoto5Date = existingLoto5[0]?.date ?? "2025-09-03";
    const remoteLoto5 = await fetchLaPrimeraLoto5ResultsSince(subtractDays(latestLoto5Date, 1));
    const added = remote.results.filter((result) => !beforeKeys.has(`${result.date}-${result.session}`)).length;
    const results = await writeLaPrimeraResults([...existing, ...remote.results]);
    const quinielaResults = await writeLaPrimeraQuinielaResults([...existingQuiniela, ...remoteQuiniela.results]);
    const loto5Results = await writeLaPrimeraLoto5Results([...existingLoto5, ...remoteLoto5.results]);

    return NextResponse.json({
      ok: true,
      added,
      total: results.length,
      latest: results[0] ?? null,
      results,
      quinielaResults,
      loto5Results,
      source: remote.sourceUrl,
      checkedDates: remote.checkedDates,
      message: added
        ? `Se agregaron ${added} resultados nuevos de La Primera.`
        : "La data de La Primera ya contiene el resultado mas reciente disponible."
    });
  } catch (error) {
    const results = await readLaPrimeraResults();
    const quinielaResults = await readLaPrimeraQuinielaResults();
    const loto5Results = await readLaPrimeraLoto5Results();
    return NextResponse.json(
      {
        ok: false,
        added: 0,
        total: results.length,
        latest: results[0] ?? null,
        results,
        quinielaResults,
        loto5Results,
        message: error instanceof Error ? error.message : "No se pudo consultar La Primera."
      },
      { status: 502 }
    );
  }
}
