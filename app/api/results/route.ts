import { NextResponse } from "next/server";
import { readResults } from "../../../lib/data";
import { buildStats } from "../../../lib/stats";
import type { DayFilter } from "../../../lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = (searchParams.get("day") ?? "todos") as DayFilter;
  const results = await readResults();

  return NextResponse.json({
    results,
    stats: buildStats(results, day)
  });
}
