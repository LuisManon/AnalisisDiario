import type { LabDraw } from "./kino-bowl-lab.ts";

export const TAIL_VERSION = "kino-tail-formulas-v1";
export const tailFormulas = ["momentum7", "pair-residual"] as const;
export type TailFormula = typeof tailFormulas[number];
/** New exploratory rules: fixed parameters, prior dates only, never calibrated probabilities. */
export function formulaPool(history: readonly LabDraw[], target: string, formula: TailFormula) {
  const prior = history.filter(d => d.date < target).sort((a, b) => a.date.localeCompare(b.date));
  if (prior.length < 30) throw new Error("At least 30 previous draws required");
  const p = 20 / 84, alpha = 30;
  const count = (draws: readonly LabDraw[]) => {
    const result = Array<number>(84).fill(0);
    for (const draw of draws) for (const n of draw.numbers) result[n - 1]++;
    return result;
  };
  const counts = count(prior), base = counts.map(c => (c + alpha * p) / (prior.length + alpha));
  const selected: number[] = [];
  if (formula === "momentum7") {
    const recent = count(prior.slice(-7)), older = count(prior.slice(0, -7));
    // Disjoint windows: recent seven versus older history; fixed modest trend term.
    const scores = base.map((v, i) => v + 0.5 * ((recent[i] + alpha * p) / (7 + alpha) - (older[i] + alpha * p) / (prior.length - 7 + alpha)));
    selected.push(...Array.from({ length: 84 }, (_, i) => i + 1).sort((a, b) => scores[b - 1] - scores[a - 1] || a - b).slice(0, 20));
  } else {
    const pairs = new Uint16Array(84 * 84);
    for (const draw of prior) for (const a of draw.numbers) for (const b of draw.numbers) if (a !== b) pairs[(a - 1) * 84 + b - 1]++;
    // Correct independent marginal product for fixed-size uniform draws.
    const factor = 84 * 19 / (83 * 20), uniformPair = 20 * 19 / (84 * 83);
    const residual = (a: number, b: number) => (pairs[(a - 1) * 84 + b - 1] + alpha * uniformPair) / (prior.length + alpha) - factor * base[a - 1] * base[b - 1];
    for (let k = 0; k < 20; k++) {
      const score = (n: number) => base[n - 1] + (selected.length ? 0.5 * selected.reduce((s, other) => s + residual(n, other), 0) / selected.length : 0);
      const remaining = Array.from({ length: 84 }, (_, i) => i + 1).filter(n => !selected.includes(n));
      remaining.sort((a, b) => score(b) - score(a) || a - b);
      selected.push(remaining[0]);
    }
  }
  return { pool: selected.sort((a, b) => a - b), priorCount: prior.length, priorLastDate: prior.at(-1)!.date };
}
