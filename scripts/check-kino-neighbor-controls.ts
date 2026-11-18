import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { kinoSnapshotSchema } from "../lib/super-kino.ts";
import { compileNearMaximum, uniformControl200, permutePortfolioLabels, buildNeighborPortfolio } from "../lib/kino-neighbor-controls.ts";
import { preparePortfolioEvaluator } from "../lib/kino-experiment-metrics.ts";
import { randomStream, sampleBalls } from "../lib/kino-bowl-lab.ts";

const runId = process.argv[2] ?? "two-weeks-2026-11-17";
if (process.argv.length > 3 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id");
const sourceDir = "experiments/super-kino/cercania-v1/2026-11-04--2026-11-17", priorRaw = await readFile(`${sourceDir}/report.json`, "utf8");
const prior = JSON.parse(priorRaw) as { metadata: { commit: string }; days: { date: string; status: string; winning: number[]; audit: { maxNear: number } }[] };
if (prior.days.length !== 14 || prior.days.some(d => d.status !== "evaluated")) throw new Error("Require14 evaluated source snapshots");
const inputs = [] as { date: string; raw: string; sha256: string; winning: number[]; tickets: number[][]; observedNear: number }[];
for (const day of prior.days) {
  const raw = await readFile(`${sourceDir}/inputs/analisis-near-${day.date}.json`, "utf8"), snapshot = kinoSnapshotSchema.parse(JSON.parse(raw));
  if (snapshot.targetDate !== day.date || snapshot.simulation || snapshot.plays.length !== 200) throw new Error("Invalid source snapshot");
  if (!snapshot.prizeDrawNumbers || [...snapshot.prizeDrawNumbers].sort((a, b) => a - b).join(",") !== [...day.winning].sort((a, b) => a - b).join(",")) throw new Error("Source result mismatch");
  const tickets = snapshot.plays.map(p => p.numbers), observedNear = compileNearMaximum(tickets)(day.winning);
  if (observedNear !== day.audit.maxNear) throw new Error("Optimized metric differs from prior audit");
  inputs.push({ date: day.date, raw, sha256: createHash("sha256").update(raw).digest("hex"), winning: day.winning, tickets, observedNear });
}
const protocol = await readFile("docs/experimentos/super-kino/control-vecinos-v1/PROTOCOLO.md", "utf8"), sources: { path: string; content: string }[] = [], codeHash = createHash("sha256");
for (const path of ["scripts/check-kino-neighbor-controls.ts", "lib/kino-neighbor-controls.ts", "lib/kino-near-matches.ts", "lib/kino-experiment-metrics.ts", "lib/kino-experiment-strategies.ts", "lib/kino-bowl-lab.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts"]) {
  const content = await readFile(path, "utf8"); sources.push({ path, content }); codeHash.update(path).update(content);
}
const nullReplicates = 1000, drawsPerDate = 20_000;
const metadata = { version: "kino-neighbor-checks-v1", originalCommit: prior.metadata.commit, sourceReportSha256: createHash("sha256").update(priorRaw).digest("hex"),
  nullReplicatesPerControl: nullReplicates, drawsPerDate, newVariantDraws: inputs.length * drawsPerDate, codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), generatedAt: new Date().toISOString(), node: process.version, operationalWrites: false };
