import { createReadCache } from "../../../lib/read-cache";
import { NextResponse } from "next/server";
import { readLaPrimeraResults, readResults } from "../../../lib/data";
import { readKinoResults } from "../../../lib/super-kino-store";

type SavedResults = Awaited<ReturnType<typeof readResults>> | Awaited<ReturnType<typeof readLaPrimeraResults>> | Awaited<ReturnType<typeof readKinoResults>>;
const cached = createReadCache<SavedResults>(60_000, 3);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product") ?? "loto";
  if (!["kino", "loto", "quinielon"].includes(product)) return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  try {
    const load = () => product === "kino" ? readKinoResults() : product === "quinielon" ? readLaPrimeraResults() : readResults();
    const results = process.env.VERCEL ? await cached.read(product, load) : await load();
    return NextResponse.json({ results }, { headers: { "Vercel-CDN-Cache-Control": "no-store", "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "No se pudieron consultar los resultados guardados." }, { status: 503 }); }
}
