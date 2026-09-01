import { NextResponse } from "next/server";
import { readQuinielaPaleResults } from "../../../../lib/data";
import { getNextQuinielaDate } from "../../../../lib/quiniela-pale";
import { getOrCreateQuinielaPortfolio } from "../../../../lib/quiniela-portfolio-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get("drawDate") || getNextQuinielaDate();
  const results = await readQuinielaPaleResults();
  const current = await getOrCreateQuinielaPortfolio(targetDate, results);
  const previousDraw = results.find((draw) => draw.date < targetDate) ?? null;
  const previous = previousDraw ? await getOrCreateQuinielaPortfolio(previousDraw.date, results) : null;
  return NextResponse.json({ current, previous: previous && previousDraw ? { ...previous, draw: previousDraw } : null });
}
