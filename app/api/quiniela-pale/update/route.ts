import { NextResponse } from "next/server";
import { readQuinielaPaleResults, writeQuinielaPaleResults } from "../../../../lib/data";
import { fetchQuinielaPaleResultsSince } from "../../../../lib/remote-quiniela-pale";

export const dynamic = "force-dynamic";

function subtractDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const existing = await readQuinielaPaleResults();
    const rebuild = new URL(request.url).searchParams.get("rebuild") === "1";
    const latestDate = existing[0]?.date ?? new Date().toISOString().slice(0, 10);
    const startDate = rebuild || existing.length < 60 ? subtractDays(latestDate, 364) : subtractDays(latestDate, 2);
    const before = new Set(existing.map((result) => result.date));
    const remote = await fetchQuinielaPaleResultsSince(startDate);
    const added = remote.results.filter((result) => !before.has(result.date)).length;
    const results = await writeQuinielaPaleResults(rebuild ? remote.results : [...existing, ...remote.results]);
    return NextResponse.json({
      ok: true,
      added,
      total: results.length,
      results,
      latest: results[0] ?? null,
      source: remote.sourceUrl,
      message: added ? `Se agregaron ${added} resultados de Quiniela Pale.` : "La data ya esta actualizada."
    });
  } catch (error) {
    const results = await readQuinielaPaleResults();
    return NextResponse.json({
      ok: false,
      added: 0,
      total: results.length,
      results,
      latest: results[0] ?? null,
      message: error instanceof Error ? error.message : "No se pudo actualizar Quiniela Pale."
    }, { status: 502 });
  }
}
