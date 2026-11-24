import { readPublicNeighborPortfolio } from "../../../../lib/public-portfolio-store";
import { createReadCache } from "../../../../lib/read-cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readKinoResults } from "../../../../lib/super-kino-store";
import { getKinoPortfolio, readSavedKinoSnapshot } from "../../../../lib/super-kino-portfolio-store";
import { readSavedNeighborSnapshot, readKinoNeighborPortfolio, syncKinoNeighborPortfolio } from "../../../../lib/super-kino-neighbor-store";
import { KINO_NEIGHBOR_START } from "../../../../lib/super-kino-neighbor";
import { kinoExpectedDate, kinoTargetDate } from "../../../../lib/super-kino-clock";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const headers = { "Cache-Control": "no-store" };
const readHeaders = { ...headers, "Vercel-CDN-Cache-Control": "no-store", "Cache-Control": "no-store" };
const views = createReadCache<Awaited<ReturnType<typeof readPublicNeighborPortfolio>>>(60_000, 1);
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  if (date && !z.iso.date().safeParse(date).success) return NextResponse.json({ message: "Fecha inválida." }, { status: 400, headers });
  try {
    if (date) return NextResponse.json({ current: await readSavedNeighborSnapshot(date) }, { headers: readHeaders });
    const target = [KINO_NEIGHBOR_START, kinoTargetDate()].sort().at(-1)!;
    const compact = Boolean(process.env.VERCEL) || params.get("view") === "compact";
    const load = () => readPublicNeighborPortfolio();
    const [portfolio, results] = await Promise.all([
      compact ? (process.env.VERCEL ? views.read(target, load) : load()) : readKinoNeighborPortfolio(target), readKinoResults()
    ]);
    return NextResponse.json({ ...portfolio, results, expectedDate: kinoExpectedDate() }, { headers: readHeaders });
  } catch { return NextResponse.json({ message: "No se pudieron leer las carteras Super Kino TV ±1." }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (process.env.VERCEL) return NextResponse.json({ message: "La preparación de carteras solo está disponible en el trabajador automático." }, { status: 405, headers: { ...headers, Allow: "GET" } });
  let date: string;
  try { date = z.object({ date: z.iso.date() }).parse(await request.json()).date; }
  catch { return NextResponse.json({ message: "Fecha de cartera inválida." }, { status: 400, headers }); }
  try {
    let [source, results] = await Promise.all([readSavedKinoSnapshot(date), readKinoResults()]);
    if (!source && date >= KINO_NEIGHBOR_START && date === kinoTargetDate()) {
      const original = await getKinoPortfolio(results);
      source = original.snapshots.find(s => s.targetDate === date) ?? null;
    }
    const portfolio = await syncKinoNeighborPortfolio(date, source, results);
    return NextResponse.json({ ...portfolio, results, expectedDate: kinoExpectedDate() }, { headers });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "No se pudo preparar la cartera Super Kino TV ±1." }, { status: 503, headers }); }
}
