import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import { simulate } from "../../../lib/stats";
import { simulationRequestSchema } from "../../../lib/validation";

export async function POST(request: Request) {
  const body = simulationRequestSchema.parse(await request.json());
  const results = await readResults();
  const draw =
    body.manualDraw ??
    results.find((result) => result.date === body.drawDate) ??
    results[0];

  if (!draw) {
    return NextResponse.json({ error: "No hay sorteos disponibles." }, { status: 400 });
  }

  return NextResponse.json({
    draw,
    results: simulate(draw, body.plays)
  });
}
