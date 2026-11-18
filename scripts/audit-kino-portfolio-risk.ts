import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { buildExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";
import { preparePortfolioEvaluator } from "../lib/kino-experiment-metrics.ts";
import { kinoSnapshotSchema } from "../lib/super-kino.ts";
import { exactTicketEconomics, portfolioStructure } from "../lib/kino-portfolio-risk.ts";
import { randomStream, sampleBalls, wilson } from "../lib/kino-bowl-lab.ts";

const runId = process.argv[2] ?? "snapshot-2026-11-14";
if (process.argv.length > 3 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id");
const source = "data/super-kino-portfolios/2026-11-14.json", raw = await readFile(source, "utf8"), snapshot = kinoSnapshotSchema.parse(JSON.parse(raw));
const protocol = await readFile("docs/experimentos/super-kino/riesgo-carteras-v1/PROTOCOLO.md", "utf8");
const names = ["operativa-guardada", "uniforme", "equilibrada"];
const tickets = [snapshot.plays.map(p => p.numbers), buildExperimentPortfolio("uniform", "kino-risk-v1/uniform"), buildExperimentPortfolio("balanced", "kino-risk-v1/balanced")];
const structures = tickets.map(portfolioStructure), evaluate = tickets.map(preparePortfolioEvaluator);
const economics = exactTicketEconomics(snapshot.prizes);
const codeHash = createHash("sha256");
for (const f of ["scripts/audit-kino-portfolio-risk.ts", "lib/kino-portfolio-risk.ts", "lib/kino-math.ts", "lib/kino-experiment-strategies.ts", "lib/kino-experiment-metrics.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts", "lib/kino-bowl-lab.ts"]) codeHash.update(f).update(await readFile(f));
const metadata = { version: "kino-risk-v1", source, snapshotSha256: createHash("sha256").update(raw).digest("hex"), codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"),
  iterations: 100_000, drawSeed: "kino-risk-v1/draws", portfolioSeeds: [null, "kino-risk-v1/uniform", "kino-risk-v1/balanced"], generatedAt: new Date().toISOString(), node: process.version, algorithm: snapshot.algorithm, operationalWrites: false };
const out = resolve("experiments/super-kino/riesgo-carteras-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
await writeFile(resolve(out, "protocol.md"), protocol);
await writeFile(resolve(out, "portfolios.json"), JSON.stringify({ metadata, names, tickets, prizes: snapshot.prizes }, null, 2));
const accumulators = names.map(() => ({ maxHistogram: Array<number>(11).fill(0), loss: 0, zeroPrize: 0, gross: [] as number[], seven: 0, eight: 0 }));
const paired = names.map(() => ({ sevenSum: 0, sevenSquares: 0, eightSum: 0, eightSquares: 0 }));
const random = randomStream(metadata.drawSeed), weights = Array<number>(84).fill(1), cost = 200 * economics.ticketCost;
console.log(`Auditing ${metadata.iterations} shared uniform draws, 3 fixed portfolios, RD$${cost} modeled cost each.`);
for (let i = 0; i < metadata.iterations; i++) {
  const winning = sampleBalls(random, weights), rows = evaluate.map(fn => fn(winning));
  rows.forEach((r, k) => {
    const a = accumulators[k], gross = snapshot.prizes.reduce((s, p) => s + p.amount * r.histogram[p.hits], 0);
    a.maxHistogram[r.maxHits]++; a.seven += Number(r.atLeast7); a.eight += Number(r.atLeast8);
    a.loss += Number(gross < cost); a.zeroPrize += Number(gross === 0); a.gross.push(gross);
    const d7 = Number(r.atLeast7) - Number(rows[0].atLeast7), d8 = Number(r.atLeast8) - Number(rows[0].atLeast8);
    paired[k].sevenSum += d7; paired[k].sevenSquares += d7 * d7; paired[k].eightSum += d8; paired[k].eightSquares += d8 * d8;
  });
}
const pairedInterval = (sum: number, squares: number) => {
  const n = metadata.iterations, mean = sum / n, se = Math.sqrt(Math.max(0, squares - n * mean * mean) / (n - 1) / n);
  return { difference: mean, ci95: [mean - 1.96 * se, mean + 1.96 * se] };
};
const results = names.map((name, k) => {
  const a = accumulators[k], gross = [...a.gross].sort((a, b) => a - b), n = metadata.iterations;
  const quantile = (p: number) => gross[Math.floor((n - 1) * p)];
  return { name, structure: structures[k], cost, expectedGross: 200 * economics.expectedGrossPerTicket, expectedNet: 200 * economics.expectedNetPerTicket,
    sevenRate: a.seven / n, sevenWilson95: wilson(a.seven, n), eightRate: a.eight / n, eightWilson95: wilson(a.eight, n), lossRate: a.loss / n, zeroPrizeRate: a.zeroPrize / n,
    grossQuantiles: { p05: quantile(0.05), p50: quantile(0.5), p95: quantile(0.95), p99: quantile(0.99) }, maxHistogram: a.maxHistogram,
    versusSavedSeven: pairedInterval(paired[k].sevenSum, paired[k].sevenSquares), versusSavedEight: pairedInterval(paired[k].eightSum, paired[k].eightSquares) };
});
const budgets = [20, 50, 100, 200].map(count => ({ tickets: count, cost: count * economics.ticketCost, expectedGross: count * economics.expectedGrossPerTicket, expectedNet: count * economics.expectedNetPerTicket }));
await writeFile(resolve(out, "report.json"), JSON.stringify({ metadata, economics, budgets, results }, null, 2));
const pct = (p: number) => `${(100 * p).toFixed(3)}%`, money = (v: number) => v.toFixed(2);
const summary = `# Cobertura, costo y riesgo: carteras de Kino\n\n100,000 sorteos uniformes compartidos. Snapshot ${snapshot.targetDate}, algoritmo ${snapshot.algorithm}. Comparación condicionada a tres carteras fijas de 200 jugadas; no demuestra superioridad de un generador completo ni predicción.\n\n## Cobertura y pérdidas simuladas\n\n| Cartera | Alguna 7+ | Alguna 8+ | Premio menor que RD$5,000 | Premio cero | Mediana premio bruto |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${results.map(r => `| ${r.name} | ${pct(r.sevenRate)} | ${pct(r.eightRate)} | ${pct(r.lossRate)} | ${pct(r.zeroPrizeRate)} | RD$${money(r.grossQuantiles.p50)} |`).join("\n")}\n\n## Diferencia pareada en 7+ frente a la cartera guardada\n\n${results.slice(1).map(r => `- ${r.name}: ${pct(r.versusSavedSeven.difference)} puntos porcentuales; IC95% Monte Carlo ${r.versusSavedSeven.ci95.map(pct).join(" a ")} puntos.`).join("\n")}\n\nLos intervalos son aproximaciones normales pareadas por escenario. No incluyen variación entre semillas de carteras.\n\n## Concentración estructural\n\n| Cartera | Exposición mínima–máxima | Solapamiento medio | Parejas de jugadas que comparten 7+ números |\n| --- | ---: | ---: | ---: |\n${results.map(r => `| ${r.name} | ${r.structure.exposureMin}–${r.structure.exposureMax} | ${r.structure.meanOverlap.toFixed(3)} | ${r.structure.highOverlapPairs7} |`).join("\n")}\n\nMismo solapamiento medio puede ocultar concentraciones distintas. El reporte JSON contiene histogramas y cotas combinatorias; no son probabilidades alcanzadas.\n\n## Economía exacta bajo uniforme y tabla del snapshot\n\nTodas las carteras tienen el MISMO premio esperado: RD$${money(200 * economics.expectedGrossPerTicket)} bruto, neto RD$${money(200 * economics.expectedNetPerTicket)} y ROI esperado ${pct(economics.expectedRoi)} por cartera de 200. No es un ingreso asegurado ni un retorno típico. Tabla modelada del código, sin certificación oficial ni retenciones. No ordenar diseños por premios medios de una simulación corta: el jackpot es raro.\n\n| Jugadas | Costo | Bruto esperado | Neto esperado |\n| --- | ---: | ---: | ---: |\n${budgets.map(b => `| ${b.tickets} | RD$${money(b.cost)} | RD$${money(b.expectedGross)} | RD$${money(b.expectedNet)} |`).join("\n")}\n\nEscalar presupuesto no cambia el ROI esperado. La tabla no calcula cobertura de subconjuntos ni recomienda apostar.\n\nNo se modificaron carteras ni estrategias operativas. La comparación permite estudiar compromisos de cobertura y concentración; no demuestra rentabilidad ni elimina el riesgo.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary); console.log(summary); console.log(`Saved ${out}`);
