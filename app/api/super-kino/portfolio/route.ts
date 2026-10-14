import { NextResponse } from "next/server";
import { readKinoResults } from "../../../../lib/super-kino-store";
import { getKinoPortfolio, getKinoV92Portfolio } from "../../../../lib/super-kino-portfolio-store";
import { kinoExpectedDate } from "../../../../lib/super-kino-clock";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const results = await readKinoResults();
    const [portfolio,candidate] = await Promise.all([getKinoPortfolio(results),getKinoV92Portfolio(results)]);
    return NextResponse.json({...portfolio,candidateCurrent:candidate.current,candidateSnapshots:candidate.snapshots,candidateWaitingForResult:candidate.waitingForResult,expectedDate:kinoExpectedDate()});
  } catch (error) {
    return NextResponse.json({message: error instanceof Error ? error.message : "No se pudieron guardar las jugadas."}, {status: 503});
  }
}
