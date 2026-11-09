import { jointThresholdProbability } from "./kino-math.ts";
import { buildV2Portfolio } from "./kino-experiment-v2.ts";
import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";

/** Offline surrogate study: lowering S2 does not prove greater union coverage. */
export const JOINT_VERSION = "balanced-diverse-joint-v1";
export const JOINT_MAX_ATTEMPTS = 100_000;
const q7 = Array.from({ length: 11 }, (_, overlap) => jointThresholdProbability({
  universe: 84, drawSize: 20, ticketSize: 10, threshold: 7,
}, overlap));

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

/** Sum over unordered pairs P(both reach 7+), under uniform 20-of-84 draws. */
export function jointObjective(tickets: readonly (readonly number[])[]): number {
  for (const ticket of tickets) {
    if (ticket.length !== 10 || new Set(ticket).size !== 10 ||
      ticket.some(n => !Number.isSafeInteger(n) || n < 1 || n > 84)) throw new Error("Invalid joint-objective ticket");
  }
  const sets = tickets.map(ticket => new Set(ticket));
  let score = 0;
  for (let a = 0; a < tickets.length; a++) for (let b = a + 1; b < tickets.length; b++) {
    score += q7[tickets[a]!.filter(n => sets[b]!.has(n)).length]!;
  }
  return score;
}

/** Reciprocal swaps preserve exact exposure; no historical or synthetic outcomes enter. */
export function buildJointPortfolio(seed: string, attempts = 2_000): number[][] {
  if (!Number.isSafeInteger(attempts) || attempts < 0 || attempts > JOINT_MAX_ATTEMPTS) {
    throw new Error(`Joint attempts must be an integer from 0 to ${JOINT_MAX_ATTEMPTS}`);
  }
  const tickets = buildV2Portfolio("balanced-diverse", seed);
  const random = randomFor(`${JOINT_VERSION}:${seed}`);
  const membership = tickets.map(ticket => {
    const flags = new Uint8Array(85);
    ticket.forEach(n => { flags[n] = 1; });
    return flags;
  });
  const overlaps = tickets.map(ticket => tickets.map(other => ticket.filter(n => other.includes(n)).length));
  const seen = new Set(tickets.map(ticket => ticket.join(",")));
  for (let attempt = 0; attempt < attempts; attempt++) {
    const a = Math.floor(random() * tickets.length), b = Math.floor(random() * tickets.length);
    const x = tickets[a]![Math.floor(random() * 10)]!, y = tickets[b]![Math.floor(random() * 10)]!;
    if (a === b || membership[a]![y] || membership[b]![x]) continue;
    // A and B exchange exclusive numbers, so their mutual overlap is unchanged.
    let delta = 0;
    for (let k = 0; k < tickets.length; k++) {
      if (k === a || k === b) continue;
      const shift = membership[k]![y]! - membership[k]![x]!;
      delta += q7[overlaps[a]![k]! + shift]! - q7[overlaps[a]![k]!]!;
      delta += q7[overlaps[b]![k]! - shift]! - q7[overlaps[b]![k]!]!;
    }
    if (delta >= 0) continue;
    const nextA = tickets[a]!.map(n => n === x ? y : n).sort((m, n) => m - n);
    const nextB = tickets[b]!.map(n => n === y ? x : n).sort((m, n) => m - n);
    const keyA = nextA.join(","), keyB = nextB.join(",");
    if (keyA === keyB || seen.has(keyA) || seen.has(keyB)) continue;
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
