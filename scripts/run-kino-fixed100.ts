import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FIXED100_VERSION, balancedFixed100, optimizeFixed100, fixed100Structure, compileFixed100 } from "../lib/kino-fixed100.ts";
import { buildExperimentPortfolio } from "../lib/kino-experiment-strategies.ts";
import { randomStream, sampleBalls, wilson } from "../lib/kino-bowl-lab.ts";
import { exactTicketEconomics } from "../lib/kino-portfolio-risk.ts";
import { kinoSnapshotSchema } from "../lib/super-kino.ts";

const runId = process.argv[2] ?? "frozen-2026-11-14";
if (process.argv.length > 3 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id");
const seed = `${FIXED100_VERSION}/20261114`, iterations = 1_000_000;
const inputRaw = await readFile("data/super-kino-portfolios/2026-11-14.json", "utf8"), snapshot = kinoSnapshotSchema.parse(JSON.parse(inputRaw));
const protocol = await readFile("docs/experimentos/super-kino/fija100-v1/PROTOCOLO.md", "utf8");
const codeHash = createHash("sha256"), sources: { path: string; content: string }[] = [];
for (const path of ["scripts/run-kino-fixed100.ts", "lib/kino-fixed100.ts", "lib/kino-experiment-strategies.ts", "lib/kino-bowl-lab.ts", "lib/kino-math.ts", "lib/kino-portfolio-risk.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts"]) {
  const content = await readFile(path, "utf8"); sources.push({ path, content }); codeHash.update(path).update(content);
}
const base = balancedFixed100(seed), optimized = optimizeFixed100(base, seed, 20_000);
const names = ["fija100-optimizada", "equilibrada-inicial", "uniforme100"], portfolios = [optimized.tickets, base, buildExperimentPortfolio("uniform", `${FIXED100_VERSION}/uniform-control`).slice(0, 100)];
const structures = portfolios.map(fixed100Structure), economics = exactTicketEconomics(snapshot.prizes), cost = 100 * economics.ticketCost;
const frozen = { version: FIXED100_VERSION, seed, numbersPerTicket: 10, ticketCount: 100, costModel: cost, prizes: snapshot.prizes, tickets: optimized.tickets };
const frozenSha256 = createHash("sha256").update(JSON.stringify(frozen)).digest("hex");
const metadata = { version: FIXED100_VERSION, seed, iterations, drawSeed: `${FIXED100_VERSION}/evaluation`, optimizerAttempts: optimized.attempts, optimizerAccepted: optimized.accepted,
  codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), inputSha256: createHash("sha256").update(inputRaw).digest("hex"), frozenSha256,
  frozenAt: new Date().toISOString(), node: process.version, operational: false, rotation: "none" };
