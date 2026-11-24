import { z } from "zod";
import { readPublicKinoPortfolio } from "../../../../lib/public-portfolio-store";
import { createReadCache } from "../../../../lib/read-cache";
import { NextResponse } from "next/server";
import { readKinoResults } from "../../../../lib/super-kino-store";
import { getKinoPortfolio, readSavedKinoSnapshot } from "../../../../lib/super-kino-portfolio-store";
import { kinoExpectedDate } from "../../../../lib/super-kino-clock";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const views = createReadCache<Awaited<ReturnType<typeof readPublicKinoPortfolio>>>(60_000, 1);
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  if (date && !z.iso.date().safeParse(date).success) return NextResponse.json({ message: "Fecha inválida." }, { status: 400 });
  try {
    if (date) return NextResponse.json({ current: await readSavedKinoSnapshot(date) }, { headers: { "Vercel-CDN-Cache-Control": "no-store", "Cache-Control": "no-store" } });
    if (process.env.VERCEL || params.get("view") === "compact") {
      const load = async () => {
        const results = await readKinoResults();
        return readPublicKinoPortfolio(results);
      };
      const portfolio = process.env.VERCEL ? await views.read("view", load) : await load();
      return NextResponse.json({ ...portfolio, expectedDate: kinoExpectedDate() }, { headers: { "Vercel-CDN-Cache-Control": "no-store", "Cache-Control": "no-store" } });
    }
    const results = await readKinoResults();
    const portfolio = await getKinoPortfolio(results);
    return NextResponse.json({...portfolio,expectedDate:kinoExpectedDate()}, { headers: { "Vercel-CDN-Cache-Control": "no-store", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({message: error instanceof Error ? error.message : "No se pudieron guardar las jugadas."}, {status: 503});
  }
}
