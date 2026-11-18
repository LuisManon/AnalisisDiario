import { choose, portfolioCoverageBounds } from "./kino-math.ts";
import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";

export function exactTicketEconomics(prizes: readonly { hits: number; amount: number }[], ticketCost = 25) {
  if (!Number.isFinite(ticketCost) || ticketCost <= 0 || new Set(prizes.map(p => p.hits)).size !== prizes.length || prizes.some(p => !Number.isInteger(p.hits) || p.hits < 0 || p.hits > 10 || !Number.isFinite(p.amount) || p.amount < 0)) throw new Error("Invalid economics");
  const probabilities = Array.from({ length: 11 }, (_, k) => Number(choose(10, k) * choose(74, 20 - k)) / Number(choose(84, 20)));
  const gross = prizes.reduce((s, p) => s + p.amount * probabilities[p.hits], 0);
  return { probabilities, ticketCost, expectedGrossPerTicket: gross, expectedNetPerTicket: gross - ticketCost, expectedRoi: gross / ticketCost - 1 };
}
export function portfolioStructure(tickets: number[][]) {
  validateExperimentPortfolio(tickets);
  const exposure = Array<number>(84).fill(0), overlapHistogram = Array<number>(11).fill(0);
  tickets.forEach(t => t.forEach(n => exposure[n - 1]++));
  for (let a = 0; a < tickets.length; a++) {
    const set = new Set(tickets[a]);
    for (let b = a + 1; b < tickets.length; b++) overlapHistogram[tickets[b].filter(n => set.has(n)).length]++;
  }
  return { exposure, exposureMin: Math.min(...exposure), exposureMax: Math.max(...exposure), overlapHistogram,
    meanOverlap: overlapHistogram.reduce((s, n, k) => s + n * k, 0) / 19900,
    highOverlapPairs7: overlapHistogram.slice(7).reduce((s, n) => s + n, 0),
    sevenBounds: portfolioCoverageBounds({ universe: 84, drawSize: 20, ticketSize: 10, threshold: 7 }, tickets),
    eightBounds: portfolioCoverageBounds({ universe: 84, drawSize: 20, ticketSize: 10, threshold: 8 }, tickets) };
}
