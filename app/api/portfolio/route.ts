import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import { getNextGameDate } from "../../../lib/game";
import { getOrCreatePortfolio } from "../../../lib/portfolio-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get("drawDate") || getNextGameDate();
  const results = await readResults();
  const current = await getOrCreatePortfolio(targetDate, results);
  const previousDraw = results.find((draw) => draw.date < targetDate) ?? null;
  const previous = previousDraw ? await getOrCreatePortfolio(previousDraw.date, results) : null;

  return NextResponse.json({
    current,
    previous: previous && previousDraw ? { ...previous, draw: previousDraw } : null
  });
}
