import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { kinoSnapshotSchema, type KinoSnapshot } from "../lib/super-kino.ts";
import { orderBudgetTickets, prepareBudgetEvaluator } from "../lib/kino-budget-study.ts";
import { summarizeStability } from "../lib/kino-budget-stability.ts";
import { exactTicketEconomics } from "../lib/kino-portfolio-risk.ts";
import { randomStream, sampleBalls } from "../lib/kino-bowl-lab.ts";

const runId = process.argv[2] ?? "seven-snapshots-2026-11-14";
if (process.argv.length > 3 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id");
const dates = [2, 4, 6, 8, 10, 12, 14].map(n => `2026-11-${String(n).padStart(2, "0")}`), seeds = [0, 1, 2], budgets = [20, 50, 100, 200], iterations = 20_000;
const inputs: { date: string; path: string; raw: string; snapshot: KinoSnapshot; sha256: string }[] = [];
for (const date of dates) {
  const path = `data/super-kino-portfolios/${date}.json`, raw = await readFile(path, "utf8"), snapshot = kinoSnapshotSchema.parse(JSON.parse(raw));
  if (snapshot.targetDate !== date || snapshot.algorithm !== "kino-v13.3" || snapshot.plays.length !== 200) throw new Error(`Unexpected snapshot ${date}`);
  inputs.push({ date, path, raw, snapshot, sha256: createHash("sha256").update(raw).digest("hex") });
}
if (inputs.some(i => JSON.stringify(i.snapshot.prizes) !== JSON.stringify(inputs[0].snapshot.prizes))) throw new Error("Prize tables differ");
const protocol = await readFile("docs/experimentos/super-kino/estabilidad-presupuesto-v1/PROTOCOLO.md", "utf8"), codeHash = createHash("sha256");
const sources: { path: string; content: string }[] = [];
for (const path of ["scripts/audit-kino-budget-stability.ts", "lib/kino-budget-stability.ts", "lib/kino-budget-study.ts", "lib/kino-portfolio-risk.ts", "lib/kino-bowl-lab.ts", "lib/kino-math.ts", "lib/kino-experiment-strategies.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts"]) {
  const content = await readFile(path, "utf8"); sources.push({ path, content }); codeHash.update(path).update(content);
}
const metadata = { version: "kino-budget-stability-v1", dates, seeds, budgets, iterationsPerPair: iterations, totalSyntheticDraws: dates.length * seeds.length * iterations,
  codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), inputs: inputs.map(({ date, path, sha256 }) => ({ date, path, sha256 })), generatedAt: new Date().toISOString(), node: process.version, operationalWrites: false };
