import { NextResponse } from "next/server";
import { createReadCache } from "../../../lib/read-cache";
import { readStoredResultsText } from "../../../lib/data";
import { drawSchema, laPrimeraDrawSchema } from "../../../lib/validation";
import { kinoDrawSchema } from "../../../lib/super-kino";
import { createResultsDocument } from "../../../lib/results-document";

const cached = createReadCache<ReturnType<typeof createResultsDocument>>(60_000, 3);
export async function GET(request: Request) {
  const started = performance.now();
  const product = new URL(request.url).searchParams.get("product") ?? "loto";
  if (product !== "kino" && product !== "loto" && product !== "quinielon") return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  try {
    const load = async () => createResultsDocument(await readStoredResultsText(product), raw => {
      const parsed = product === "kino" ? kinoDrawSchema.array().parse(JSON.parse(raw)) : product === "quinielon" ? laPrimeraDrawSchema.array().parse(JSON.parse(raw)) : drawSchema.array().parse(JSON.parse(raw));
      return parsed.sort((a,b) => b.date.localeCompare(a.date) || ("session" in a && "session" in b ? String(a.session).localeCompare(String(b.session)) : 0));
    });
    const document = process.env.VERCEL ? await cached.read(product, load) : await load();
    const response = document.respond(request);
    const elapsedMs = Math.round((performance.now() - started) * 100) / 100;
    response.headers.set("Server-Timing", `results;dur=${elapsedMs}`);
    if (process.env.VERCEL) console.info(JSON.stringify({ event: "results-read", product, status: response.status, elapsedMs, version: document.version }));
    return response;
  } catch { return NextResponse.json({ error: "No se pudieron consultar los resultados guardados." }, { status: 503 }); }
}
