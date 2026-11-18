import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SCRATCH_VERSION, scratchRandom, scratchSample, scratchWeights, scratchLearn, scratchObserve, scratchHits, newScratchContext, newScratchModel, evaluateScratch, scratchExactTicket, type ScratchModel } from "../lib/kino-scratch-learner.ts";

const runId = process.argv[2] ?? "from-zero-2026-11-14";
if (process.argv.length > 3 || !/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Use a simple run-id");
const seed = `${SCRATCH_VERSION}/20261114`, rates = [0.002, 0.01, 0.05], models = rates.map(newScratchModel);
const protocol = await readFile("docs/experimentos/super-kino/desde-cero-v1/PROTOCOLO.md", "utf8");
const sources: { path: string; content: string }[] = [], codeHash = createHash("sha256");
for (const path of ["lib/kino-scratch-learner.ts", "scripts/run-kino-scratch-learner.ts"]) {
  const content = await readFile(path, "utf8"); sources.push({ path, content }); codeHash.update(path).update(content);
}
const metadata = { version: SCRATCH_VERSION, seed, rates, training: 1_000_000, validation: 250_000, finalTest: 2_000_000, positiveTraining: 100_000, positiveTest: 100_000,
  totalDistinctSyntheticDraws: 3_450_000, realHistoryUsed: false, previousAlgorithmImports: false, codeSha256: codeHash.digest("hex"), protocolSha256: createHash("sha256").update(protocol).digest("hex"), createdAt: new Date().toISOString(), node: process.version, operationalWrites: false };
const out = resolve("experiments/super-kino/desde-cero-v1", runId);
await mkdir(resolve(out, ".."), { recursive: true }); await mkdir(out);
const save = async (file: string, data: unknown) => writeFile(resolve(out, file), JSON.stringify(data, null, 2));
await save("metadata.json", metadata); await save("sources.json", sources); await writeFile(resolve(out, "protocol.md"), protocol);
await save("initial-models.json", models); await save("status.json", { state: "running", phase: "training" });

function trainSynthetic(learners: ScratchModel[], iterations: number, phaseSeed: string, bowlWeights?: number[]) {
  const ctx = newScratchContext(), drawRandom = scratchRandom(`${phaseSeed}/draw`), baselineRandom = scratchRandom(`${phaseSeed}/baseline`);
  const streams = learners.map((_, i) => scratchRandom(`${phaseSeed}/selection/${i}`));
  const checkpoints: { draws: number; models: ScratchModel[] }[] = [{ draws: 0, models: structuredClone(learners) }];
  const curve: { from: number; to: number; histogram: number[][]; means: number[] }[] = [];
  let histogram = Array.from({ length: learners.length + 1 }, () => Array<number>(11).fill(0));
  for (let t = 0; t < iterations; t++) {
    const pools = learners.map((m, i) => scratchSample(streams[i], 10, scratchWeights(m, ctx)));
    pools.push(scratchSample(baselineRandom, 10));
    const winning = scratchSample(drawRandom, 20, bowlWeights);
    pools.forEach((p, i) => histogram[i][scratchHits(p, winning)]++);
    learners.forEach(m => scratchLearn(m, ctx, winning)); scratchObserve(ctx, winning);
    if ((t + 1) % 100000 === 0) {
      curve.push({ from: t + 1 - 100000, to: t + 1, histogram, means: histogram.map(h => h.reduce((s, n, k) => s + n * k, 0) / 100000) });
      checkpoints.push({ draws: t + 1, models: structuredClone(learners) });
      histogram = Array.from({ length: learners.length + 1 }, () => Array<number>(11).fill(0));
      console.log(`Training ${phaseSeed}: ${t + 1}/${iterations}`);
    }
  }
  return { curve, checkpoints };
}

const training = trainSynthetic(models, metadata.training, `${seed}/training`);
await save("training.json", training); await save("trained-models.json", models);
await save("status.json", { state: "running", phase: "validation" });
const validation = evaluateScratch(models, metadata.validation, `${seed}/validation`, undefined, n => console.log(`Validation ${n}/${metadata.validation}`));
await save("validation.json", validation);
let selected = 0;
for (let i = 1; i < rates.length; i++) if (validation.models[i].meanHits > validation.models[selected].meanHits) selected = i;
const selectedModel = structuredClone(models[selected]), frozenSha256 = createHash("sha256").update(JSON.stringify(selectedModel)).digest("hex");
const frozen = { selectedIndex: selected, selectedRate: rates[selected], reason: "Highest validation mean; final training checkpoint only", frozenAt: new Date().toISOString(), frozenSha256, model: selectedModel };
await save("selected-model.json", frozen);
await save("example-selection-10.json", { kind: "synthetic-example-not-a-real-draw-recommendation", frozenSha256, numbers: scratchSample(scratchRandom(`${seed}/example`), 10, scratchWeights(selectedModel, newScratchContext())).sort((a, b) => a - b) });
await save("status.json", { state: "running", phase: "final-test", frozenSha256 });
console.log(`Frozen rate ${rates[selected]}, ${frozenSha256}; opening final test once.`);
const finalTest = evaluateScratch([selectedModel], metadata.finalTest, `${seed}/final-test`, undefined, n => console.log(`Final test ${n}/${metadata.finalTest}`));
await save("final-test.json", finalTest);
const hiddenNumbers = scratchSample(scratchRandom(`${seed}/positive-control/truth`), 10), hidden = new Set(hiddenNumbers);
const bowlWeights = Array.from({ length: 84 }, (_, i) => hidden.has(i + 1) ? 2 : 1), positiveModel = newScratchModel(0.01);
const positiveTraining = trainSynthetic([positiveModel], metadata.positiveTraining, `${seed}/positive-training`, bowlWeights);
const positiveFrozen = structuredClone(positiveModel);
await save("positive-control-frozen.json", { kind: "invented-bias-for-learning-validation-only", hiddenNumbers, bowlWeights, frozenAt: new Date().toISOString(), model: positiveFrozen, training: positiveTraining });
const positiveTest = evaluateScratch([positiveFrozen], metadata.positiveTest, `${seed}/positive-test`, bowlWeights);
await save("positive-control-test.json", positiveTest);
const difference = finalTest.versusUniform[0], passesExploratoryGate = difference.difference >= 0.01 && difference.ci95[0] > 0;
const exact = scratchExactTicket();
await save("report.json", { metadata, exact: { histogram: exact, mean: 200 / 84, perfect10: exact[10] }, frozen,
  trainingCurve: training.curve, validation, finalTest, positiveTest, passesExploratoryGate,
  interpretation: "Only synthetic data. Artificial positive control is not evidence of bias or predictability of the real lottery." });
const pct = (n: number) => `${(100 * n).toFixed(5)}%`, table = (result: typeof finalTest) => result.models.map(m => `| ${m.baseline ? "Aleatorio10" : "Modelo aprendido"} | ${m.meanHits.toFixed(6)} | ${pct(m.atLeast6)} | ${pct(m.atLeast7)} | ${m.maxHits} | ${m.perfect10} |`).join("\n");
const summary = `# Algoritmo desde cero: aprendizaje de selecciones10\n\n3,450,000 sorteos sintéticos, sin histórico real ni importación de algoritmos anteriores. Cada predicción contiene10 números; ganador20 de84 sin reemplazo. No son carteras100 ni pools20.\n\n## Aprendizaje y selección\n\n1,000,000 sorteos de entrenamiento,250,000 de validación. Tasas prefijadas ${rates.join("/")}; elegida ${rates[selected]} por media de validación. Modelo congelado antes de2,000,000 de prueba final. No se eligió un checkpoint ganador ni se reajustó tras el test.\n\n| Tasa | Media de validación |\n| --- | ---: |\n${rates.map((rate, i) => `| ${rate} | ${validation.models[i].meanHits.toFixed(6)} |`).join("\n")}\n\n## Prueba final uniforme, dos millones nuevos\n\nReferencia exacta: media ${(200 / 84).toFixed(6)}, P(10perfectos) ${pct(exact[10])}, aproximadamente1/${(1 / exact[10]).toFixed(0)}.\n\n| Método | Media de aciertos | 6+ | 7+ | Máximo | Casos10perfectos |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${table(finalTest)}\n\nDiferencia media aprendida−aleatoria: ${difference.difference.toFixed(6)}, IC95% Monte Carlo ${difference.ci95.map(v => v.toFixed(6)).join(" a ")}. Criterio≥0.01 y límite inferior>0: ${passesExploratoryGate ? "superado" : "no superado"}. Es error condicionado al mundo simulado, no prueba de capacidad del generador físico.\n\n## Control positivo separado: patrón introducido deliberadamente\n\nDiez bolas tienen peso2 y las demás1. El predictor no recibe esas identidades ni pesos: aprende de100,000 ganadores, luego se congela y evalúa100,000 nuevos. Este mundo artificial NO se atribuye al sorteo real.\n\n| Método | Media de aciertos | 6+ | 7+ | Máximo | Casos10perfectos |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${table(positiveTest)}\n\nDiferencia media en control artificial: ${positiveTest.versusUniform[0].difference.toFixed(6)}. No mezclar esta mejora con la prueba uniforme.\n\n## Trazabilidad y decisión\n\nEntrenamiento, validación, prueba final y control usan flujos distintos. Pesos no cambian durante validación/test; contextos solo ven resultados previos. Semilla ${seed}, modelo SHA-256 ${frozenSha256}. Curvas, checkpoints, modelo, fuentes, protocolo y agregados guardados. Sin lectura de data/, premios ni cambios operativos. No aumentar presupuesto o cambiar semilla después de ver el resultado.\n`;
await writeFile(resolve(out, "SUMMARY.md"), summary);
await save("status.json", { state: "completed", completedAt: new Date().toISOString(), frozenSha256 });
console.log(summary); console.log(`Saved ${out}`);
