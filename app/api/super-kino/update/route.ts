import { NextResponse } from "next/server";
import { readKinoResults, writeKinoResults } from "../../../../lib/super-kino-store";
import { parseKinoArchive } from "../../../../lib/super-kino";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const existing = await readKinoResults();
    const today = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Santo_Domingo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const months: string[] = [];
    const cursor = new Date(`${existing[0]?.date.slice(0,7) ?? "2026-09"}-01T00:00:00Z`);
    const end = new Date(`${today.slice(0,7)}-01T00:00:00Z`);
    for (;cursor<=end;cursor.setUTCMonth(cursor.getUTCMonth()+1)) months.push(cursor.toISOString().slice(0,7));
    const remote = [];
    for (const month of months) {
      const source = `https://numeros.medios.com.do/leidsa/super-kino-tv/historial/${month}/`;
      const response = await fetch(source,{cache:"no-store",signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error(`Fuente de resultados: HTTP ${response.status}`);
      remote.push(...parseKinoArchive(await response.text(),source).filter(d=>d.date<=today));
    }
    const results = await writeKinoResults([...existing,...remote]);
    const added = results.length-existing.length;
    return NextResponse.json({results,message:`${added} sorteos nuevos. Último publicado: ${results[0]?.date ?? "sin datos"}.`});
  } catch (error) {
    return NextResponse.json({message:error instanceof Error ? error.message : "No se pudo actualizar Kino."},{status:502});
  }
}
