import type { LotekaRepartideraDraw } from "./types";

export const lotekaRepartideraSchedule = {
  label: "La Repartidera MegaChance",
  time: "7:55 PM",
  days: "Lunes a domingo"
};

export function formatLotekaNumber(number: number) {
  return String(number).padStart(2, "0");
}

function getFrequency(results: LotekaRepartideraDraw[]) {
  const counts = Array.from({ length: 100 }, (_, number) => ({ number, count: 0 }));
  for (const result of results) {
    if (Number.isInteger(result.number) && result.number >= 0 && result.number <= 99) {
      counts[result.number].count += 1;
    }
  }
  return counts;
}

function getLastSeenIndex(results: LotekaRepartideraDraw[], number: number) {
  return results.findIndex((result) => result.number === number);
}

function getRecentCount(results: LotekaRepartideraDraw[], number: number, windowSize = 20) {
  return results.slice(0, windowSize).filter((result) => result.number === number).length;
}

function averageGap(results: LotekaRepartideraDraw[], number: number) {
  const indexes = results.map((result, index) => (result.number === number ? index : -1)).filter((index) => index >= 0);
  if (indexes.length < 2) return results.length;
  const gaps = indexes.slice(0, -1).map((index, gapIndex) => indexes[gapIndex + 1] - index);
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

export function getLotekaYears(results: LotekaRepartideraDraw[]) {
  return [...new Set(results.map((result) => result.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
}

export function filterLotekaByYear(results: LotekaRepartideraDraw[], year: string) {
  return year === "todos" ? results : results.filter((result) => result.date.startsWith(year));
}

export function buildLotekaRepartideraStats(results: LotekaRepartideraDraw[]) {
  const frequency = getFrequency(results);
  const topHot = [...frequency].sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 10);
  const topCold = [...frequency].sort((a, b) => a.count - b.count || b.number - a.number).slice(0, 10);

  return {
    drawCount: results.length,
    latest: results[0] ?? null,
    topHot,
    topCold
  };
}

export function buildLotekaRepartideraSuggestions(results: LotekaRepartideraDraw[], limit = 5) {
  const frequency = getFrequency(results);
  const maxFrequency = Math.max(1, ...frequency.map((item) => item.count));
  const maxDelay = Math.max(1, results.length);

  return frequency
    .map((item) => {
      const lastSeen = getLastSeenIndex(results, item.number);
      const delay = lastSeen < 0 ? results.length : lastSeen;
      const recent = getRecentCount(results, item.number, 20);
      const recent50 = getRecentCount(results, item.number, 50);
      const gap = averageGap(results, item.number);
      const obviousPenalty = item.number % 11 === 0 ? 3 : 0;
      const score =
        (item.count / maxFrequency) * 40 +
        Math.min(recent, 3) * 10 +
        Math.min(recent50, 5) * 4 +
        (delay / maxDelay) * 18 +
        Math.min(gap / Math.max(1, results.length / 4), 1) * 8 -
        obviousPenalty;

      return {
        number: item.number,
        score: Math.round(score),
        frequency: item.count,
        recent,
        delay,
        lastDate: lastSeen >= 0 ? results[lastSeen].date : null
      };
    })
    .sort((a, b) => b.score - a.score || b.frequency - a.frequency || a.number - b.number)
    .filter((item) => item.frequency > 0 || results.length >= 15)
    .slice(0, limit);
}
