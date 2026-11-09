import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";

function randomFor(seed: string) {
  let state = 2166136261;
  for (const character of `kino-direct-coverage-v1:${seed}`) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Offline training only. The caller must keep evaluation outcomes separate. */
export function optimizeDirectCoverage(base: number[][], training: number[][], seed: string, attempts = 2000): {
  tickets: number[][]; beforeCovered: number; afterCovered: number; accepted: number;
} {
  validateExperimentPortfolio(base);
  if (!Number.isSafeInteger(attempts) || attempts < 0) throw new Error("Intentos inválidos.");
  if (!training.length || training.some(draw => draw.length !== 20 || new Set(draw).size !== 20 ||
    draw.some(number => !Number.isInteger(number) || number < 1 || number > 84))) {
    throw new Error("Entrenamiento requiere sorteos de 20 números únicos entre 1 y 84.");
  }
  const tickets = base.map(ticket => [...ticket].sort((a, b) => a - b));
  const drawFlags = training.map(draw => {
    const flags = new Uint8Array(85);
    draw.forEach(number => { flags[number] = 1; });
    return flags;
  });
  const hits = tickets.map(ticket => Uint8Array.from(drawFlags, flags => ticket.reduce((sum, number) => sum + flags[number]!, 0)));
  const qualifying = new Uint16Array(training.length);
  for (const row of hits) for (let d = 0; d < row.length; d++) qualifying[d] += Number(row[d]! >= 7);
  const beforeCovered = qualifying.reduce((sum, count) => sum + Number(count > 0), 0);
  let afterCovered = beforeCovered;
  let accepted = 0;
  const membership = tickets.map(ticket => new Set(ticket));
  const seen = new Set(tickets.map(ticket => ticket.join(",")));
  const random = randomFor(seed);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const a = Math.floor(random() * 200);
    const b = Math.floor(random() * 200);
    const x = tickets[a]![Math.floor(random() * 10)]!;
    const y = tickets[b]![Math.floor(random() * 10)]!;
    if (a === b || membership[a]!.has(y) || membership[b]!.has(x)) continue;
    const nextA = tickets[a]!.map(n => n === x ? y : n).sort((m, n) => m - n);
    const nextB = tickets[b]!.map(n => n === y ? x : n).sort((m, n) => m - n);
    const keyA = nextA.join(",");
    const keyB = nextB.join(",");
    if (keyA === keyB || seen.has(keyA) || seen.has(keyB)) continue;
    let delta = 0;
    for (let d = 0; d < training.length; d++) {
      const shift = drawFlags[d]![y]! - drawFlags[d]![x]!;
      const oldA = hits[a]![d]!;
      const oldB = hits[b]![d]!;
      const nextCount = qualifying[d]! - Number(oldA >= 7) - Number(oldB >= 7)
        + Number(oldA + shift >= 7) + Number(oldB - shift >= 7);
      delta += Number(nextCount > 0) - Number(qualifying[d]! > 0);
    }
    if (delta <= 0) continue;
    for (let d = 0; d < training.length; d++) {
      const shift = drawFlags[d]![y]! - drawFlags[d]![x]!;
      const oldA = hits[a]![d]!;
      const oldB = hits[b]![d]!;
      hits[a]![d] = oldA + shift;
      hits[b]![d] = oldB - shift;
      qualifying[d] = qualifying[d]! - Number(oldA >= 7) - Number(oldB >= 7)
        + Number(oldA + shift >= 7) + Number(oldB - shift >= 7);
    }
    seen.delete(tickets[a]!.join(",")); seen.delete(tickets[b]!.join(","));
    seen.add(keyA); seen.add(keyB);
    tickets[a] = nextA; tickets[b] = nextB;
    membership[a]!.delete(x); membership[a]!.add(y);
    membership[b]!.delete(y); membership[b]!.add(x);
    afterCovered += delta;
    accepted++;
  }
  validateExperimentPortfolio(tickets);
  return { tickets, beforeCovered, afterCovered, accepted };
}
