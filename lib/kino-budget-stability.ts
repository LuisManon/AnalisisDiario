import { randomStream } from "./kino-bowl-lab.ts";

export type StabilityRow = { date: string; seed: number; budget: number; randomRate: number; coverageRate: number };
/** Group seeds by snapshot first. Intervals describe this selected set, not a random sample of all portfolios. */
export function summarizeStability(rows: StabilityRow[], bootstrapSeed: string, replicates = 6000) {
  if (!rows.length || !Number.isSafeInteger(replicates) || replicates < 100) throw new Error("Insufficient bootstrap input");
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.date || !Number.isSafeInteger(row.seed) || !Number.isSafeInteger(row.budget) || row.budget < 1 || row.budget > 200 || ![row.randomRate, row.coverageRate].every(p => Number.isFinite(p) && p >= 0 && p <= 1)) throw new Error("Invalid stability row");
    const key = `${row.date}/${row.seed}/${row.budget}`;
    if (seen.has(key)) throw new Error("Duplicate replicate"); seen.add(key);
  }
  const budgets = [...new Set(rows.map(r => r.budget))].sort((a, b) => a - b);
  const dates = [...new Set(rows.map(r => r.date))].sort();
  if (dates.length < 2) throw new Error("Need multiple snapshot dates");
  // Keep the same cluster resamples across budgets for their shared dependence.
  const random = randomStream(bootstrapSeed);
  const samples = Array.from({ length: replicates }, () => dates.map(() => Math.floor(random() * dates.length)));
  const alpha = 0.05 / budgets.length;
  return budgets.map(budget => {
    const byDate = dates.map(date => {
      const group = rows.filter(r => r.budget === budget && r.date === date);
      if (!group.length) throw new Error("Missing snapshot/budget");
      const mean = (f: (r: StabilityRow) => number) => group.reduce((s, r) => s + f(r), 0) / group.length;
      return { date, seeds: group.length, randomRate: mean(r => r.randomRate), coverageRate: mean(r => r.coverageRate), difference: mean(r => r.coverageRate - r.randomRate) };
    });
    const deltas = byDate.map(r => r.difference), n = dates.length;
    const distribution = samples.map(sample => sample.reduce((s, i) => s + deltas[i], 0) / n).sort((a, b) => a - b);
    const quantile = (p: number) => {
      const i = p * (distribution.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
      return distribution[lo] + (distribution[hi] - distribution[lo]) * (i - lo);
    };
    const difference = deltas.reduce((s, d) => s + d, 0) / n, interval = [quantile(alpha / 2), quantile(1 - alpha / 2)];
    const positiveDates = deltas.filter(d => d > 0).length;
    // Prior pilot gate only; never authorization to adopt.
    const passesExploratoryGate = difference >= 0.001 && interval[0] > 0 && positiveDates >= Math.ceil(0.7 * n) && Math.min(...deltas) >= -0.001;
    return { budget, snapshots: n, subsetReplicates: rows.filter(r => r.budget === budget).length, byDate,
      randomRate: byDate.reduce((s, r) => s + r.randomRate, 0) / n, coverageRate: byDate.reduce((s, r) => s + r.coverageRate, 0) / n,
      difference, positiveDates, minDateDifference: Math.min(...deltas), maxDateDifference: Math.max(...deltas), adjustedClusterInterval: interval,
      bootstrapReplicates: replicates, comparisons: budgets.length, perBudgetCoverage: 1 - alpha, passesExploratoryGate };
  });
}
