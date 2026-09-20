import { NextRequest, NextResponse } from "next/server";
import { readLaPrimeraLoto5Results, readLaPrimeraQuinielaResults, readLaPrimeraResults, writeLaPrimeraLoto5Results, writeLaPrimeraQuinielaResults, writeLaPrimeraResults } from "../../../../lib/data";
import { fetchLaPrimeraLoto5ResultsSince, fetchLaPrimeraQuinielaResultsSince, fetchLaPrimeraResultsSince } from "../../../../lib/remote-la-primera";

export const dynamic = "force-dynamic";

function subtractDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const product = request.nextUrl.searchParams.get("product") ?? "quinielon";
  const requestedDate = request.nextUrl.searchParams.get("date");
  const targetDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : null;
  try {
    if (product === "quiniela") {
      const existing = await readLaPrimeraQuinielaResults();
      const latestDate = existing[0]?.date ?? "2025-09-01";
      const beforeKeys = new Set(existing.map((result) => `${result.date}-${result.session}`));
      const remote = await fetchLaPrimeraQuinielaResultsSince(targetDate ?? subtractDays(latestDate, 1), targetDate ?? undefined);
      const added = remote.results.filter((result) => !beforeKeys.has(`${result.date}-${result.session}`)).length;
      const quinielaResults = await writeLaPrimeraQuinielaResults([...existing, ...remote.results]);
      return NextResponse.json({ ok: true, product, added, total: quinielaResults.length, latest: quinielaResults[0] ?? null, quinielaResults, message: added ? `Se agregaron ${added} resultados de Quiniela.` : "Quiniela está actualizada." });
    }

    if (product === "loto5") {
      const existing = await readLaPrimeraLoto5Results();
      const latestDate = existing[0]?.date ?? "2025-09-03";
      const beforeDates = new Set(existing.map((result) => result.date));
      const remote = await fetchLaPrimeraLoto5ResultsSince(targetDate ?? subtractDays(latestDate, 1), targetDate ?? undefined);
      const added = remote.results.filter((result) => !beforeDates.has(result.date)).length;
      const loto5Results = await writeLaPrimeraLoto5Results([...existing, ...remote.results]);
      return NextResponse.json({ ok: true, product, added, total: loto5Results.length, latest: loto5Results[0] ?? null, loto5Results, message: added ? `Se agregaron ${added} resultados de Loto 5.` : "Loto 5 está actualizado." });
    }

    const existing = await readLaPrimeraResults();
    const latestDate = existing[0]?.date ?? "2025-07-01";
    const beforeKeys = new Set(existing.map((result) => `${result.date}-${result.session}`));
    const remote = await fetchLaPrimeraResultsSince(targetDate ?? subtractDays(latestDate, 1), targetDate ?? undefined);
    const added = remote.results.filter((result) => !beforeKeys.has(`${result.date}-${result.session}`)).length;
    const results = await writeLaPrimeraResults([...existing, ...remote.results]);
    return NextResponse.json({ ok: true, product: "quinielon", added, total: results.length, latest: results[0] ?? null, results, source: remote.sourceUrl, checkedDates: remote.checkedDates, message: added ? `Se agregaron ${added} resultados nuevos del Quinielón.` : "El Quinielón está actualizado." });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        product,
        added: 0,
        message: error instanceof Error ? error.message : "No se pudo consultar La Primera."
      },
      { status: 502 }
    );
  }
}
