import { NextResponse } from "next/server";
import { readResults, writeResults } from "../../../lib/data";
import { fetchRemoteResults } from "../../../lib/remote-results";
import { drawSchema } from "../../../lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const incoming = drawSchema.array().parse(Array.isArray(body) ? body : [body]);
  const existing = await readResults();
  const before = existing.length;
  const results = await writeResults([...existing, ...incoming]);

  return NextResponse.json({
    ok: true,
    added: results.length - before,
    total: results.length,
    latest: results[0] ?? null
  });
}

export async function GET() {
  try {
    const existing = await readResults();
    const remote = await fetchRemoteResults();
    const existingDates = new Set(existing.map((result) => result.date));
    const added = remote.results.filter((result) => !existingDates.has(result.date)).length;
    const results = await writeResults([...existing, ...remote.results]);

    return NextResponse.json({
      ok: true,
      added,
      total: results.length,
      latest: results[0] ?? null,
      results,
      source: remote.sourceUrl,
      message: added
        ? `Se agregaron ${added} sorteos nuevos.`
        : "La data local ya contiene el resultado mas reciente disponible."
    });
  } catch (error) {
    const results = await readResults();
    return NextResponse.json(
      {
        ok: false,
        added: 0,
        total: results.length,
        latest: results[0] ?? null,
        results,
        message: error instanceof Error ? error.message : "No se pudo consultar la fuente remota."
      },
      { status: 502 }
    );
  }
}