const out = resolve("experiments/super-kino/estabilidad-presupuesto-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
await writeFile(resolve(out, "protocol.md"), protocol);
await writeFile(resolve(out, "sources.json"), JSON.stringify(sources));
await writeFile(resolve(out, "inputs.json"), JSON.stringify(inputs.map(({ date, path, raw, sha256 }) => ({ date, path, raw, sha256 }))));
await writeFile(resolve(out, "metadata.json"), JSON.stringify(metadata, null, 2));

function evaluatePair(date: string, snapshot: KinoSnapshot, seed: number) {
  const subsetSeed = `kino-budget-stability-v1/subset/${date}/${seed}`, drawSeed = `kino-budget-stability-v1/draws/${date}/${seed}`;
  const tickets = snapshot.plays.map(p => p.numbers), modes = ["random", "coverage"] as const;
  const orders = modes.map(mode => orderBudgetTickets(tickets, mode, subsetSeed));
  const evaluate = orders.map(order => prepareBudgetEvaluator(order.map(i => tickets[i]), budgets, snapshot.prizes));
  const counts = modes.map(() => budgets.map(() => ({ seven: 0, eight: 0, loss: 0 })));
  const differences = budgets.map(() => ({ sum: 0, squares: 0 }));
  const rng = randomStream(drawSeed), weights = Array<number>(84).fill(1);
  for (let i = 0; i < iterations; i++) {
    const winning = sampleBalls(rng, weights), evaluated = evaluate.map(fn => fn(winning));
    if (evaluated[0][3].maxHits !== evaluated[1][3].maxHits || evaluated[0][3].gross !== evaluated[1][3].gross) throw new Error("Full portfolio mismatch");
    evaluated.forEach((rows, m) => rows.forEach((row, k) => {
      const a = counts[m][k]; a.seven += Number(row.maxHits >= 7); a.eight += Number(row.maxHits >= 8); a.loss += Number(row.gross < budgets[k] * 25);
      if (m === 1) {
        const d = Number(row.maxHits >= 7) - Number(evaluated[0][k].maxHits >= 7);
        differences[k].sum += d; differences[k].squares += d * d;
      }
    }));
  }
  return { date, seed, subsetSeed, drawSeed, orders, budgets: budgets.map((budget, k) => {
    const mean = differences[k].sum / iterations, se = Math.sqrt(Math.max(0, differences[k].squares - iterations * mean * mean) / (iterations - 1) / iterations);
    return { budget, randomRate: counts[0][k].seven / iterations, coverageRate: counts[1][k].seven / iterations,
      randomEightRate: counts[0][k].eight / iterations, coverageEightRate: counts[1][k].eight / iterations,
      randomLossRate: counts[0][k].loss / iterations, coverageLossRate: counts[1][k].loss / iterations,
      coverageRetainedSeven: counts[1][k].seven / counts[1][3].seven,
      pairedMonteCarloDifference: mean, pairedMonteCarloCi95: [mean - 1.96 * se, mean + 1.96 * se] };
  }) };
}
const pairs: ReturnType<typeof evaluatePair>[] = [];
for (const input of inputs) for (const seed of seeds) {
  console.log(`Evaluating snapshot ${input.date}, subset seed ${seed}, ${iterations} draws`);
  pairs.push(evaluatePair(input.date, input.snapshot, seed));
}
const clusterRows = pairs.flatMap(pair => pair.budgets.filter(r => r.budget < 200).map(r => ({ date: pair.date, seed: pair.seed, budget: r.budget, randomRate: r.randomRate, coverageRate: r.coverageRate })));
const cluster = summarizeStability(clusterRows, "kino-budget-stability-v1/bootstrap");
const economics = exactTicketEconomics(inputs[0].snapshot.prizes);
const budgetSummary = budgets.map(budget => {
  const rows = pairs.map(p => p.budgets.find(r => r.budget === budget)!);
  const mean = (fn: (r: typeof rows[number]) => number) => rows.reduce((s, r) => s + fn(r), 0) / rows.length;
  return { budget, cost: budget * economics.ticketCost, expectedNet: budget * economics.expectedNetPerTicket,
    randomSevenRate: mean(r => r.randomRate), coverageSevenRate: mean(r => r.coverageRate), coverageEightRate: mean(r => r.coverageEightRate), coverageLossRate: mean(r => r.coverageLossRate), coverageRetainedSeven: mean(r => r.coverageRetainedSeven) };
});
const decision = cluster.some(r => r.passesExploratoryGate) ? "Exploratory gate passed in at least one budget; requires new portfolio validation, no adoption" : "No budget passed the exploratory stability gate; no demonstrated advantage, not equivalence";
await writeFile(resolve(out, "report.json"), JSON.stringify({ metadata, economics, cluster, budgetSummary, pairs, decision }, null, 2));
const pct = (p: number) => `${(100 * p).toFixed(3)}%`, pp = (p: number) => (100 * p).toFixed(3);
const summary = `# Estabilidad entre carteras y presupuestos\n\n${dates.length} snapshots V13.3, tres semillas por snapshot: 21 parejas y ${metadata.totalSyntheticDraws.toLocaleString("en-US")} sorteos sintéticos uniformes nuevos. Ningún resultado real se usa para diseñar o evaluar predicción.\n\n## Diferencia de cobertura 7+ al mismo costo\n\n| Jugadas | Aleatorio | Heurística cobertura | Diferencia en pp | Intervalo cluster ajustado, pp | Fechas positivas | Supera puerta exploratoria |\n| --- | ---: | ---: | ---: | --- | ---: | --- |\n${cluster.map(r => `| ${r.budget} | ${pct(r.randomRate)} | ${pct(r.coverageRate)} | ${pp(r.difference)} | ${r.adjustedClusterInterval.map(pp).join(" a ")} | ${r.positiveDates}/${r.snapshots} | ${r.passesExploratoryGate ? "Sí" : "No"} |`).join("\n")}\n\nBootstrap exploratorio por siete fechas, agrupando semillas antes del remuestreo. Intervalos nominales98.333% por presupuesto, ajuste Bonferroni de tres comparaciones. Pocos clusters y selección fija de snapshots: no es una garantía de generalización ni precisión certificada. Error Monte Carlo pareado por réplica y diferencias por fecha están en report.json.\n\n## Presupuesto: promedio de estas carteras\n\n| Jugadas | Costo RD$ | Alguna7+ con heurística | Cobertura7+ retenida | Alguna8+ | Frecuencia de pérdida | Neto esperado RD$ |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${budgetSummary.map(r => `| ${r.budget} | ${r.cost} | ${pct(r.coverageSevenRate)} | ${pct(r.coverageRetainedSeven)} | ${pct(r.coverageEightRate)} | ${pct(r.coverageLossRate)} | ${r.expectedNet.toFixed(2)} |`).join("\n")}\n\n## Decisión\n\n${decision}.\n\nLa puerta exige +0.1pp medio, límite inferior ajustado positivo, al menos5/7 fechas positivas y ninguna fecha peor que−0.1pp. Ningún resultado autoriza adopción automática. Reducir costo baja pérdida absoluta esperada, no el ROI uniforme modelado (${pct(economics.expectedRoi)}). Tabla del snapshot, sin certificación oficial ni retenciones.\n\nNo se cambió la heurística, las semillas ni la muestra después de evaluar. A200 ambos métodos son idénticos en todos los escenarios. Snapshot y órdenes exactos preservados; sin cambios operativos.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary); console.log(summary); console.log(`Saved ${out}`);
