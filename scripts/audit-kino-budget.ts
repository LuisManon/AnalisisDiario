import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { kinoSnapshotSchema } from "../lib/super-kino.ts";
import { exactTicketEconomics } from "../lib/kino-portfolio-risk.ts";
import { orderBudgetTickets, prepareBudgetEvaluator } from "../lib/kino-budget-study.ts";
import { randomStream, sampleBalls, wilson } from "../lib/kino-bowl-lab.ts";

const runId = process.argv[2] ?? "snapshot-2026-11-14";
if (process.argv.length > 3 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id");
const raw = await readFile("data/super-kino-portfolios/2026-11-14.json", "utf8"), snapshot = kinoSnapshotSchema.parse(JSON.parse(raw));
const protocol = await readFile("docs/experimentos/super-kino/presupuesto-v1/PROTOCOLO.md", "utf8");
const tickets = snapshot.plays.map(p => p.numbers), budgets = [20, 50, 100, 200], modes = ["random", "coverage"] as const;
const economics = exactTicketEconomics(snapshot.prizes);
const orders = modes.map(mode => orderBudgetTickets(tickets, mode, "kino-budget-v1/subset"));
const evaluators = orders.map(order => prepareBudgetEvaluator(order.map(i => tickets[i]), budgets, snapshot.prizes));
const iterations = 100_000, drawSeed = "kino-budget-v1/draws", rng = randomStream(drawSeed), weights = Array<number>(84).fill(1);
const codeHash = createHash("sha256");
for (const path of ["scripts/audit-kino-budget.ts", "lib/kino-budget-study.ts", "lib/kino-portfolio-risk.ts", "lib/kino-bowl-lab.ts", "lib/kino-math.ts", "lib/kino-experiment-strategies.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts"]) codeHash.update(path).update(await readFile(path));
const metadata = { version: "kino-budget-v1", iterations, drawSeed, subsetSeed: "kino-budget-v1/subset", snapshotDate: snapshot.targetDate, algorithm: snapshot.algorithm,
  snapshotSha256: createHash("sha256").update(raw).digest("hex"), codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), generatedAt: new Date().toISOString(), node: process.version, operationalWrites: false };
