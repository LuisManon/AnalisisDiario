import { buildV2Portfolio, diversityPenalty } from "./kino-experiment-v2.ts";
import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";

/** Offline construction only: no outcomes or historical frequency inputs. */
export const TRIPLE_VERSION = "balanced-diverse-triples-v1";
export const TRIPLE_SWAP_ATTEMPTS = 10_000;
const choose2 = (n: number) => n * (n - 1) / 2;
const pairKey = (a: number, b: number) => Math.min(a, b) * 85 + Math.max(a, b);
const overlapPenalty = (n: number) => 100 * Math.max(0, n - 4) ** 2;
const tripleKey = (a: number, b: number, c: number) => {
  const low = Math.min(a, b, c), high = Math.max(a, b, c);
  return (low * 85 + a + b + c - low - high) * 85 + high;
};

function tripleCounts(tickets: readonly (readonly number[])[]) {
  const counts = new Int32Array(85 ** 3);
  for (const ticket of tickets) {
    for (let i = 0; i < ticket.length; i++) for (let j = i + 1; j < ticket.length; j++) {
      for (let k = j + 1; k < ticket.length; k++) counts[tripleKey(ticket[i]!, ticket[j]!, ticket[k]!)]++;
    }
  }
  return counts;
}

/** Number of repeated triple incidences across ticket pairs, not predictive accuracy. */
export function triplePenalty(tickets: readonly (readonly number[])[]) {
  return tripleCounts(tickets).reduce((sum, count) => sum + choose2(count), 0);
}

function randomFor(seed: string) {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTriplePortfolio(seed: string): number[][] {
  const tickets = buildV2Portfolio("balanced-diverse", seed);
  let diversity = diversityPenalty(tickets);
  const ceiling = diversity * 1.05;
  const triples = tripleCounts(tickets), pairs = new Int32Array(85 ** 2);
  for (const ticket of tickets) for (let i = 0; i < ticket.length; i++) {
    for (let j = i + 1; j < ticket.length; j++) pairs[pairKey(ticket[i]!, ticket[j]!)]++;
  }
  const membership = tickets.map(ticket => {
    const flags = new Uint8Array(85);
    ticket.forEach(n => { flags[n] = 1; });
    return flags;
  });
  const overlaps = tickets.map(ticket => tickets.map(other => ticket.filter(n => other.includes(n)).length));
  const seen = new Set(tickets.map(ticket => ticket.join(",")));
  const random = randomFor(`${TRIPLE_VERSION}:swaps:${seed}`);
  for (let attempt = 0; attempt < TRIPLE_SWAP_ATTEMPTS; attempt++) {
    const a = Math.floor(random() * tickets.length), b = Math.floor(random() * tickets.length);
    const x = tickets[a]![Math.floor(random() * 10)]!, y = tickets[b]![Math.floor(random() * 10)]!;
    if (a === b || membership[a]![y] || membership[b]![x]) continue;
    const changes = new Map<number, number>(), pairChanges = new Map<number, number>();
    const change = (map: Map<number, number>, key: number, amount: number) => map.set(key, (map.get(key) ?? 0) + amount);
    for (const [index, removed, added] of [[a, x, y], [b, y, x]]) {
      const rest = tickets[index!]!.filter(n => n !== removed);
      for (let i = 0; i < rest.length; i++) {
        change(pairChanges, pairKey(removed!, rest[i]!), -1);
        change(pairChanges, pairKey(added!, rest[i]!), 1);
        for (let j = i + 1; j < rest.length; j++) {
          change(changes, tripleKey(removed!, rest[i]!, rest[j]!), -1);
          change(changes, tripleKey(added!, rest[i]!, rest[j]!), 1);
        }
      }
    }
    let tripleDelta = 0;
    for (const [key, delta] of changes) tripleDelta += choose2(triples[key]! + delta) - choose2(triples[key]!);
    if (tripleDelta >= 0) continue;
    let diversityDelta = 0;
    for (const [key, delta] of pairChanges) diversityDelta += choose2(pairs[key]! + delta) - choose2(pairs[key]!);
    for (let k = 0; k < tickets.length; k++) {
      if (k === a || k === b) continue;
      const shift = membership[k]![y]! - membership[k]![x]!;
      diversityDelta += overlapPenalty(overlaps[a]![k]! + shift) - overlapPenalty(overlaps[a]![k]!);
      diversityDelta += overlapPenalty(overlaps[b]![k]! - shift) - overlapPenalty(overlaps[b]![k]!);
    }
    if (diversity + diversityDelta > ceiling) continue;
    const nextA = tickets[a]!.map(n => n === x ? y : n).sort((m, n) => m - n);
    const nextB = tickets[b]!.map(n => n === y ? x : n).sort((m, n) => m - n);
    const keyA = nextA.join(","), keyB = nextB.join(",");
    if (keyA === keyB || seen.has(keyA) || seen.has(keyB)) continue;
    diversity += diversityDelta;
    for (const [key, delta] of changes) triples[key] += delta;
    for (const [key, delta] of pairChanges) pairs[key] += delta;
    for (let k = 0; k < tickets.length; k++) {
      if (k === a || k === b) continue;
      const shift = membership[k]![y]! - membership[k]![x]!;
      overlaps[a]![k] = overlaps[k]![a] = overlaps[a]![k]! + shift;
      overlaps[b]![k] = overlaps[k]![b] = overlaps[b]![k]! - shift;
    }
    seen.delete(tickets[a]!.join(",")); seen.delete(tickets[b]!.join(","));
    seen.add(keyA); seen.add(keyB);
    tickets[a] = nextA; tickets[b] = nextB;
    membership[a]![x] = 0; membership[a]![y] = 1;
    membership[b]![y] = 0; membership[b]![x] = 1;
  }
  validateExperimentPortfolio(tickets);
  return tickets;
}
