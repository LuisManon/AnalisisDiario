import { NextRequest, NextResponse } from "next/server";
import { readLaPrimeraResults, writeLaPrimeraResults } from "../../../../lib/data";
import { fetchLaPrimeraResultsSince } from "../../../../lib/remote-la-primera";
import { publicationWindow } from "../../../../lib/draw-schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
    const existing = await readLaPrimeraResults();
    const window = publicationWindow("quinielon");
    if (window) return NextResponse.json({ ok: true, results: existing, total: existing.length, latest: existing[0] ?? null, waiting: true, remainingMinutes: window.remainingMinutes, message: `Sorteo en curso. Debe esperar ${window.remainingMinutes} minutos.` });
    const latestDate = existing[0]?.date ?? "2025-07-01";
    const beforeKeys = new Set(existing.map((result) => `${result.date}-${result.session}`));
    const remote = await fetchLaPrimeraResultsSince(targetDate ?? subtractDays(latestDate, 1), targetDate ?? undefined);
    const added = remote.results.filter((result) => !beforeKeys.has(`${result.date}-${result.session}`)).length;
    const existingByKey = new Map(existing.map((result) => [`${result.date}-${result.session}`, result]));
    const confirmationConflicts = remote.officialResults.flatMap((official) => {
      const saved = existingByKey.get(`${official.date}-${official.session}`);
      return saved?.verification === "provisional" && saved.number !== official.number
        ? [{ date: official.date, session: official.session, provisional: saved.number, official: official.number }]
        : [];
    });
    const results = await writeLaPrimeraResults([...existing, ...remote.results]);
    const conflicts = [...remote.conflicts, ...confirmationConflicts];
    const provisional = remote.results.filter((result) => result.verification === "provisional").length;
    const confirmed = remote.results.filter((result) => result.verification === "confirmed").length;
    const message = conflicts.length
      ? `La Primera corrigió ${conflicts.length} resultado provisional.`
      : provisional
        ? `Se agregaron ${provisional} resultados provisionales; esperando confirmación de La Primera.`
        : added
          ? `Se agregaron ${added} resultados nuevos del Quinielón.`
          : "El Quinielón está actualizado y confirmado.";
    return NextResponse.json({ ok: true, product: "quinielon", added, confirmed, provisional, conflicts, total: results.length, latest: results[0] ?? null, results, source: remote.sourceUrl, checkedDates: remote.checkedDates, message });
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
