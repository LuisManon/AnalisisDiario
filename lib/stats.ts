import type { DayFilter, DrawResult, Play, SimulationResult } from "./types";

export function filterByDay(results: DrawResult[], day: DayFilter) {
  if (day === "todos") return results;
  return results.filter((result) => result.day === day);
}

function topEntries(counts: Map<number, number>, limit = 5) {
  return [...counts.entries()]
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number)
    .slice(0, limit);
}

export function buildStats(results: DrawResult[], day: DayFilter = "todos") {
  const scoped = filterByDay(results, day);
  const byPosition = Array.from({ length: 6 }, () => new Map<number, number>());
  const totals = new Map<number, number>();
  const plusTotals = new Map<number, number>();

  for (const result of scoped) {
    result.numbers.forEach((number, index) => {
      byPosition[index].set(number, (byPosition[index].get(number) ?? 0) + 1);
      totals.set(number, (totals.get(number) ?? 0) + 1);
    });
    plusTotals.set(result.plus, (plusTotals.get(result.plus) ?? 0) + 1);
  }

  return {
    day,
    drawCount: scoped.length,
    latest: scoped[0] ?? null,
    byPosition: byPosition.map((counts, index) => ({
      position: index + 1,
      top: topEntries(counts)
    })),
    totalTop: topEntries(totals, 10),
    plusTop: topEntries(plusTotals, 5),
    coldNumbers: Array.from({ length: 40 }, (_, i) => i + 1)
      .map((number) => ({ number, count: totals.get(number) ?? 0 }))
      .sort((a, b) => a.count - b.count || a.number - b.number)
      .slice(0, 10)
  };
}

export function simulate(draw: DrawResult, plays: Play[]): SimulationResult[] {
  const winning = new Set(draw.numbers);
  return plays.map((play) => {
    const matchedNumbers = play.numbers.filter((number) => winning.has(number));
    const plusMatched = play.plus === draw.plus;
    return {
      play,
      matchedNumbers,
      plusMatched,
      score: matchedNumbers.length + (plusMatched ? 0.5 : 0)
    };
  });
}

export function generatePlays(results: DrawResult[], count = 5): Play[] {
  const stats = buildStats(results);
  const hotNumbers = stats.totalTop.map((entry) => entry.number);
  const coldNumbers = stats.coldNumbers.map((entry) => entry.number);
  const plusNumbers = stats.plusTop.map((entry) => entry.number);

  return Array.from({ length: count }, (_, index) => {
    const base = index % 2 === 0 ? hotNumbers : coldNumbers;
    const selected = new Set<number>();
    for (const number of base) {
      if (selected.size < 6) selected.add(number);
    }
    while (selected.size < 6) selected.add(1 + Math.floor(Math.random() * 40));

    return {
      id: index + 1,
      numbers: [...selected].sort((a, b) => a - b),
      plus: plusNumbers[index % Math.max(plusNumbers.length, 1)] ?? 1
    };
  });
}
