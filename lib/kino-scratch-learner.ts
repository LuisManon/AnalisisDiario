import { createHash } from "node:crypto";

/** Standalone synthetic learning experiment: no imports from other lottery algorithms. */
export const SCRATCH_VERSION = "kino-scratch-learner-v1";
export function scratchRandom(seed: string) {
  const hash = createHash("sha256").update(seed).digest();
  let a = hash.readUInt32LE(0), b = hash.readUInt32LE(4), c = hash.readUInt32LE(8), d = hash.readUInt32LE(12);
  const rotate = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
  return () => {
    const result = Math.imul(rotate(Math.imul(b, 5), 7), 9) >>> 0, t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rotate(d, 11);
    return result / 4294967296;
  };
}
export function scratchSample(random: () => number, count: number, weights?: readonly number[]) {
  if (!Number.isInteger(count) || count < 0 || count > 84 || (weights && (weights.length !== 84 || weights.some(w => !Number.isFinite(w) || w <= 0)))) throw new Error("Invalid bowl");
  const result: number[] = [], seen = new Uint8Array(84), max = weights ? Math.max(...weights) : 1;
  while (result.length < count) {
    const n = Math.floor(random() * 84);
    if (seen[n]) continue;
    if (weights && random() * max >= weights[n]) continue;
    result.push(n + 1); seen[n] = 1;
  }
  return result;
}
export type ScratchModel = { rate: number; steps: number; bias: number[]; context: number[] };
export type ScratchContext = { last: Uint8Array; gap: Uint32Array; draws: number };
export function newScratchModel(rate: number): ScratchModel {
  if (!Number.isFinite(rate) || rate <= 0 || rate > 0.1) throw new Error("Invalid learning rate");
  return { rate, steps: 0, bias: Array<number>(84).fill(0), context: [0, 0] };
}
export function newScratchContext(): ScratchContext { return { last: new Uint8Array(84), gap: new Uint32Array(84), draws: 0 }; }
function features(ctx: ScratchContext, i: number) {
  return [ctx.draws ? ctx.last[i] - 20 / 84 : 0, ctx.draws ? Math.min(ctx.gap[i], 30) / 30 : 0];
}
export function scratchWeights(model: ScratchModel, ctx: ScratchContext) {
  return model.bias.map((b, i) => {
    const f = features(ctx, i), score = Math.max(-2, Math.min(2, b + model.context[0] * f[0] + model.context[1] * f[1]));
    return 0.2 + 0.8 * Math.exp(score); // fixed exploration floor
  });
}
/** Full outcome feedback is used only after prediction, in training. */
export function scratchLearn(model: ScratchModel, ctx: ScratchContext, winning: number[]) {
  if (winning.length !== 20 || new Set(winning).size !== 20 || winning.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error("Invalid draw");
  const y = new Uint8Array(84); winning.forEach(n => y[n - 1] = 1);
  const rate = model.rate / Math.sqrt(1 + model.steps / 10000), gradients = [0, 0];
  const oldContext = [...model.context];
  for (let i = 0; i < 84; i++) {
    const f = features(ctx, i), score = Math.max(-2, Math.min(2, model.bias[i] + oldContext[0] * f[0] + oldContext[1] * f[1]));
    const p = 1 / (1 + Math.exp(-(Math.log(20 / 64) + score))), error = y[i] - p;
    model.bias[i] = Math.max(-2, Math.min(2, model.bias[i] + rate * (error - 0.01 * model.bias[i])));
    gradients[0] += error * f[0] / 84; gradients[1] += error * f[1] / 84;
  }
  for (let j = 0; j < 2; j++) model.context[j] = Math.max(-2, Math.min(2, oldContext[j] + rate * (gradients[j] - 0.01 * oldContext[j])));
  model.steps++;
}
export function scratchObserve(ctx: ScratchContext, winning: number[]) {
  if (winning.length !== 20 || new Set(winning).size !== 20 || winning.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error("Invalid draw");
  ctx.last.fill(0); for (let i = 0; i < 84; i++) ctx.gap[i]++;
  winning.forEach(n => { ctx.last[n - 1] = 1; ctx.gap[n - 1] = 0; }); ctx.draws++;
}
export function scratchHits(selection: number[], winning: number[]) {
  const present = new Set(winning); return selection.reduce((s, n) => s + Number(present.has(n)), 0);
}
export function scratchExactTicket() {
  const combination = (n: number, k: number) => {
    if (k < 0 || k > n) return 0;
    let result = 1; for (let j = 0; j < Math.min(k, n - k); j++) result = result * (n - j) / (j + 1); return result;
  };
  return Array.from({ length: 11 }, (_, hits) => combination(20, hits) * combination(64, 10 - hits) / combination(84, 10));
}

/** Frozen parameters; contexts can see preceding outcomes, never the target or future. */
export function evaluateScratch(models: ScratchModel[], iterations: number, seed: string, bowlWeights?: number[], progress?: (draws: number) => void) {
  if (!Number.isSafeInteger(iterations) || iterations < 2) throw new Error("Invalid evaluation budget");
  const before = JSON.stringify(models), ctx = newScratchContext(), drawRandom = scratchRandom(`${seed}/draw`);
  const selections = models.map((_, i) => scratchRandom(`${seed}/selection/${i}`)), baseline = scratchRandom(`${seed}/baseline`);
  const histogram = Array.from({ length: models.length + 1 }, () => Array<number>(11).fill(0));
  const paired = models.map(() => ({ sum: 0, squares: 0 }));
  for (let t = 0; t < iterations; t++) {
    const pools = models.map((m, i) => scratchSample(selections[i], 10, scratchWeights(m, ctx)));
    pools.push(scratchSample(baseline, 10));
    const winning = scratchSample(drawRandom, 20, bowlWeights), hits = pools.map(p => scratchHits(p, winning));
    hits.forEach((h, i) => histogram[i][h]++);
    paired.forEach((p, i) => { const difference = hits[i] - hits[models.length]; p.sum += difference; p.squares += difference * difference; });
    scratchObserve(ctx, winning);
    if (progress && (t + 1) % 100000 === 0) progress(t + 1);
  }
  if (before !== JSON.stringify(models)) throw new Error("Evaluation mutated frozen models");
  return { iterations, seed, models: histogram.map((h, i) => ({ index: i, baseline: i === models.length, histogram: h,
    meanHits: h.reduce((s, n, k) => s + n * k, 0) / iterations,
    maxHits: Math.max(...h.map((n, k) => n ? k : 0)), atLeast6: h.slice(6).reduce((s, n) => s + n, 0) / iterations,
    atLeast7: h.slice(7).reduce((s, n) => s + n, 0) / iterations, perfect10: h[10] })),
    versusUniform: paired.map(p => {
      const difference = p.sum / iterations, se = Math.sqrt(Math.max(0, p.squares - iterations * difference * difference) / (iterations - 1) / iterations);
      return { difference, ci95: [difference - 1.9599639845 * se, difference + 1.9599639845 * se] };
    }) };
}
