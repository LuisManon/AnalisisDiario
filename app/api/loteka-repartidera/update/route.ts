import { NextResponse } from "next/server";
import { readLotekaRepartideraResults, writeLotekaRepartideraResults } from "../../../../lib/data";
import { fetchLotekaRepartideraResultsSince } from "../../../../lib/remote-loteka-repartidera";

export const dynamic = "force-dynamic";

function subtractDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const existing = await readLotekaRepartideraResults();
    const latestDate = existing[0]?.date ?? "2025-01-01";
    const startDate = subtractDays(latestDate, 2);
    const beforeKeys = new Set(existing.map((result) => result.date));
    const remote = await fetchLotekaRepartideraResultsSince(startDate);
    const added = remote.results.filter((result) => !beforeKeys.has(result.date)).length;
    const results = await writeLotekaRepartideraResults([...existing, ...remote.results]);

    return NextResponse.json({
      ok: true,
      added,
      total: results.length,
      latest: results[0] ?? null,
      results,
      source: remote.sourceUrl,
      checkedRanges: remote.checkedRanges,
      message: added
        ? `Se agregaron ${added} resultados nuevos de Loteka.`
        : "La data de Loteka ya contiene el resultado mas reciente disponible."
    });
  } catch (error) {
    const results = await readLotekaRepartideraResults();
    return NextResponse.json(
      {
        ok: false,
        added: 0,
        total: results.length,
        latest: results[0] ?? null,
        results,
        message: error instanceof Error ? error.message : "No se pudo consultar Loteka."
      },
      { status: 502 }
    );
  }
}