const out = resolve("experiments/super-kino/fija100-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
await writeFile(resolve(out, "protocol.md"), protocol); await writeFile(resolve(out, "sources.json"), JSON.stringify(sources));
await writeFile(resolve(out, "prize-input-snapshot.json"), inputRaw);
await writeFile(resolve(out, "cartera-fija-100.json"), JSON.stringify({ metadata, frozen }, null, 2));
await writeFile(resolve(out, "comparators.json"), JSON.stringify({ names, portfolios, structures }, null, 2));
await writeFile(resolve(out, "cartera-fija-100.csv"), "jugada,n1,n2,n3,n4,n5,n6,n7,n8,n9,n10\n" + optimized.tickets.map((t, i) => [i + 1, ...t].join(",")).join("\n") + "\n");
await writeFile(resolve(out, "CARTERA.md"), `# Cartera fija experimental de100 jugadas\n\nVersión ${FIXED100_VERSION}. Sin rotación ni activación operativa. Costo modelado RD$${cost} por sorteo. SHA-256 del contenido congelado: ${frozenSha256}.\n\n| Jugada | Números |\n| ---: | --- |\n${optimized.tickets.map((t, i) => `| ${i + 1} | ${t.map(n => String(n).padStart(2, "0")).join(" · ")} |`).join("\n")}\n`);
// All candidate and comparator combinations are persisted before the first evaluation draw.
const evaluationStartedAt = new Date().toISOString(), evaluate = portfolios.map(tickets => compileFixed100(tickets, snapshot.prizes));
const random = randomStream(metadata.drawSeed), weights = Array<number>(84).fill(1);
const stats = names.map(() => ({ seven: 0, eight: 0, loss: 0, zero: 0, maxHistogram: Array<number>(11).fill(0), grossCounts: new Map<number, number>() }));
const paired = names.slice(1).map(() => ({ sum7: 0, squares7: 0, sum8: 0, squares8: 0 }));
console.log(`Frozen ${frozenSha256}; evaluating ${iterations} NEW uniform draws, no portfolio tuning.`);
for (let i = 0; i < iterations; i++) {
  const winning = sampleBalls(random, weights), rows = evaluate.map(fn => fn(winning));
  rows.forEach((r, k) => {
    const a = stats[k]; a.seven += Number(r.maxHits >= 7); a.eight += Number(r.maxHits >= 8); a.loss += Number(r.gross < cost); a.zero += Number(r.gross === 0); a.maxHistogram[r.maxHits]++;
    a.grossCounts.set(r.gross, (a.grossCounts.get(r.gross) ?? 0) + 1);
    if (k > 0) {
      const d7 = Number(rows[0].maxHits >= 7) - Number(r.maxHits >= 7), d8 = Number(rows[0].maxHits >= 8) - Number(r.maxHits >= 8), p = paired[k - 1];
      p.sum7 += d7; p.squares7 += d7 * d7; p.sum8 += d8; p.squares8 += d8 * d8;
    }
  });
}
const interval = (sum: number, squares: number, z: number) => {
  const difference = sum / iterations, se = Math.sqrt(Math.max(0, squares - iterations * difference * difference) / (iterations - 1) / iterations);
  return { difference, ci: [difference - z * se, difference + z * se] };
};
const results = names.map((name, k) => {
  const a = stats[k], grossCounts = [...a.grossCounts.entries()].sort((a, b) => a[0] - b[0]);
  const quantile = (p: number) => { const target = Math.floor(p * (iterations - 1)); let cumulative = 0; for (const [value, n] of grossCounts) { cumulative += n; if (cumulative > target) return value; } throw new Error("Invalid gross histogram"); };
  return { name, structure: structures[k], sevenRate: a.seven / iterations, sevenWilson95: wilson(a.seven, iterations), eightRate: a.eight / iterations, eightWilson95: wilson(a.eight, iterations),
    lossRate: a.loss / iterations, zeroPrizeRate: a.zero / iterations, maxHistogram: a.maxHistogram, grossHistogram: grossCounts, grossQuantiles: { p05: quantile(0.05), p50: quantile(0.5), p95: quantile(0.95) } };
});
const comparisons = paired.map((p, i) => ({ reference: names[i + 1], sevenAdjusted975: interval(p.sum7, p.squares7, 2.2414027276), eightDescriptive95: interval(p.sum8, p.squares8, 1.9599639845) }));
const againstUniform = comparisons[1], passesExploratoryGate = againstUniform.sevenAdjusted975.difference >= 0.001 && againstUniform.sevenAdjusted975.ci[0] > 0
  && againstUniform.eightDescriptive95.difference >= -0.0002 && againstUniform.eightDescriptive95.ci[0] >= -0.0005;
await writeFile(resolve(out, "report.json"), JSON.stringify({ metadata, evaluationStartedAt, economics, cost, results, comparisons, passesExploratoryGate, adoption: "none; fixed experimental artifact only" }, null, 2));
const pct = (p: number) => `${(p * 100).toFixed(4)}%`, pp = (p: number) => (p * 100).toFixed(4);
const summary = `# Cartera fija100 V1\n\n100 jugadas únicas de10. Semilla fija, sin historial ni escenarios de entrenamiento, sin rotación por fecha. Costo modelado RD$${cost} por sorteo. Candidata congelada antes de un millón de sorteos uniformes de evaluación nuevos.\n\n## Cobertura medida\n\n| Cartera | Alguna7+ | Alguna8+ | Premio menor que costo | Mediana bruto RD$ |\n| --- | ---: | ---: | ---: | ---: |\n${results.map(r => `| ${r.name} | ${pct(r.sevenRate)} | ${pct(r.eightRate)} | ${pct(r.lossRate)} | ${r.grossQuantiles.p50} |`).join("\n")}\n\n## Candidata menos referencia: diferencias pareadas\n\n| Referencia | Diferencia7+ en pp | IC97.5% ajustado, pp | Diferencia8+ en pp | IC95% descriptivo, pp |\n| --- | ---: | --- | ---: | --- |\n${comparisons.map(r => `| ${r.reference} | ${pp(r.sevenAdjusted975.difference)} | ${r.sevenAdjusted975.ci.map(pp).join(" a ")} | ${pp(r.eightDescriptive95.difference)} | ${r.eightDescriptive95.ci.map(pp).join(" a ")} |`).join("\n")}\n\nDos comparaciones primarias, ajuste Bonferroni. Intervalos Monte Carlo condicionados a tres carteras fijas; no garantizan capacidad del generador ni física real. Puerta exploratoria frente a uniforme: ${passesExploratoryGate ? "superada" : "no superada"}; no autoriza adopción.\n\n## Fundamento matemático\n\n76 números aparecen12 veces y8 aparecen11. Se aceptaron ${optimized.accepted} de20,000 intentos de intercambio preservando exposición. Suma de intersecciones7+ inicial ${structures[1].sevenBounds.pairIntersectionSum.toFixed(8)}, final ${structures[0].sevenBounds.pairIntersectionSum.toFixed(8)}. Una menor suma mejora una cota, no prueba cobertura óptima.\n\nCota de unión7+ candidata: ${pct(structures[0].sevenBounds.bonferroniLower)} a ${pct(structures[0].sevenBounds.unionUpper)}, evaluada numéricamente con combinatoria exacta. Cota8+: ${pct(structures[0].eightBounds.bonferroniLower)} a ${pct(structures[0].eightBounds.unionUpper)}. No confundir cotas con probabilidad alcanzada.\n\nTodas las carteras100 tienen igual premio bruto esperado RD$${(100 * economics.expectedGrossPerTicket).toFixed(2)}, neto RD$${(100 * economics.expectedNetPerTicket).toFixed(2)} y ROI esperado ${pct(economics.expectedRoi)} bajo uniforme y tabla del snapshot. No son retornos típicos ni garantizados; no se certificó tabla oficial ni retenciones.\n\n## Cartera congelada\n\nSHA-256: ${frozenSha256}. Archivos CARTERA.md, cartera-fija-100.csv y cartera-fija-100.json preservan exactamente las100 jugadas. No se rotan al ganar/perder y no se activan en producción. Repetirlas no cambia su probabilidad por sorteo ni vuelve más probable un premio después de pérdidas. No se garantiza10,7 ni8 aciertos.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary); console.log(summary); console.log(`Saved ${out}`);
