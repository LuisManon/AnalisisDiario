import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import { getDominicanNow, getNextGameDate, summarizeThirtyPlayPrizes } from "../../../lib/game";
import { getOrCreatePortfolio, readSavedPortfolios } from "../../../lib/portfolio-store";
import { drawSlots } from "../../../lib/draw-schedule";
export const maxDuration = 180;

function weekDrawDates(targetDate: string) {
  const target = new Date(`${targetDate}T12:00:00Z`);
  const day = target.getUTCDay();
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return [2, 5].map((offset) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get("drawDate") || getNextGameDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || !Number.isFinite(Date.parse(`${targetDate}T12:00:00Z`)) || new Date(`${targetDate}T12:00:00Z`).toISOString().slice(0,10) !== targetDate || !drawSlots("loto", targetDate).length) return NextResponse.json({ message: "Fecha de Loto Más inválida." }, { status: 400 });
  const results = await readResults();
  const current = await getOrCreatePortfolio(targetDate, results);
  const previousDraw = results.find((draw) => draw.date < targetDate) ?? null;
  const saved = await readSavedPortfolios();
  const previous = previousDraw ? saved.find(portfolio => portfolio.targetDate === previousDraw.date) ?? null : null;
  const now = getDominicanNow();
  const calendarDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const drawDates = weekDrawDates(calendarDate);
  const calendar = drawDates.map((date, index) => {
    const portfolio = saved.find((item) => item.targetDate === date) ?? (current?.targetDate === date ? current : null);
    const draw = results.find((item) => item.date === date);
    return {
      date,
      day: index === 0 ? "miercoles" : "sabado",
      summary: portfolio && draw ? summarizeThirtyPlayPrizes(portfolio, draw) : null,
      status: !portfolio && (draw || date < calendarDate) ? "missing" : "pending"
    };
  });

  return NextResponse.json({
    current,
    previous: previous && previousDraw ? { ...previous, draw: previousDraw } : null,
    calendar
  });
}
