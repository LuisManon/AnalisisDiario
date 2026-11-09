import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { readResults, readLaPrimeraResults } from "../../../../lib/data";
import { readKinoResults } from "../../../../lib/super-kino-store";
import { readSavedPortfolios } from "../../../../lib/portfolio-store";
import { isGitHubDataStoreEnabled, readGitHubJsonFile } from "../../../../lib/github-data-store";
import { savedStateKinds, savedStateReady, type SavedStateKind } from "../../../../lib/automation-status";

export const dynamic = "force-dynamic";
// Deliberately independent of every get-or-create/update endpoint.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as SavedStateKind;
  const date = params.get("date") ?? "";
  const session = params.get("session");
  if (!savedStateKinds.includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date || (session !== null && session !== "dia" && session !== "noche") || (["assignment","quinielon-result"].includes(kind) && !session)) {
    return NextResponse.json({error:"Consulta de estado inválida"},{status:400});
  }
  try {
    let value: unknown;
    if (kind === "kino-result") value = await readKinoResults();
    else if (kind === "loto-result") value = await readResults();
    else if (kind === "quinielon-result") value = await readLaPrimeraResults();
    else if (kind === "loto-portfolio") value = (await readSavedPortfolios()).find(item => item.targetDate === date) ?? null;
    else {
      const file = kind === "portfolio" ? `data/super-kino-portfolios/${date}.json` : `data/quinielon-assignments/${date}-${session}.json`;
      let raw: string | null;
      if (isGitHubDataStoreEnabled()) raw = await readGitHubJsonFile(file);
      else {
        try { raw = await fs.readFile(path.join(process.cwd(),"data",file.slice("data/".length)),"utf8"); }
        catch(error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; raw = null; }
      }
      value = raw === null ? null : JSON.parse(raw);
    }
    return NextResponse.json({date,session:session ?? undefined,ready:savedStateReady(kind,date,session as "dia" | "noche" | undefined,value)},{headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({error:"No se pudo verificar el registro guardado"},{status:503});
  }
}