const out = resolve("experiments/super-kino/presupuesto-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
await writeFile(resolve(out, "protocol.md"), protocol);
await writeFile(resolve(out, "snapshot.json"), raw);
await writeFile(resolve(out, "subsets.json"), JSON.stringify({ metadata, modes, budgets, orders }, null, 2));
const accumulators = modes.map(() => budgets.map(() => ({ seven: 0, eight: 0, loss: 0, zero: 0, gross: [] as number[], d7: 0, d7sq: 0, d8: 0, d8sq: 0 })));
const control = budgets.map(() => ({ sum: 0, squares: 0 }));
console.log(`Comparing nested budgets ${budgets.join("/")} on ${iterations} shared draws, random versus coverage subsets.`);
for (let i = 0; i < iterations; i++) {
  const winning = sampleBalls(rng, weights), rows = evaluators.map(fn => fn(winning));
  if (rows[0][3].maxHits !== rows[1][3].maxHits || rows[0][3].gross !== rows[1][3].gross) throw new Error("Full portfolio mismatch");
  rows.forEach((byBudget, m) => byBudget.forEach((r, k) => {
    const a = accumulators[m][k], d7 = Number(r.maxHits >= 7) - Number(byBudget[3].maxHits >= 7), d8 = Number(r.maxHits >= 8) - Number(byBudget[3].maxHits >= 8);
    a.seven += Number(r.maxHits >= 7); a.eight += Number(r.maxHits >= 8);
    a.loss += Number(r.gross < budgets[k] * economics.ticketCost); a.zero += Number(r.gross === 0); a.gross.push(r.gross);
    a.d7 += d7; a.d7sq += d7 * d7; a.d8 += d8; a.d8sq += d8 * d8;
    if (m === 1) { const d = Number(r.maxHits >= 7) - Number(rows[0][k].maxHits >= 7); control[k].sum += d; control[k].squares += d * d; }
  }));
}
const paired = (sum: number, squares: number) => {
  const mean = sum / iterations, se = Math.sqrt(Math.max(0, squares - iterations * mean * mean) / (iterations - 1) / iterations);
  return { difference: mean, ci95: [mean - 1.96 * se, mean + 1.96 * se] };
};
const results = modes.map((mode, m) => ({ mode, budgets: budgets.map((count, k) => {
  const a = accumulators[m][k], sorted = a.gross.sort((a, b) => a - b), cost = count * economics.ticketCost;
  const exposure = Array<number>(84).fill(0);
  orders[m].slice(0, count).forEach(i => tickets[i].forEach(n => exposure[n - 1]++));
  return { count, cost, costReduction: 1 - count / 200, expectedGross: count * economics.expectedGrossPerTicket, expectedNet: count * economics.expectedNetPerTicket,
    sevenRate: a.seven / iterations, sevenWilson95: wilson(a.seven, iterations), eightRate: a.eight / iterations, eightWilson95: wilson(a.eight, iterations),
    retainedSevenCoverage: a.seven / accumulators[m][3].seven, retainedEightCoverage: a.eight / accumulators[m][3].eight,
    lossRate: a.loss / iterations, zeroPrizeRate: a.zero / iterations, medianGross: sorted[Math.floor((iterations - 1) * 0.5)],
    netLossP95: cost - sorted[Math.floor((iterations - 1) * 0.05)], exposureMin: Math.min(...exposure), exposureMax: Math.max(...exposure), exposure,
    sevenDifferenceVs200: paired(a.d7, a.d7sq), eightDifferenceVs200: paired(a.d8, a.d8sq), coverageVsRandomSeven: paired(control[k].sum, control[k].squares) };
}) }));
await writeFile(resolve(out, "report.json"), JSON.stringify({ metadata, economics, results, noPlayReference: { cost: 0, net: 0, sevenRate: 0 } }, null, 2));
const pct = (p: number) => `${(100 * p).toFixed(2)}%`, pp = (p: number) => (100 * p).toFixed(3), money = (v: number) => v.toFixed(2);
const summary = `# Menor presupuesto: costo y cobertura sacrificada\n\n100,000 sorteos uniformes compartidos. Subconjuntos anidados de la cartera guardada ${snapshot.targetDate}, ${snapshot.algorithm}. Ningún dato operativo se modifica.\n\n## Subconjuntos por cobertura, sin mirar ganadores\n\n| Jugadas | Costo RD$ | Ahorro | Alguna 7+ | Cobertura 7+ retenida frente a 200 | Alguna 8+ | Neto esperado RD$ |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${results[1].budgets.map(r => `| ${r.count} | ${money(r.cost)} | ${pct(r.costReduction)} | ${pct(r.sevenRate)} | ${pct(r.retainedSevenCoverage)} | ${pct(r.eightRate)} | ${money(r.expectedNet)} |`).join("\n")}\n\n## Tamaño y frecuencia de pérdidas\n\n| Jugadas | Premio menor que costo | Premio cero | Mediana bruto RD$ | Pérdida neta percentil95 RD$ | Exposición por número mín–máx |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${results[1].budgets.map(r => `| ${r.count} | ${pct(r.lossRate)} | ${pct(r.zeroPrizeRate)} | ${money(r.medianGross)} | ${money(r.netLossP95)} | ${r.exposureMin}–${r.exposureMax} |`).join("\n")}\n\nReducir costo baja la pérdida absoluta esperada; no mejora el ROI exacto de ${pct(economics.expectedRoi)} bajo este modelo y tabla. El percentil95 no es pérdida máxima: la pérdida máxima por sorteo es el costo, si no hay premio. Los premios raros hacen que la esperanza y el resultado típico difieran. Tabla modelada del snapshot, sin certificación oficial ni retenciones.\n\n## Control: mismos presupuestos, subconjuntos aleatorios\n\n| Jugadas | 7+ aleatorio | 7+ cobertura | Diferencia pareada en pp | IC95% Monte Carlo en pp |\n| --- | ---: | ---: | ---: | --- |\n${results[1].budgets.map((r, k) => `| ${r.count} | ${pct(results[0].budgets[k].sevenRate)} | ${pct(r.sevenRate)} | ${pp(r.coverageVsRandomSeven.difference)} | ${r.coverageVsRandomSeven.ci95.map(pp).join(" a ")} |`).join("\n")}\n\nError Monte Carlo condicionado a estos subconjuntos; no demuestra superioridad del algoritmo en general. La heurística minimiza una suma de intersecciones de pares; no se afirma optimalidad. No se reajustó después de evaluar. A 200 ambos órdenes representan exactamente la misma cartera y dan resultados idénticos.\n\nLos intervalos Wilson por tasa y diferencias pareadas de 7+/8+ frente a 200 están en report.json. No jugar tiene costo y neto cero, sin cobertura. No se elige presupuesto automáticamente ni se promueve un cambio de producción.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary); console.log(summary); console.log(`Saved ${out}`);
