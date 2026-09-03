import { NextResponse } from "next/server";
import { readQuinielaPaleResults, writeQuinielaPaleResults } from "../../../../lib/data";
import { fetchQuinielaPaleResultsSince, getLatestExpectedQuinielaPaleDate } from "../../../../lib/remote-quiniela-pale";

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
    const expectedDate = getLatestExpectedQuinielaPaleDate();
    const startDate = rebuild ? "2025-08-01" : subtractDays(latestDate > expectedDate ? expectedDate : latestDate, 3);
    const before = new Set(existing.map((result) => result.date));
    const remote = await fetchQuinielaPaleResultsSince(startDate);
    const added = remote.results.filter((result) => !before.has(result.date)).length;
    const results = await writeQuinielaPaleResults([...existing, ...remote.results]);
    return NextResponse.json({
      ok: true,
      added,
      total: results.length,
      results,
      latest: results[0] ?? null,
      source: remote.sourceUrl,
      expectedDate,
      checked: true,
      message: added ? `Se agregaron ${added} resultados de Quiniela Pale.` : "Se verificaron y corrigieron los resultados recientes de Quiniela Pale."
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
