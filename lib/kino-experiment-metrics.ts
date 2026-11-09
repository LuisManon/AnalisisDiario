/** Offline experimental metrics: the independent evaluation unit is a draw/portfolio, not a ticket. */
export type PortfolioEvaluation = {
  meanHits: number;
  maxHits: number;
  atLeast6: boolean;
  atLeast7: boolean;
  atLeast8: boolean;
  histogram: number[];
};

function validateNumbers(numbers: number[], length: number, label: string) {
  if (numbers.length !== length || new Set(numbers).size !== length ||
      numbers.some(number => !Number.isInteger(number) || number < 1 || number > 84)) {
    throw new Error(`${label}: expected ${length} unique integers in 1..84`);
  }
}

export function evaluatePortfolio(tickets: number[][], winning: number[]): PortfolioEvaluation {
  return preparePortfolioEvaluator(tickets)(winning);
}

/** Validate and copy once for large synthetic runs; callers cannot mutate the prepared tickets. */
export function preparePortfolioEvaluator(tickets: number[][]): (winning: number[]) => PortfolioEvaluation {
  if (tickets.length !== 200) throw new Error("Portfolio: expected 200 tickets");
  const seenTickets = new Set<string>();
  const frozenTickets = tickets.map(ticket => {
    validateNumbers(ticket, 10, "Ticket");
    const canonical = [...ticket].sort((a, b) => a - b).join(",");
    if (seenTickets.has(canonical)) throw new Error("Portfolio: duplicate ticket");
    seenTickets.add(canonical);
    return [...ticket];
  });
  return winning => {
    validateNumbers(winning, 20, "Winning numbers");
    const winners = new Uint8Array(85);
    for (const number of winning) winners[number] = 1;
    const histogram = Array<number>(11).fill(0);
    let total = 0;
    let maxHits = 0;
    for (const ticket of frozenTickets) {
      let hits = 0;
      for (const number of ticket) hits += winners[number];
      histogram[hits] += 1;
      total += hits;
      maxHits = Math.max(maxHits, hits);
    }
    return {meanHits: total / frozenTickets.length, maxHits, atLeast6: maxHits >= 6,
      atLeast7: maxHits >= 7, atLeast8: maxHits >= 8, histogram};
  };
}

export const compilePortfolio = preparePortfolioEvaluator;

export function summarizeEvaluations(rows: PortfolioEvaluation[]) {
  if (!rows.length) throw new Error("At least one evaluated draw/portfolio is required");
  const mean = (value: (row: PortfolioEvaluation) => number) => rows.reduce((sum, row) => sum + value(row), 0) / rows.length;
  return {
    draws: rows.length,
    meanHits: mean(row => row.meanHits),
    meanMax: mean(row => row.maxHits),
    atLeast6Rate: mean(row => Number(row.atLeast6)),
    atLeast7Rate: mean(row => Number(row.atLeast7)),
    atLeast8Rate: mean(row => Number(row.atLeast8)),
    histogram: Array.from({length: 11}, (_, hits) => rows.reduce((sum, row) => sum + row.histogram[hits], 0)),
  };
}

/** Resamples paired draws, preserving the correlation between strategies facing the same result.
 * Synthetic intervals describe Monte Carlo uncertainty conditional on tested portfolios;
 * they do not establish generalization across portfolios or a predictive advantage.
 */
export function pairedDifference(rowsA: PortfolioEvaluation[], rowsB: PortfolioEvaluation[], metric: "maxHits" | "atLeast7" | "atLeast8") {
  if (!rowsA.length || rowsA.length !== rowsB.length) throw new Error("Paired evaluations require equal, nonempty lengths in the same draw order");
  const differences = rowsA.map((row, index) => Number(row[metric]) - Number(rowsB[index][metric]));
  const seed = 20261108;
  let state = seed;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const bootstrapReplicates = 1000;
  const means = Array.from({length: bootstrapReplicates}, () => {
    let total = 0;
    for (let index = 0; index < differences.length; index++) total += differences[Math.floor(random() * differences.length)];
    return total / differences.length;
  }).sort((a, b) => a - b);
  const quantile = (p: number) => {
    const index = (means.length - 1) * p;
    const lower = Math.floor(index);
    return means[lower] + (means[Math.ceil(index)] - means[lower]) * (index - lower);
  };
  return {
    meanDifference: differences.reduce((sum, value) => sum + value, 0) / differences.length,
    ci95: [quantile(0.025), quantile(0.975)] as [number, number],
    samples: differences.length, bootstrapReplicates, seed,
    unit: "draw/portfolio" as const,
    interpretation: "A minus B; paired percentile bootstrap. Synthetic intervals are conditional Monte Carlo uncertainty, not evidence of generalization across portfolios. Historical intervals assume exchangeable draws and may be unstable with small samples.",
  };
}
