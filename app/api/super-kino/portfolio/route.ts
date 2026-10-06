import { NextResponse } from "next/server";
import { readKinoResults } from "../../../../lib/super-kino-store";
import { getKinoPortfolio } from "../../../../lib/super-kino-portfolio-store";
import { kinoExpectedDate } from "../../../../lib/super-kino-clock";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const results = await readKinoResults();
    const portfolio = await getKinoPortfolio(results);
    return NextResponse.json({...portfolio, expectedDate: kinoExpectedDate()});
  } catch (error) {
    return NextResponse.json({message: error instanceof Error ? error.message : "No se pudieron guardar las jugadas."}, {status: 503});
  }
}
