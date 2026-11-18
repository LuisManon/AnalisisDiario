import { jointThresholdProbability } from "./kino-math.ts";
import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";
import { randomStream } from "./kino-bowl-lab.ts";

/** Nested subsets of a saved portfolio; never uses winning outcomes. */
export function orderBudgetTickets(tickets: number[][], mode: "random" | "coverage", seed: string) {
  validateExperimentPortfolio(tickets);
  const random = randomStream(seed), remaining = Array.from({ length: 200 }, (_, i) => i);
  for (let i = 199; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [remaining[i], remaining[j]] = [remaining[j], remaining[i]]; }
  if (mode === "random") return remaining;
  const q = Array.from({ length: 11 }, (_, overlap) => jointThresholdProbability({ universe: 84, drawSize: 20, ticketSize: 10, threshold: 7 }, overlap));
  const flags = tickets.map(t => new Set(t)), exposure = Array<number>(85).fill(0), scores = Array<number>(200).fill(0), order: number[] = [];
  while (remaining.length) {
    // Primary: minimize added pairwise intersection probability for the 7+ event.
    // Secondary: minimize increase in squared exposure. Ties follow fixed shuffled order.
    let best = 0;
    const exposureIncrement = (i: number) => tickets[i].reduce((s, n) => s + 2 * exposure[n] + 1, 0);
    for (let k = 1; k < remaining.length; k++) {
      const a = remaining[k], b = remaining[best];
      if (scores[a] < scores[b] || (scores[a] === scores[b] && exposureIncrement(a) < exposureIncrement(b))) best = k;
    }
    const next = remaining.splice(best, 1)[0]; order.push(next);
    tickets[next].forEach(n => exposure[n]++);
    remaining.forEach(i => { scores[i] += q[tickets[i].filter(n => flags[next].has(n)).length]; });
  }
  return order;
}

export function prepareBudgetEvaluator(tickets: number[][], budgets: readonly number[], prizes: readonly { hits: number; amount: number }[]) {
  validateExperimentPortfolio(tickets);
  if (!budgets.length || budgets.some((n, i) => !Number.isInteger(n) || n < 1 || n > 200 || (i > 0 && n <= budgets[i - 1]))) throw new Error("Budgets must increase within 1..200");
  const copied = tickets.map(t => [...t]), payout = Array<number>(11).fill(0);
  for (const p of prizes) {
    if (!Number.isInteger(p.hits) || p.hits < 0 || p.hits > 10 || !Number.isFinite(p.amount) || p.amount < 0) throw new Error("Invalid prize");
    payout[p.hits] = p.amount;
  }
  return (winning: number[]) => {
    if (winning.length !== 20 || new Set(winning).size !== 20 || winning.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error("Invalid winning draw");
    const flags = new Uint8Array(85); winning.forEach(n => flags[n] = 1);
    const results: { tickets: number; maxHits: number; gross: number }[] = [];
    let gross = 0, maxHits = 0, next = 0;
    for (let i = 0; i < budgets[budgets.length - 1]; i++) {
      const hits = copied[i].reduce((s, n) => s + flags[n], 0);
      maxHits = Math.max(maxHits, hits); gross += payout[hits];
      if (i + 1 === budgets[next]) { results.push({ tickets: i + 1, maxHits, gross }); next++; }
    }
    return results;
  };
}
