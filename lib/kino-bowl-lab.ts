/** Offline pool-coverage research. No operational storage or prize calculations. */
export const BOWL_VERSION = "kino-bowl-lab-v1";
export type LabDraw = { date: string; numbers: number[] };
export const policies = ["uniform", "range10", "frequency"] as const;
export type Policy = typeof policies[number];
export function randomStream(seed: string) {
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0) throw new Error("Invalid combination");
  if (k < 0 || k > n) return 0;
  let value = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) value = value * (n - i + 1) / i;
  return value;
}
export function exactOverlap(n = 84, winners = 20, selected = 20) {
  if (![n, winners, selected].every(Number.isInteger) || n < 1 || winners < 0 || selected < 0 || winners > n || selected > n) throw new Error("Invalid population");
  return Array.from({ length: selected + 1 }, (_, k) => choose(winners, k) * choose(n - winners, selected - k) / choose(n, selected));
}
/** Rejection sampling: each next accepted ball has weight / remaining total weight. */
export function sampleBalls(random: () => number, weights: readonly number[], count = 20) {
  if (!Number.isInteger(count) || count < 0 || count > weights.length || weights.some(w => !Number.isFinite(w) || w <= 0)) throw new Error("Invalid bowl");
  const max = Math.max(...weights), seen = new Uint8Array(weights.length), result: number[] = [];
  while (result.length < count) {
    const i = Math.floor(random() * weights.length);
    if (!seen[i] && random() * max < weights[i]) { seen[i] = 1; result.push(i + 1); }
  }
  return result;
}
const uniformWeights = Array<number>(84).fill(1);
export function priorModel(history: readonly LabDraw[], target: string) {
  const prior = history.filter(d => d.date < target).sort((a, b) => a.date.localeCompare(b.date));
  const counts = Array<number>(84).fill(0);
  for (const d of prior) for (const n of d.numbers) counts[n - 1]++;
  // 30 equivalent uniform draws; no parameter tuning on outcomes.
  const weights = counts.map(c => (c + 30 * 20 / 84) / (prior.length + 30));
  const ranges = [0, 1, 2].map(r => weights.slice(r * 28, (r + 1) * 28).reduce((s, w) => s + w, 0));
  const dominant = ranges.indexOf(Math.max(...ranges)); // tie: lower range
  return { weights, dominant, priorCount: prior.length, priorLastDate: prior.at(-1)?.date ?? null };
}
export function selectPool(policy: Policy, random: () => number, model: ReturnType<typeof priorModel>) {
  if (policy === "uniform") return sampleBalls(random, uniformWeights);
  if (policy === "frequency") return sampleBalls(random, model.weights);
  return [0, 1, 2].flatMap(r => sampleBalls(random, Array<number>(28).fill(1), r === model.dominant ? 10 : 5).map(n => n + r * 28));
}
export function overlap(a: readonly number[], b: readonly number[]) {
  const present = new Set(b);
  return a.reduce((s, n) => s + Number(present.has(n)), 0);
}
export function wilson(success: number, total: number) {
  if (total <= 0) return null;
  const p = success / total, z = 1.959963984540054, z2 = z * z;
  const center = (p + z2 / (2 * total)) / (1 + z2 / total);
  const half = z * Math.sqrt(p * (1 - p) / total + z2 / (4 * total * total)) / (1 + z2 / total);
  return [center - half, center + half];
}
export function summarize(histogram: number[], uncertainty = true) {
  const draws = histogram.reduce((s, n) => s + n, 0), atLeast10 = histogram.slice(10).reduce((s, n) => s + n, 0);
  return { draws, histogram, mean: histogram.reduce((s, n, k) => s + n * k, 0) / draws,
    atLeast10, rate10: atLeast10 / draws, wilson95: uncertainty ? wilson(atLeast10, draws) : null };
}
export function simulateBowl(iterations: number, seed: string, model: ReturnType<typeof priorModel>, bias = 0) {
  if (!Number.isSafeInteger(iterations) || iterations < 1 || !Number.isFinite(bias) || bias < 0 || bias > 1) throw new Error("Invalid simulation budget/bias");
  const drawRandom = randomStream(`${seed}/draw`);
  const streams = policies.map(p => randomStream(`${seed}/selection/${p}`));
  const histograms = policies.map(() => Array<number>(21).fill(0));
  const weights = uniformWeights.map((w, i) => w + (Math.floor(i / 28) === model.dominant ? bias : 0));
  // Intentional synthetic range advantage, fixed before draws; never inferred physics.
  for (let i = 0; i < iterations; i++) {
    const pools = policies.map((p, k) => selectPool(p, streams[k], model));
    const winning = sampleBalls(drawRandom, weights);
    pools.forEach((pool, k) => histograms[k][overlap(pool, winning)]++);
  }
  return { iterations, seed, bias, policies: Object.fromEntries(policies.map((p, k) => [p, summarize(histograms[k])])) };
}
/** Finite real dates, not synthetic independent evidence. Repetitions average policy randomness only. */
export function walkForward(history: readonly LabDraw[], seed: string, repetitions = 100) {
  if (!Number.isSafeInteger(repetitions) || repetitions < 1) throw new Error("Invalid repetitions");
  const ordered = [...history].sort((a, b) => a.date.localeCompare(b.date));
  return ordered.filter(d => priorModel(ordered, d.date).priorCount >= 30).map(draw => {
    const model = priorModel(ordered, draw.date);
    const results = Object.fromEntries(policies.map(policy => {
      const histogram = Array<number>(21).fill(0);
      for (let r = 0; r < repetitions; r++) histogram[overlap(selectPool(policy, randomStream(`${seed}/${draw.date}/${policy}/${r}`), model), draw.numbers)]++;
      return [policy, summarize(histogram, false)];
    }));
    return { date: draw.date, priorCount: model.priorCount, priorLastDate: model.priorLastDate, dominantRange: model.dominant, results };
  });
}
