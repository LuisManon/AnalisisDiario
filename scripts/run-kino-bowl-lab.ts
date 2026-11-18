import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BOWL_VERSION, exactOverlap, priorModel, simulateBowl, walkForward, policies } from "../lib/kino-bowl-lab.ts";
import { prepareKinoExperimentData } from "../lib/kino-experiment-data.ts";

export async function runLab(args = process.argv.slice(2)) {
  const options = new Map(args.map(arg => { const at = arg.indexOf("="); if (!arg.startsWith("--") || at < 0) throw new Error("Use --key=value"); return [arg.slice(2, at), arg.slice(at + 1)]; }));
  for (const key of options.keys()) if (!["iterations", "seed", "cutoff", "run-id"].includes(key)) throw new Error(`Unknown option ${key}`);
  const iterations = Number(options.get("iterations") ?? 1_000_000), seed = options.get("seed") ?? `${BOWL_VERSION}/20261114`;
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 100_000_000) throw new Error("Iterations: 1..100000000 per scenario");
  const cutoff = options.get("cutoff") ?? "2026-11-13", runId = options.get("run-id") ?? `${cutoff}-${iterations}`;
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Invalid run-id");
  const snapshot = prepareKinoExperimentData(JSON.parse(await readFile("data/super-kino-results.json", "utf8")), { cutoff });
  const protocol = await readFile("docs/experimentos/super-kino/bowl-lab-v1/PROTOCOLO.md", "utf8");
  const codeHash = createHash("sha256");
  for (const path of ["lib/kino-bowl-lab.ts", "lib/kino-experiment-data.ts", "lib/super-kino.ts", "lib/super-kino-v133.ts", "scripts/run-kino-bowl-lab.ts"]) codeHash.update(path).update(await readFile(path));
  const out = resolve("experiments/super-kino/bowl-lab-v1", runId);
  await mkdir(resolve(out, ".."), { recursive: true });
  await mkdir(out); // refuse overwriting any completed or interrupted run
  const model = priorModel(snapshot.draws, "9999-12-31"), exact = exactOverlap();
  const metadata = { version: BOWL_VERSION, seed, iterationsPerScenario: iterations, cutoff,
    data: snapshot.metadata, dataSha256: snapshot.sha256, codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"),
    node: process.version, generatedAt: new Date().toISOString(), target: "at-least-10-winners-in-selected-20", operational: false };
  await writeFile(resolve(out, "protocol.md"), protocol);
  await writeFile(resolve(out, "history.json"), JSON.stringify(snapshot.draws));
  await writeFile(resolve(out, "metadata.json"), JSON.stringify(metadata, null, 2));
  console.log(`Running ${iterations} uniform + ${iterations} artificial-bias draws`);
  const uniform = simulateBowl(iterations, `${seed}/uniform`, model);
  console.log("Uniform scenario completed");
  const stress = simulateBowl(iterations, `${seed}/artificial-bias`, model, 0.20);
  const historical = walkForward(snapshot.draws, seed);
  const historicalSummary = Object.fromEntries(policies.map(p => [p, {
    realDates: historical.length, mean: historical.reduce((s, d) => s + d.results[p].mean, 0) / historical.length,
    rate10: historical.reduce((s, d) => s + d.results[p].rate10, 0) / historical.length,
    uncertainty: "100 selections/date are not independent real draws; no binomial interval across repetitions" }]));
  const report = { metadata, model, exact: { mean: 400 / 84, histogram: exact, rate10: exact.slice(10).reduce((s, p) => s + p, 0) }, uniform, stress, historicalSummary, historical };
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
  const table = (scenario: typeof uniform) => policies.map(p => { const r = scenario.policies[p]; return `| ${p} | ${r.mean.toFixed(4)} | ${r.atLeast10} | ${(100 * r.rate10).toFixed(4)}% | ${r.wilson95!.map(v => (100 * v).toFixed(4)).join("–")}% |`; }).join("\n");
  const summary = `# Bowl lab V1\n\nDos escenarios de ${iterations.toLocaleString("en-US")} sorteos cada uno. Objetivo: 10+ ganadores dentro del grupo de 20, no una jugada ganadora de 10.\n\n## Bowl uniforme\n\nReferencia exacta: ${(100 * report.exact.rate10).toFixed(6)}%; media ${(400 / 84).toFixed(4)}.\n\n| Selector | Media | Sorteos 10+ | Tasa | Wilson95% Monte Carlo |\n| --- | ---: | ---: | ---: | --- |\n${table(uniform)}\n\n## Sesgo artificial de 20% en peso de un rango\n\nEscenario inventado para sensibilidad: el selector conoce el rango favorecido. No describe ni estima la física real ni evidencia ventaja predictiva.\n\n| Selector | Media | Sorteos 10+ | Tasa | Wilson95% Monte Carlo |\n| --- | ---: | ---: | ---: | --- |\n${table(stress)}\n\n## Histórico real, retrospectiva caminante\n\n${snapshot.metadata.drawCount} registros del régimen observado, ${historical.length} fechas evaluadas tras 30 de calentamiento. Cien selecciones por fecha promedian la aleatoriedad; NO son cien sorteos reales nuevos. Historia ya explorada, sin reserva intacta.\n\n| Selector | Media de aciertos | Tasa media 10+ |\n| --- | ---: | ---: |\n${policies.map(p => `| ${p} | ${historicalSummary[p].mean.toFixed(4)} | ${(100 * historicalSummary[p].rate10).toFixed(4)}% |`).join("\n")}\n\nNo se activa ninguna candidata. Más simulaciones reducen error Monte Carlo bajo el modelo elegido; no crean información sobre sorteos reales. No reducir el presupuesto por encontrar una corrida favorable. Se necesita validación futura con reglas congeladas para afirmar mejora.\n`;
  await writeFile(resolve(out, "SUMMARY.md"), summary);
  console.log(summary); console.log(`Saved ${out}`);
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runLab();
