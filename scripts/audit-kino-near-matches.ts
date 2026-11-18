import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { kinoSnapshotSchema, kinoDrawSchema } from "../lib/super-kino.ts";
import { auditNearPortfolio } from "../lib/kino-near-matches.ts";

const options = new Map(process.argv.slice(2).map(arg => {
  const i = arg.indexOf("="); if (!arg.startsWith("--") || i < 0) throw new Error("Use --key=value");
  return [arg.slice(2, i), arg.slice(i + 1)];
}));
for (const key of options.keys()) if (!["input-dir", "commit", "run-id"].includes(key)) throw new Error(`Unknown option ${key}`);
const inputDir = resolve(options.get("input-dir") ?? "/tmp"), commit = options.get("commit") ?? "", runId = options.get("run-id") ?? "2026-11-04--2026-11-17";
if (!/^[a-f0-9]{40}$/.test(commit) || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Require pinned --commit and simple --run-id");
const dates = Array.from({ length: 14 }, (_, i) => `2026-11-${String(i + 4).padStart(2, "0")}`);
const resultRaw = await readFile(resolve(inputDir, "analisis-near-results.json"), "utf8"), results = kinoDrawSchema.array().parse(JSON.parse(resultRaw));
if (new Set(results.map(r => r.date)).size !== results.length) throw new Error("Duplicate result dates");
const protocol = await readFile("docs/experimentos/super-kino/cercania-v1/PROTOCOLO.md", "utf8"), sources: { path: string; content: string }[] = [], codeHash = createHash("sha256");
for (const path of ["scripts/audit-kino-near-matches.ts", "lib/kino-near-matches.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts"]) {
  const content = await readFile(path, "utf8"); sources.push({ path, content }); codeHash.update(path).update(content);
}
const metadata = { version: "kino-near-audit-v1", from: dates[0], to: dates.at(-1), requestedDays: dates.length, commit,
  source: `https://github.com/LuisManon/AnalisisDiario/tree/${commit}`, createdAt: new Date().toISOString(), node: process.version,
  codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), resultsSha256: createHash("sha256").update(resultRaw).digest("hex"), operationalWrites: false };
