/** Read-only mathematical reference for the repository's 84/20/10 model.
 * Run: node --experimental-strip-types scripts/audit-kino-baseline.ts
 * Prize amounts are repository assumptions, not independently verified rules.
 */
import { kinoPrize } from "../lib/super-kino.ts";

function choose(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let value = 1;
  for (let index = 1; index <= k; index++) value = value * (n - k + index) / index;
  return value;
}
const universe = 84, extracted = 20, selected = 10, tickets = 200;
const distribution = Array.from({length: selected + 1}, (_, hits) => ({
  hits, probability: choose(extracted, hits) * choose(universe - extracted, selected - hits) / choose(universe, selected)
}));
const tail = (hits: number) => distribution.filter(item => item.hits >= hits).reduce((sum, item) => sum + item.probability, 0);
console.log(JSON.stringify({
  assumption: "Uniform independent draws; repository model84/20/10; repository prizes; not official verification",
  formula: "P(H=k)=C(20,k)*C(64,10-k)/C(84,10)",
  universe, extracted, selected, tickets, expectedHitsPerTicket: selected * extracted / universe,
  distribution,
  oneInTenHits: 1 / tail(10),
  portfolioProbabilityUpperBounds: { eightOrMore: Math.min(1,tickets * tail(8)), ten: Math.min(1,tickets * tail(10)) },
  expectedPrizePerTicketUsingRepositoryScale: distribution.reduce((sum,item) => sum + item.probability * kinoPrize(item.hits), 0),
  optimizerTrainingExpectedWinningTickets: { nineOrMore: 2000*tickets*tail(9), ten: 2000*tickets*tail(10) },
  caveat: "Union bounds are not exact portfolio probabilities. Ticket dependence changes portfolio coverage, not individual uniform-draw probabilities."
}, null, 2));
