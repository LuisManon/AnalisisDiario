import { NextResponse } from "next/server";
import { readLaPrimeraLoto5Results } from "../../../../lib/data";
import { getNextLoto5Date } from "../../../../lib/la-primera-loto5";
import { getOrCreateLoto5Portfolio } from "../../../../lib/loto5-portfolio-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const results = await readLaPrimeraLoto5Results();
  const targetDate = new URL(request.url).searchParams.get("drawDate") || getNextLoto5Date(results);
  const current = await getOrCreateLoto5Portfolio(targetDate, results);
  const previousDraw = results.find((draw) => draw.date < targetDate) ?? null;
  const previous = previousDraw ? await getOrCreateLoto5Portfolio(previousDraw.date, results) : null;
  return NextResponse.json({ current, previous: previous && previousDraw ? { ...previous, draw: previousDraw } : null });
}