const out = resolve("experiments/super-kino/cercania-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out); await mkdir(resolve(out, "inputs"));
await writeFile(resolve(out, "inputs/analisis-near-results.json"), resultRaw); await writeFile(resolve(out, "protocol.md"), protocol);
await writeFile(resolve(out, "sources.json"), JSON.stringify(sources));
type Day = { date: string; status: string; detail?: string; algorithm?: string; generatedAt?: string; snapshotSha256?: string; winning?: number[]; resultBasis?: string; currentResultMismatch?: boolean; currentWinning?: number[]; audit?: ReturnType<typeof auditNearPortfolio> };
const days: Day[] = [];
for (const date of dates) {
  const filename = `analisis-near-${date}.json`;
  let raw: string;
  try { raw = await readFile(resolve(inputDir, filename), "utf8"); }
  catch { days.push({ date, status: "input-missing", detail: "Snapshot no disponible en las entradas descargadas; no se reconstruye" }); continue; }
  await writeFile(resolve(out, "inputs", filename), raw);
  const snapshotSha256 = createHash("sha256").update(raw).digest("hex");
  try {
    const saved = kinoSnapshotSchema.parse(JSON.parse(raw));
    if (saved.targetDate !== date) throw new Error("Snapshot date mismatch");
    const base = { date, algorithm: saved.algorithm, generatedAt: saved.generatedAt, snapshotSha256 };
    if (saved.simulation?.kind === "retrospective") { days.push({ ...base, status: "retrospective-excluded" }); continue; }
    const current = results.find(r => r.date === date), winning = saved.prizeDrawNumbers ?? current?.numbers;
    if (!winning) { days.push({ ...base, status: "result-pending" }); continue; }
    const currentResultMismatch = Boolean(saved.prizeDrawNumbers && current && [...saved.prizeDrawNumbers].sort((a, b) => a - b).join(",") !== [...current.numbers].sort((a, b) => a - b).join(","));
    days.push({ ...base, status: "evaluated", winning: [...winning], resultBasis: saved.prizeDrawNumbers ? "snapshot-frozen" : "current-results",
      currentResultMismatch, ...(currentResultMismatch ? { currentWinning: current!.numbers } : {}), audit: auditNearPortfolio(saved.plays, winning) });
  } catch (error) { days.push({ date, status: "invalid-input", snapshotSha256, detail: error instanceof Error ? error.message : "Invalid input" }); }
}
const evaluated = days.filter((d): d is Day & { audit: ReturnType<typeof auditNearPortfolio> } => Boolean(d.audit));
const statistics = { evaluatedDays: evaluated.length, totalTickets: evaluated.reduce((s, d) => s + d.audit.plays, 0),
  daysWithNear10: evaluated.filter(d => d.audit.maxNear === 10).length, daysWithNear9Plus: evaluated.filter(d => d.audit.maxNear >= 9).length,
  ticketsNear10: evaluated.reduce((s, d) => s + d.audit.nearHistogram[10], 0), ticketsNear9Plus: evaluated.reduce((s, d) => s + d.audit.nearHistogram[9] + d.audit.nearHistogram[10], 0),
  maxExact: evaluated.length ? Math.max(...evaluated.map(d => d.audit.maxExact)) : null, currentResultMismatches: evaluated.filter(d => d.currentResultMismatch).length };
await writeFile(resolve(out, "report.json"), JSON.stringify({ metadata, statistics, days }, null, 2));
await writeFile(resolve(out, "daily.csv"), "fecha,jugada,exactos,vecinos,total_cercanos,max_exactos_dia,jugadas_9_o_10,jugadas_10,estado\n" + days.map(d => d.audit
  ? [d.date, d.audit.bestNear.id, d.audit.bestNear.exactCount, d.audit.bestNear.neighborCount, d.audit.maxNear, d.audit.maxExact, d.audit.nearHistogram[9] + d.audit.nearHistogram[10], d.audit.nearHistogram[10], d.status].join(",")
  : [d.date, "", "", "", "", "", "", "", d.status].join(",")).join("\n") + "\n");
const nn = (n: number) => String(n).padStart(2, "0");
const summary = `# Cercanía±1: carteras del4 al17 noviembre2026\n\n${statistics.evaluatedDays}/${dates.length} fechas evaluadas, ${statistics.totalTickets} jugadas guardadas. Entradas de un único commit: ${commit}. Sin regeneración ni cambios operativos.\n\nExactos primero; cada vecino±1 se empareja con un ganador distinto disponible. Sin circularidad84↔1 ni reutilizar ganadores exactos. La mejor cercanía puede corresponder a una jugada distinta de la mejor por aciertos reales.\n\n| Fecha | Jugada más cercana | Exactos en ella | Vecinos±1 | Total cercano | Máximo exacto del día | Jugadas9+/10 cercanas |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${days.map(d => d.audit ? `| ${d.date} | ${d.audit.bestNear.id} | ${d.audit.bestNear.exactCount} | ${d.audit.bestNear.neighborCount} | ${d.audit.maxNear}/10 | ${d.audit.maxExact} | ${d.audit.nearHistogram[9] + d.audit.nearHistogram[10]} |` : `| ${d.date} | ${d.status} | — | — | — | — | — |`).join("\n")}\n\n## Balance\n\n- ${statistics.daysWithNear10} fechas con alguna jugada10/10 exactos+vecinos; ${statistics.ticketsNear10} jugadas en total con ese criterio.\n- ${statistics.daysWithNear9Plus} fechas con alguna9+/10 cercana; ${statistics.ticketsNear9Plus} jugadas en total.\n- Máximo de aciertos REALES en todo el período: ${statistics.maxExact ?? "sin datos"}.\n- Diferencias entre resultado congelado y actual: ${statistics.currentResultMismatches}. Se conserva el congelado cuando existe.\n\n## Desglose de las mejores de cada fecha\n\n${evaluated.map(d => { const b = d.audit.bestNear; return `### ${d.date}, jugada${b.id}\n\nOriginal: ${b.numbers.map(nn).join(" · ")}.\n\nExactos: ${b.exact.map(nn).join(" · ") || "ninguno"}. Vecinos (tenías→salió): ${b.neighbors.map(p => `${nn(p.number)}→${nn(p.winner)}`).join(", ") || "ninguno"}. Sin coincidencia: ${b.unmatched.map(nn).join(" · ") || "ninguno"}. Resultado usado: ${d.resultBasis}.\n`; }).join("\n")}\n\n## Interpretación\n\nEs una auditoría retrospectiva descriptiva de la mejor entre las jugadas de cada cartera; buscar el máximo entre200 favorece coincidencias altas. Un10/10 de cercanía NO es un10/10 real ni acredita premio. Vecindad numérica no demuestra patrón predictivo ni proximidad física entre bolas. No se ensayó si estas cifras superan una referencia aleatoria, por lo que no se afirma ventaja. La métrica se propuso después de observar17/11.\n\nNo se certifica compra ni existencia del snapshot en Git antes del cierre: se valida su contenido y generatedAt. No se reescriben carteras, premios, resultados o asignaciones. report.json conserva todas las filas, empates, histogramas, procedencia y estados de entradas.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary); console.log(summary); console.log(`Saved ${out}`);
