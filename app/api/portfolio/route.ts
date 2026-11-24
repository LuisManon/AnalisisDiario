import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import { getOrCreatePortfolio, readSavedPortfolios } from "../../../lib/portfolio-store";
import { lotoPortfolioDisplayDate } from "../../../lib/loto-portfolio-date";
import { dominicanClock, drawSlots } from "../../../lib/draw-schedule";
import { buildLotoPortfolioView } from "../../../lib/loto-portfolio-view";
import { createReadCache } from "../../../lib/read-cache";
export const maxDuration = 180;
const views = createReadCache<ReturnType<typeof buildLotoPortfolioView>>(60_000, 16);
const headers = { "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("drawDate");
  const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) === date && drawSlots("loto", date).length > 0;
  if (requested && !valid(requested)) return NextResponse.json({ message: "Fecha de Loto Más inválida." }, { status: 400, headers });
  try {
    const calendarDate = dominicanClock().date;
    const load = async () => {
      const [results, saved] = await Promise.all([readResults(), readSavedPortfolios()]);
      const targetDate = requested || lotoPortfolioDisplayDate(results);
      if (!valid(targetDate)) throw new Error("Fecha de Loto Más inválida.");
      if (!process.env.VERCEL) {
        const current = await getOrCreatePortfolio(targetDate, results, saved);
        if (current) return buildLotoPortfolioView([current, ...saved.filter(p => p.targetDate !== targetDate)], results, targetDate, calendarDate);
      }
      return buildLotoPortfolioView(saved, results, targetDate, calendarDate);
    };
    const view = process.env.VERCEL ? await views.read(`${calendarDate}:${requested ?? "auto"}`, load) : await load();
    return NextResponse.json(view, { headers });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "No se pudieron leer las carteras." }, { status: 503, headers }); }
}
