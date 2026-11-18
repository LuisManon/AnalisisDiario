import { randomStream } from "./kino-bowl-lab.ts";
import { validateExperimentPortfolio } from "./kino-experiment-strategies.ts";

export function uniformControl200(seed: string) {
  const rng = randomStream(seed), tickets: number[][] = [], seen = new Set<string>();
  while (tickets.length < 200) {
    const pool = Array.from({ length: 84 }, (_, i) => i + 1);
    for (let i = 0; i < 10; i++) { const j = i + Math.floor(rng() * (84 - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const t = pool.slice(0, 10).sort((a, b) => a - b), key = t.join(",");
    if (!seen.has(key)) { tickets.push(t); seen.add(key); }
  }
  return tickets;
}
export function permutePortfolioLabels(tickets: number[][], seed: string) {
  validateExperimentPortfolio(tickets);
  const rng = randomStream(seed), labels = Array.from({ length: 84 }, (_, i) => i + 1);
  for (let i = 83; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
  return tickets.map(t => t.map(n => labels[n - 1]).sort((a, b) => a - b));
}
/** Fast maximum with exactly the same exact-first/one-to-one rules as matchKinoNear. */
export function compileNearMaximum(tickets: number[][]) {
  validateExperimentPortfolio(tickets); const copy = tickets.map(t => [...t]);
  return (winning: number[]) => {
    if (winning.length !== 20 || new Set(winning).size !== 20 || winning.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error("Invalid draw");
    const winners = new Uint8Array(85); winning.forEach(n => winners[n] = 1);
    let maximum = 0;
    for (const ticket of copy) {
      const exact = new Uint8Array(85), remaining: number[] = [];
      let count = 0;
      for (const n of ticket) if (winners[n]) { exact[n] = 1; count++; } else remaining.push(n);
      const owners = new Int16Array(85).fill(-1), visited = new Uint16Array(85); let token = 0;
      const augment = (n: number): boolean => {
        for (const w of [n - 1, n + 1]) {
          if (w < 1 || w > 84 || !winners[w] || exact[w] || visited[w] === token) continue;
          visited[w] = token;
          if (owners[w] === -1 || augment(owners[w])) { owners[w] = n; return true; }
        }
        return false;
      };
      for (const n of remaining) { token++; if (augment(n)) count++; }
      maximum = Math.max(maximum, count); if (maximum === 10) break;
    }
    return maximum;
  };
}
export function buildNeighborPortfolio(tickets: number[][], mode: "half" | "all", seed: string) {
  validateExperimentPortfolio(tickets);
  const rng = randomStream(seed), order = Array.from({ length: 200 }, (_, i) => i);
  for (let i = 199; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const kept = mode === "half" ? 100 : 0, output: number[][] = [], origins: { sourceIndex: number; kept: boolean; changes: { from: number; to: number }[] }[] = [];
  const used = new Set(tickets.map(t => [...t].sort((a, b) => a - b).join(",")));
  for (let i = 0; i < 200; i++) {
    const sourceIndex = order[i], base = tickets[sourceIndex];
    if (i < kept) { output.push([...base]); origins.push({ sourceIndex, kept: true, changes: [] }); continue; }
    let accepted = false;
    for (let attempt = 0; attempt < 256; attempt++) {
      const changes = base.map(from => ({ from, to: from === 1 ? 2 : from === 84 ? 83 : from + (rng() < 0.5 ? -1 : 1) }));
      const next = changes.map(c => c.to).sort((a, b) => a - b), key = next.join(",");
      if (new Set(next).size < 10 || used.has(key)) continue;
      used.add(key); output.push(next); origins.push({ sourceIndex, kept: false, changes }); accepted = true; break;
    }
    if (!accepted) throw new Error(`No unique neighbor within256 attempts: ${sourceIndex}`);
  }
  validateExperimentPortfolio(output); return { tickets: output, origins };
}
