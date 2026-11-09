import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";
import { buildV2Portfolio } from "./kino-experiment-v2.ts";

/** Offline continuation of the frozen V2 objective: no draw outcomes or range rules. */
export const extendedAttempts = 50_000;
const overlapPenalty = (count: number) => 100 * Math.max(0, count - 4) ** 2;
const pairKey = (a: number, b: number) => Math.min(a, b) * 85 + Math.max(a, b);

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

/** More search, not a new predictive hypothesis. Preserves every number's exact exposure. */
export function buildExtendedPortfolio(seed: string): number[][] {
  const tickets = buildV2Portfolio("balanced-diverse", seed);
  const random = randomFor(`kino-balanced-diverse-extended-v1:${seed}`);
  const counts = new Int32Array(85 * 85);
  for (const ticket of tickets) {
    for (let i = 0; i < ticket.length; i++) {
      for (let j = i + 1; j < ticket.length; j++) counts[pairKey(ticket[i]!, ticket[j]!)]++;
    }
  }
  const membership = tickets.map(ticket => {
    const flags = new Uint8Array(85);
    ticket.forEach(number => { flags[number] = 1; });
    return flags;
  });
  const overlaps = tickets.map((ticket, i) => tickets.map((other, j) =>
    i === j ? 10 : ticket.filter(number => other.includes(number)).length));
  const seen = new Set(tickets.map(ticket => ticket.join(",")));

  for (let attempt = 0; attempt < extendedAttempts; attempt++) {
    const a = Math.floor(random() * tickets.length);
    const b = Math.floor(random() * tickets.length);
    const ai = Math.floor(random() * 10);
    const bi = Math.floor(random() * 10);
    const x = tickets[a]![ai]!;
    const y = tickets[b]![bi]!;
    if (a === b || membership[a]![y] || membership[b]![x]) continue;
    const nextA = tickets[a]!.map(number => number === x ? y : number).sort((m, n) => m - n);
    const nextB = tickets[b]!.map(number => number === y ? x : number).sort((m, n) => m - n);
    const keyA = nextA.join(",");
    const keyB = nextB.join(",");
    if (keyA === keyB || seen.has(keyA) || seen.has(keyB)) continue;
    const changes = new Map<number, number>();
    const change = (u: number, v: number, delta: number) => {
      const key = pairKey(u, v);
      changes.set(key, (changes.get(key) ?? 0) + delta);
    };
    for (const number of tickets[a]!) if (number !== x) { change(x, number, -1); change(y, number, 1); }
    for (const number of tickets[b]!) if (number !== y) { change(y, number, -1); change(x, number, 1); }
    let delta = 0;
    for (const [key, adjustment] of changes) {
      const old = counts[key]!;
      const next = old + adjustment;
      delta += next * (next - 1) / 2 - old * (old - 1) / 2;
    }
    // The overlap between a and b is unchanged by exchanging exclusive numbers.
    for (let k = 0; k < tickets.length; k++) {
      if (k === a || k === b) continue;
      const shift = membership[k]![y]! - membership[k]![x]!;
      delta += overlapPenalty(overlaps[a]![k]! + shift) - overlapPenalty(overlaps[a]![k]!);
      delta += overlapPenalty(overlaps[b]![k]! - shift) - overlapPenalty(overlaps[b]![k]!);
    }
    if (delta >= 0) continue;
    for (const [key, adjustment] of changes) counts[key] += adjustment;
    for (let k = 0; k < tickets.length; k++) {
      if (k === a || k === b) continue;
      const shift = membership[k]![y]! - membership[k]![x]!;
      overlaps[a]![k] = overlaps[k]![a] = overlaps[a]![k]! + shift;
      overlaps[b]![k] = overlaps[k]![b] = overlaps[b]![k]! - shift;
    }
    seen.delete(tickets[a]!.join(","));
    seen.delete(tickets[b]!.join(","));
    seen.add(keyA); seen.add(keyB);
    tickets[a] = nextA; tickets[b] = nextB;
    membership[a]![x] = 0; membership[a]![y] = 1;
    membership[b]![y] = 0; membership[b]![x] = 1;
  }
  validateExperimentPortfolio(tickets);
  return tickets;
}
