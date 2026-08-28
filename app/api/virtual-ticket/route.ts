import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import {
  evaluateVirtualTicket,
  getDrawDay,
  getGameWindow,
  getNextGameDate,
  getDominicanNow
} from "../../../lib/game";
import { readVirtualTicket, writeVirtualTicket } from "../../../lib/virtual-ticket-store";
import { getOrCreateRecommendationSnapshot } from "../../../lib/recommendation-store";
import { playSchema } from "../../../lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const drawDate = searchParams.get("drawDate") || getNextGameDate();
  const results = await readResults();
  const day = getDrawDay(drawDate);
  const currentRecommendations = await getOrCreateRecommendationSnapshot(drawDate, results);
  const previousDraw = results.find((result) => result.date < drawDate);
  const previousRecommendations = previousDraw
    ? await getOrCreateRecommendationSnapshot(previousDraw.date, results)
    : null;
  const existing = await readVirtualTicket(drawDate);
  const ticket = existing ?? {
    drawDate,
    day,
    plays: currentRecommendations.plays,
    submittedAt: null
  };
  const draw = results.find((result) => result.date === drawDate);

  return NextResponse.json({
    ticket,
    recommendations: currentRecommendations,
    previousRecommendations: previousRecommendations
      ? { ...previousRecommendations, draw: previousDraw }
      : null,
    window: getGameWindow(drawDate),
    evaluation: evaluateVirtualTicket(ticket, draw),
    now: getDominicanNow().toISOString()
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const drawDate = String(body.drawDate || getNextGameDate());
  const window = getGameWindow(drawDate);

  if (!window.isEditable) {
    return NextResponse.json({ error: "El cierre de edicion fue a las 5:00 PM." }, { status: 403 });
  }

  const plays = playSchema.array().length(5).parse(body.plays);
  const ticket = await writeVirtualTicket({
    drawDate,
    day: getDrawDay(drawDate),
    plays,
    submittedAt: getDominicanNow().toISOString()
  });

  return NextResponse.json({ ok: true, ticket, window });
}
