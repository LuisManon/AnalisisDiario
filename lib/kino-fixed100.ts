import { jointThresholdProbability, portfolioCoverageBounds } from "./kino-math.ts";
import { randomStream } from "./kino-bowl-lab.ts";

export const FIXED100_VERSION = "kino-fixed100-v1";
export function validateFixed100(tickets: readonly (readonly number[])[]) {
  if (tickets.length !== 100) throw new Error("Expected exactly 100 tickets");
  const keys = new Set<string>();
  for (const t of tickets) {
    if (t.length !== 10 || new Set(t).size !== 10 || t.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error("Invalid ticket");
    const key = [...t].sort((a, b) => a - b).join(",");
    if (keys.has(key)) throw new Error("Duplicate ticket"); keys.add(key);
  }
}
export function fixed100Exposure(tickets: readonly (readonly number[])[]) {
  validateFixed100(tickets);
  const counts = Array<number>(84).fill(0); tickets.forEach(t => t.forEach(n => counts[n - 1]++)); return counts;
}
/** Bipartite degree construction: 1,000 slots, 76 balls occur 12 times, eight occur 11. */
export function balancedFixed100(seed: string) {
  for (let retry = 0; retry < 32; retry++) {
    const rng = randomStream(`${FIXED100_VERSION}/balanced/${seed}/${retry}`);
    const labels = Array.from({ length: 84 }, (_, i) => i + 1);
    for (let i = 83; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
    const remaining = Array<number>(85).fill(11); remaining[0] = 0; labels.slice(0, 76).forEach(n => remaining[n]++);
    const tickets: number[][] = [], seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const candidates = labels.filter(n => remaining[n] > 0).map(n => ({ n, tie: rng() }));
      candidates.sort((a, b) => remaining[b.n] - remaining[a.n] || a.tie - b.tie || a.n - b.n);
      const ticket = candidates.slice(0, 10).map(p => p.n).sort((a, b) => a - b), key = ticket.join(",");
      if (ticket.length !== 10 || seen.has(key)) break;
      tickets.push(ticket); seen.add(key); ticket.forEach(n => remaining[n]--);
    }
    if (tickets.length === 100 && remaining.every(n => n === 0)) { validateFixed100(tickets); return tickets; }
  }
  throw new Error("Could not construct balanced fixed100 in 32 bounded retries");
}
export function fixed100Structure(tickets: number[][]) {
  validateFixed100(tickets);
  const exposure = fixed100Exposure(tickets), overlapHistogram = Array<number>(11).fill(0), sets = tickets.map(t => new Set(t));
  for (let a = 0; a < 100; a++) for (let b = a + 1; b < 100; b++) overlapHistogram[tickets[a].filter(n => sets[b].has(n)).length]++;
  return { exposure, exposureMin: Math.min(...exposure), exposureMax: Math.max(...exposure), overlapHistogram,
    sevenBounds: portfolioCoverageBounds({ universe: 84, drawSize: 20, ticketSize: 10, threshold: 7 }, tickets),
    eightBounds: portfolioCoverageBounds({ universe: 84, drawSize: 20, ticketSize: 10, threshold: 8 }, tickets) };
}
/** Minimize exact pair-intersection surrogate for 7+, with a nonincreasing 8+ surrogate. */
export function optimizeFixed100(base: number[][], seed: string, attempts = 20_000) {
  validateFixed100(base);
  if (!Number.isSafeInteger(attempts) || attempts < 0 || attempts > 100_000) throw new Error("Attempts must be 0..100000");
  const tickets = base.map(t => [...t].sort((a, b) => a - b));
  const flags = tickets.map(t => { const f = new Uint8Array(85); t.forEach(n => f[n] = 1); return f; });
  const overlaps = tickets.map(t => tickets.map(other => t.filter(n => other.includes(n)).length));
  const q = [7, 8].map(threshold => Array.from({ length: 11 }, (_, overlap) => jointThresholdProbability({ universe: 84, drawSize: 20, ticketSize: 10, threshold }, overlap)));
  const seen = new Set(tickets.map(t => t.join(","))), rng = randomStream(`${FIXED100_VERSION}/swaps/${seed}`);
  let accepted = 0;
  for (let step = 0; step < attempts; step++) {
    const a = Math.floor(rng() * 100), b = Math.floor(rng() * 100), x = tickets[a][Math.floor(rng() * 10)], y = tickets[b][Math.floor(rng() * 10)];
    if (a === b || flags[a][y] || flags[b][x]) continue;
    const deltas = [0, 0];
    for (let k = 0; k < 100; k++) {
      if (k === a || k === b) continue;
      const shift = flags[k][y] - flags[k][x];
      for (let objective = 0; objective < 2; objective++) deltas[objective] += q[objective][overlaps[a][k] + shift] - q[objective][overlaps[a][k]] + q[objective][overlaps[b][k] - shift] - q[objective][overlaps[b][k]];
    }
    if (deltas[0] >= -1e-18 || deltas[1] > 1e-18) continue;
    const nextA = tickets[a].map(n => n === x ? y : n).sort((m, n) => m - n), nextB = tickets[b].map(n => n === y ? x : n).sort((m, n) => m - n);
    const ka = nextA.join(","), kb = nextB.join(",");
    if (ka === kb || seen.has(ka) || seen.has(kb)) continue;
    for (let k = 0; k < 100; k++) {
      if (k === a || k === b) continue;
      const shift = flags[k][y] - flags[k][x];
      overlaps[a][k] = overlaps[k][a] = overlaps[a][k] + shift;
      overlaps[b][k] = overlaps[k][b] = overlaps[b][k] - shift;
    }
    seen.delete(tickets[a].join(",")); seen.delete(tickets[b].join(",")); seen.add(ka); seen.add(kb);
    tickets[a] = nextA; tickets[b] = nextB; flags[a][x] = 0; flags[a][y] = 1; flags[b][y] = 0; flags[b][x] = 1; accepted++;
  }
  validateFixed100(tickets); return { tickets, attempts, accepted };
}
export function compileFixed100(tickets: number[][], prizes: readonly { hits: number; amount: number }[]) {
  validateFixed100(tickets);
  const copy = tickets.map(t => [...t]), payout = Array<number>(11).fill(0), seen = new Set<number>();
  for (const p of prizes) {
    if (!Number.isInteger(p.hits) || p.hits < 0 || p.hits > 10 || !Number.isFinite(p.amount) || p.amount < 0 || seen.has(p.hits)) throw new Error("Invalid prizes");
    seen.add(p.hits); payout[p.hits] = p.amount;
  }
  return (winning: number[]) => {
    if (winning.length !== 20 || new Set(winning).size !== 20 || winning.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error("Invalid winning draw");
    const flags = new Uint8Array(85); winning.forEach(n => flags[n] = 1);
    let maxHits = 0, gross = 0;
    for (const t of copy) { let hits = 0; for (const n of t) hits += flags[n]; maxHits = Math.max(maxHits, hits); gross += payout[hits]; }
    return { maxHits, gross };
  };
}
