import { NextResponse } from "next/server";
import { publishPortfolioIndexes } from "../../../../lib/public-portfolio-store";

export const maxDuration = 180;
export async function POST() {
  if (process.env.VERCEL) return NextResponse.json({ error: "La publicación solo está disponible en el trabajador automático." }, { status: 405 });
  try { return NextResponse.json({ ok: true, versions: await publishPortfolioIndexes() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron publicar los índices." }, { status: 503 }); }
}
