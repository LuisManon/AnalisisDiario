import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { prepareKinoExperimentData } from "../lib/kino-experiment-data.ts";
import { exactOverlap, overlap, randomStream, sampleBalls, summarize } from "../lib/kino-bowl-lab.ts";
import { formulaPool, tailFormulas, TAIL_VERSION } from "../lib/kino-tail-formulas.ts";

export async function runTailFormulas(args = process.argv.slice(2)) {
  const runId = args[0] ?? "baseline-2026-11-13";
  if (args.length > 1 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id argument");
  const cutoff = "2026-11-13", iterations = 2_000_000, seed = `${TAIL_VERSION}/20261114`;
  const data = prepareKinoExperimentData(JSON.parse(await readFile("data/super-kino-results.json", "utf8")), { cutoff });
  const protocol = await readFile("docs/experimentos/super-kino/formulas-cola-v1/PROTOCOLO.md", "utf8");
  const codeHash = createHash("sha256");
  for (const f of ["lib/kino-tail-formulas.ts", "lib/kino-bowl-lab.ts", "lib/kino-experiment-data.ts", "scripts/run-kino-tail-formulas.ts"]) codeHash.update(f).update(await readFile(f));
  const metadata = { version: TAIL_VERSION, cutoff, iterations, seed, target: 0.01, generatedAt: new Date().toISOString(), node: process.version,
    dataSha256: data.sha256, codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), source: data.metadata };
  const out = resolve("experiments/super-kino/formulas-cola-v1", runId);
  await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
  await writeFile(resolve(out, "metadata.json"), JSON.stringify(metadata, null, 2));
  await writeFile(resolve(out, "protocol.md"), protocol);
  await writeFile(resolve(out, "history.json"), JSON.stringify(data.draws));
  const historical = tailFormulas.map(formula => {
    const rows = data.draws.slice(30).map(draw => {
      const selection = formulaPool(data.draws, draw.date, formula);
      return { date: draw.date, ...selection, hits: overlap(selection.pool, draw.numbers) };
    });
    const histogram = Array<number>(21).fill(0);
    for (const r of rows) histogram[r.hits]++;
    return { formula, rows, summary: summarize(histogram) };
  });
  const pools = [sampleBalls(randomStream(`${seed}/reference`), Array(84).fill(1)), ...tailFormulas.map(f => formulaPool(data.draws, "9999-12-31", f).pool)];
  const names = ["uniform-reference", ...tailFormulas], masks = pools.map(pool => { const mask = new Uint8Array(85); pool.forEach(n => mask[n] = 1); return mask; });
  const histograms = pools.map(() => Array<number>(21).fill(0)), random = randomStream(`${seed}/draws`);
  console.log(`Evaluating ${historical[0].rows.length} real dates and ${iterations} uniform draws; no parameter search.`);
  for (let i = 0; i < iterations; i++) {
    const winning = sampleBalls(random, Array(84).fill(1));
    for (let k = 0; k < pools.length; k++) histograms[k][winning.reduce((s, n) => s + masks[k][n], 0)]++;
  }
  const synthetic = names.map((name, k) => ({ name, pool: pools[k], summary: summarize(histograms[k]) }));
  const exact = exactOverlap().slice(10).reduce((s, p) => s + p, 0);
  const report = { metadata, exactUniformRate10: exact, historical, synthetic, adoption: "none; exploratory history and uniform simulation cannot establish the target" };
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
  const pct = (p: number) => `${(p * 100).toFixed(4)}%`;
  const summary = `# Nuevas fórmulas: objetivo 1%\n\nObjetivo fijo: un grupo de 20 que contenga 10+ ganadores. No se ensayaron otras semillas ni se reajustaron pesos después de evaluar.\n\n## Dos millones de sorteos uniformes compartidos\n\nReferencia exacta para TODO pool de 20: ${pct(exact)}.\n\n| Fórmula | Media | Casos 10+ | Tasa | Wilson95% Monte Carlo |\n| --- | ---: | ---: | ---: | --- |\n${synthetic.map(r => `| ${r.name} | ${r.summary.mean.toFixed(4)} | ${r.summary.atLeast10} | ${pct(r.summary.rate10)} | ${r.summary.wilson95!.map(pct).join("–")} |`).join("\n")}\n\nLos pools se fijan con el histórico al corte; el control no mide adaptación a un bowl físico. Ninguna fórmula puede cambiar la probabilidad marginal uniforme por seleccionar otro grupo.\n\n## Retrospectiva de ${historical[0].rows.length} sorteos reales\n\n| Fórmula | Media | Fechas con 10+ | Tasa observada | Wilson95% orientativo |\n| --- | ---: | ---: | ---: | --- |\n${historical.map(r => `| ${r.formula} | ${r.summary.mean.toFixed(4)} | ${r.summary.atLeast10}/${r.summary.draws} | ${pct(r.summary.rate10)} | ${r.summary.wilson95!.map(pct).join("–")} |`).join("\n")}\n\nHistoria ya conocida, sin reserva intacta. Los intervalos históricos asumen independencia y no corrigen búsqueda adaptativa ni comparaciones múltiples. No bastan para afirmar rendimiento futuro. Treinta fechas no permiten estimar una tasa rara de 1% con precisión útil.\n\n## Decisión\n\nNo se demuestra el objetivo de 1%, no se adopta ninguna regla y no se cambian carteras operativas. La alternativa de ampliar a 23 números tiene probabilidad exacta ${(100 * exactOverlap(84, 20, 23).slice(10).reduce((s, p) => s + p, 0)).toFixed(4)}%, pero CAMBIA el objetivo de un grupo de 20; no se presenta como éxito de estas fórmulas ni se activa. Repetir el histórico buscando una fórmula que dé 1% sería selección retrospectiva, no evidencia independiente.\n`;
  await writeFile(resolve(out, "SUMMARY.md"), summary);
  console.log(summary); console.log(`Saved ${out}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runTailFormulas();