const out = resolve("experiments/super-kino/control-vecinos-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
const save = async (file: string, data: unknown) => writeFile(resolve(out, file), JSON.stringify(data, null, 2));
await save("metadata.json", metadata); await save("sources.json", sources); await save("inputs.json", inputs); await writeFile(resolve(out, "source-audit.json"), priorRaw); await writeFile(resolve(out, "protocol.md"), protocol);
const variants = inputs.map(input => ({ date: input.date, original: input.tickets,
  half: buildNeighborPortfolio(input.tickets, "half", `kino-neighbor-variants-v1/half/${input.date}`),
  all: buildNeighborPortfolio(input.tickets, "all", `kino-neighbor-variants-v1/all/${input.date}`) }));
const variantsRaw = JSON.stringify(variants);
await writeFile(resolve(out, "frozen-variants.json"), variantsRaw);
await save("freeze.json", { frozenAt: new Date().toISOString(), sha256: createHash("sha256").update(variantsRaw).digest("hex"), costPerPortfolio: 5000, ticketsEach: 200 });
await save("status.json", { state: "running", phase: "historical-null-controls" });
const observed = { days9: inputs.filter(i => i.observedNear >= 9).length, days10: inputs.filter(i => i.observedNear === 10).length, meanMax: inputs.reduce((s, i) => s + i.observedNear, 0) / inputs.length };
const nullResults = [];
for (const control of ["uniform", "labels"] as const) {
  const replicates: { maxima: number[]; days9: number; days10: number; meanMax: number }[] = [];
  for (let r = 0; r < nullReplicates; r++) {
    const maxima = inputs.map(input => {
      const seed = `kino-neighbor-controls-v1/${control}/${r}/${input.date}`;
      const tickets = control === "uniform" ? uniformControl200(seed) : permutePortfolioLabels(input.tickets, seed);
      return compileNearMaximum(tickets)(input.winning);
    });
    replicates.push({ maxima, days9: maxima.filter(n => n >= 9).length, days10: maxima.filter(n => n === 10).length, meanMax: maxima.reduce((s, n) => s + n, 0) / maxima.length });
    if ((r + 1) % 100 === 0) console.log(`Null control ${control}: ${r + 1}/${nullReplicates}`);
  }
  const summarize = (metric: "days9" | "days10" | "meanMax") => {
    const values = replicates.map(r => r[metric]).sort((a, b) => a - b), p = (1 + values.filter(n => n >= observed[metric]).length) / (nullReplicates + 1);
    return { observed: observed[metric], nullMean: values.reduce((s, n) => s + n, 0) / nullReplicates, nullCentral95: [values[Math.floor(0.025 * (nullReplicates - 1))], values[Math.ceil(0.975 * (nullReplicates - 1))]], fractionAtLeastObserved: p, descriptiveBonferroniTwoControls: Math.min(1, 2 * p) };
  };
  nullResults.push({ control, days9: summarize("days9"), days10: summarize("days10"), meanMax: summarize("meanMax"), replicates });
}
await save("null-controls.json", { observed, nullResults });
await save("status.json", { state: "running", phase: "new-exact-variant-evaluation" });
const variantDays: { date: string; draws: number; counts: { seven: number; eight: number; maxHistogram: number[]; qualifyingSeven: number }[]; pairs: { sum: number; squares: number }[] }[] = [];
for (const frozen of variants) {
  const modes = [frozen.original, frozen.half.tickets, frozen.all.tickets], evaluate = modes.map(preparePortfolioEvaluator);
  const counts = modes.map(() => ({ seven: 0, eight: 0, maxHistogram: Array<number>(11).fill(0), qualifyingSeven: 0 }));
  const pairs = [0, 1].map(() => ({ sum: 0, squares: 0 })), rng = randomStream(`kino-neighbor-variants-v1/evaluation/${frozen.date}`), weights = Array<number>(84).fill(1);
  for (let d = 0; d < drawsPerDate; d++) {
    const winning = sampleBalls(rng, weights), results = evaluate.map(fn => fn(winning));
    results.forEach((result, i) => {
      counts[i].seven += Number(result.atLeast7); counts[i].eight += Number(result.atLeast8); counts[i].maxHistogram[result.maxHits]++; counts[i].qualifyingSeven += result.histogram.slice(7).reduce((s, n) => s + n, 0);
      if (i > 0) { const delta = Number(result.atLeast7) - Number(results[0].atLeast7); pairs[i - 1].sum += delta; pairs[i - 1].squares += delta * delta; }
    });
  }
  variantDays.push({ date: frozen.date, draws: drawsPerDate, counts, pairs }); console.log(`Exact variant evaluation ${frozen.date}: ${drawsPerDate} new draws`);
}
const total = inputs.length * drawsPerDate;
const variantRates = ["original", "half", "all"].map((mode, i) => ({ mode, sevenRate: variantDays.reduce((s, d) => s + d.counts[i].seven, 0) / total,
  eightRate: variantDays.reduce((s, d) => s + d.counts[i].eight, 0) / total, meanQualifyingSeven: variantDays.reduce((s, d) => s + d.counts[i].qualifyingSeven, 0) / total }));
const variantComparisons = ["half", "all"].map((mode, i) => {
  const sum = variantDays.reduce((s, d) => s + d.pairs[i].sum, 0), difference = sum / total;
  const varianceOfMean = variantDays.reduce((s, d) => { const p = d.pairs[i], mean = p.sum / d.draws; return s + d.draws * Math.max(0, p.squares - d.draws * mean * mean) / (d.draws - 1); }, 0) / (total * total);
  const half = 2.2414027276 * Math.sqrt(varianceOfMean), ci975 = [difference - half, difference + half], positiveDates = variantDays.filter(d => d.pairs[i].sum > 0).length;
  return { mode, difference, ci975, positiveDates, minDateDifference: Math.min(...variantDays.map(d => d.pairs[i].sum / d.draws)), maxDateDifference: Math.max(...variantDays.map(d => d.pairs[i].sum / d.draws)),
    passesExploratoryGate: difference >= 0.001 && ci975[0] > 0 && positiveDates >= 10 };
});
await save("report.json", { metadata, observed, nullResults: nullResults.map(({ replicates, ...summary }) => summary), variantRates, variantComparisons, variantDays, interpretation: "Historical post-hoc controls and separate uniform synthetic evaluation; no real future draw validation, no automatic adoption" });
const pct = (p: number) => `${(100 * p).toFixed(3)}%`, pp = (p: number) => (100 * p).toFixed(3);
const summary = `# Comprobaciones de cercanía y variantes±1\n\n14 carteras originales guardadas del4 al17/11,200 jugadas cada una. Dos experimentos distintos, sin cambios de producción.\n\n## A. ¿El12/14 de cercanía es excepcional?\n\n1,000 réplicas de14 fechas por control, mismos ganadores reales y presupuesto200. Observado: ${observed.days9}/14 fechas con9+cercanos, ${observed.days10}/14 con10cercanos.\n\n| Control | Media de fechas9+/14 | Rango central95% | Fracción de réplicas igualando/superando12 | Media fechas10/14 |\n| --- | ---: | --- | ---: | ---: |\n${nullResults.map(r => `| ${r.control} | ${r.days9.nullMean.toFixed(3)} | ${r.days9.nullCentral95.join("–")} | ${pct(r.days9.fractionAtLeastObserved)} | ${r.days10.nullMean.toFixed(3)} |`).join("\n")}\n\nUniform:200 combinaciones aleatorias únicas; labels: permutación de etiquetas conservando solapamientos de la cartera. Fracciones con corrección+1; las ajustadas por dos controles están en JSON. Este contraste es post hoc/descriptivo, no prueba confirmatoria de predicción.\n\n## B. ¿Mover±1 mejora aciertos EXACTOS?\n\n${total.toLocaleString("en-US")} sorteos uniformes NUEVOS; carteras modificadas congeladas antes de evaluar, sin usar ganadores históricos para escoger direcciones.\n\n| Cartera | Jugadas | Costo modelado | Alguna7+ exactos | Alguna8+ exactos |\n| --- | ---: | ---: | ---: | ---: |\n${variantRates.map(r => `| ${r.mode} | 200 | RD$5,000 | ${pct(r.sevenRate)} | ${pct(r.eightRate)} |`).join("\n")}\n\n| Variante menos original | Diferencia7+ en pp | IC97.5% Monte Carlo en pp | Fechas positivas | Supera puerta |\n| --- | ---: | --- | ---: | --- |\n${variantComparisons.map(r => `| ${r.mode} | ${pp(r.difference)} | ${r.ci975.map(pp).join(" a ")} | ${r.positiveDates}/14 | ${r.passesExploratoryGate ? "Sí" : "No"} |`).join("\n")}\n\nHalf conserva100 originales y sustituye100; all sustituye200. Cada sustitución mueve diez números±1, sin duplicados ni circularidad84↔1. No se expandió el costo ni se buscó la dirección ganadora a posteriori. Dos comparaciones primarias, intervalos normales ajustados Bonferroni, condicionados a estas carteras; heterogeneidad por fecha y conteos completos en report.json.\n\n## Límites\n\nCercanía no es acierto ni premio. No se añade evidencia real al repetir controles de los mismos14 ganadores. La parteB es sintética uniforme, no validación en sorteos físicos nuevos. Misma esperanza marginal de premio a igual presupuesto y tabla bajo uniforme; no se afirma rentabilidad ni óptimo global. No superar puerta significa sin ventaja demostrada, no equivalencia. Carteras y resultados congelados intactos; sin adopción automática.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary); await save("status.json", { state: "completed", completedAt: new Date().toISOString() }); console.log(summary); console.log(`Saved ${out}`);
