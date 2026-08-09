import type { LaPrimeraDraw, LaPrimeraFilter, LaPrimeraSession } from "./types";

export const laPrimeraSchedules: Record<LaPrimeraSession, { label: string; time: string; days: string }> = {
  dia: { label: "Quinielon Dia", time: "12:00 PM", days: "Lunes a domingo" },
  noche: { label: "Quinielon Noche", time: "7:00 PM", days: "Lunes a domingo" }
};

export function formatQuinielonNumber(number: number) {
  return String(number).padStart(2, "0");
}

export function formatSession(session: LaPrimeraFilter) {
  if (session === "dia") return "Dia";
  if (session === "noche") return "Noche";
  return "Todos";
}

export function filterLaPrimeraResults(results: LaPrimeraDraw[], session: LaPrimeraFilter) {
  return session === "todos" ? results : results.filter((result) => result.session === session);
}

function getFrequency(results: LaPrimeraDraw[]) {
  const counts = Array.from({ length: 100 }, (_, number) => ({ number, count: 0 }));
  for (const result of results) {
    if (Number.isInteger(result.number) && result.number >= 0 && result.number <= 99) {
      counts[result.number].count += 1;
    }
  }
  return counts;
}

function getLastSeenIndex(results: LaPrimeraDraw[], number: number) {
  return results.findIndex((result) => result.number === number);
}

function getRecentCount(results: LaPrimeraDraw[], number: number, windowSize = 20) {
  return results.slice(0, windowSize).filter((result) => result.number === number).length;
}

function averageGap(results: LaPrimeraDraw[], number: number) {
  const indexes = results.map((result, index) => (result.number === number ? index : -1)).filter((index) => index >= 0);
  if (indexes.length < 2) return results.length;
  const gaps = indexes.slice(0, -1).map((index, gapIndex) => indexes[gapIndex + 1] - index);
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

export function buildLaPrimeraStats(results: LaPrimeraDraw[], session: LaPrimeraFilter) {
  const filtered = filterLaPrimeraResults(results, session);
  const frequency = getFrequency(filtered);
  const topHot = [...frequency].sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 10);
  const topCold = [...frequency].sort((a, b) => a.count - b.count || b.number - a.number).slice(0, 10);
  const latestBySession = {
    dia: results.find((result) => result.session === "dia") ?? null,
    noche: results.find((result) => result.session === "noche") ?? null
  };

  return {
    drawCount: filtered.length,
    filtered,
    latest: filtered[0] ?? null,
    latestBySession,
    topHot,
    topCold
  };
}

export function buildLaPrimeraSuggestions(results: LaPrimeraDraw[], session: LaPrimeraSession, limit = 5) {
  const scoped = filterLaPrimeraResults(results, session);
  const all = results;
  const frequency = getFrequency(scoped);
  const globalFrequency = getFrequency(all);
  const maxFrequency = Math.max(1, ...frequency.map((item) => item.count));
  const maxGlobal = Math.max(1, ...globalFrequency.map((item) => item.count));
  const maxDelay = Math.max(1, scoped.length);

  return frequency
    .map((item) => {
      const lastSeen = getLastSeenIndex(scoped, item.number);
      const delay = lastSeen < 0 ? scoped.length : lastSeen;
      const recent = getRecentCount(scoped, item.number, 20);
      const recent50 = getRecentCount(scoped, item.number, 50);
      const gap = averageGap(scoped, item.number);
      const balancePenalty = item.number % 11 === 0 ? 2 : 0;
      const score =
        (item.count / maxFrequency) * 34 +
        (globalFrequency[item.number].count / maxGlobal) * 14 +
        Math.min(recent, 3) * 9 +
        Math.min(recent50, 5) * 4 +
        (delay / maxDelay) * 18 +
        Math.min(gap / Math.max(1, scoped.length / 4), 1) * 8 -
        balancePenalty;

      return {
        number: item.number,
        score: Math.round(score),
        frequency: item.count,
        recent,
        delay,
        lastDate: lastSeen >= 0 ? scoped[lastSeen].date : null
      };
    })
    .sort((a, b) => b.score - a.score || b.frequency - a.frequency || a.number - b.number)
    .filter((item) => item.frequency > 0 || scoped.length >= 15)
    .slice(0, limit);
}
