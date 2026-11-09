import { buildKinoV133Numbers } from "./super-kino-v133.ts";

/** Offline-only strategies. No historical outcome, frequency or delay is consumed. */
export const experimentModes = ["uniform", "balanced", "v133-production"] as const;
export type ExperimentMode = typeof experimentModes[number];

const universe = Array.from({ length: 84 }, (_, index) => index + 1);
const ticketCount = 200;
const ticketSize = 10;

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

function shuffle<T>(values: readonly T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

function uniform(seed: string) {
  const random = randomFor(`kino-experiment-uniform-v1:${seed}`);
  const tickets: number[][] = [];
  const seen = new Set<string>();
  while (tickets.length < ticketCount) {
    const ticket = shuffle(universe, random).slice(0, ticketSize).sort((a, b) => a - b);
    const key = ticket.join(",");
    if (!seen.has(key)) { tickets.push(ticket); seen.add(key); }
  }
  return tickets;
}

function balanced(seed: string) {
  // 2,000 slots: 68 numbers occur 24 times and 16 occur 23 times.
  // Mandatory picks keep every remaining quota feasible; other picks are
  // weighted by remaining quota. This is not uniform over balanced portfolios
  // and does not optimize against historical or synthetic winning results.
  for (let retry = 0; retry < 32; retry++) {
    const random = randomFor(`kino-experiment-balanced-v1:${seed}:${retry}`);
    const extra = new Set(shuffle(universe, random).slice(0, 68));
    const remaining = [0, ...universe.map(number => 23 + Number(extra.has(number)))];
    const tickets: number[][] = [];
    const seen = new Set<string>();
    for (let round = 0; round < ticketCount; round++) {
      const roundsLeft = ticketCount - round;
      const ticket = universe.filter(number => remaining[number] === roundsLeft);
      const pool = universe.filter(number => remaining[number]! > 0 && !ticket.includes(number));
      if (ticket.length > ticketSize) break;
      while (ticket.length < ticketSize && pool.length) {
        let point = random() * pool.reduce((sum, number) => sum + remaining[number]!, 0);
        let position = 0;
        for (; position < pool.length - 1; position++) {
          point -= remaining[pool[position]!]!;
          if (point < 0) break;
        }
        ticket.push(pool.splice(position, 1)[0]!);
      }
      ticket.sort((a, b) => a - b);
      const key = ticket.join(",");
      if (ticket.length !== ticketSize || seen.has(key)) break;
      seen.add(key);
      ticket.forEach(number => remaining[number]!--);
      tickets.push(ticket);
    }
    if (tickets.length === ticketCount && remaining.every(value => value === 0)) return tickets;
  }
  throw new Error("No se pudo completar la cartera experimental equilibrada.");
}

export function validateExperimentPortfolio(tickets: readonly (readonly number[])[]) {
  if (tickets.length !== ticketCount) throw new Error("La cartera experimental debe tener 200 jugadas.");
  const seen = new Set<string>();
  for (const ticket of tickets) {
    if (ticket.length !== ticketSize || new Set(ticket).size !== ticketSize ||
        ticket.some(number => !Number.isInteger(number) || number < 1 || number > 84)) {
      throw new Error("Cada jugada experimental debe tener 10 números únicos entre 1 y 84.");
    }
    const key = [...ticket].sort((a, b) => a - b).join(",");
    if (seen.has(key)) throw new Error("La cartera experimental contiene jugadas duplicadas.");
    seen.add(key);
  }
}

export function buildExperimentPortfolio(mode: string, seed: string): number[][] {
  if (!experimentModes.includes(mode as ExperimentMode)) throw new Error(`Estrategia experimental desconocida: ${mode}`);
  // V13.3's targetDate argument is only a seed label in its implementation.
  // Passing this experimental label invokes the exact production algorithm,
  // not a frozen historical portfolio and not a claim of historical issuance.
  const tickets = mode === "v133-production" ? buildKinoV133Numbers(seed)
    : mode === "balanced" ? balanced(seed) : uniform(seed);
  validateExperimentPortfolio(tickets);
  return tickets;
}
