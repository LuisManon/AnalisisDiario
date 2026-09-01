import type { QuinielaPaleDraw } from "./types";

export type QuinielaProfile = "fuerte" | "equilibrada" | "exploratoria";

export type QuinielaSuggestion = {
  id: number;
  numbers: [number, number, number];
  score: number;
  profile: QuinielaProfile;
};

export function formatQuinielaNumber(number: number) {
  return String(number).padStart(2, "0");
}

function countsByPosition(results: QuinielaPaleDraw[]) {
  return Array.from({ length: 3 }, (_, position) => {
    const counts = Array(100).fill(0) as number[];
    for (const draw of results) counts[draw.numbers[position]] += 1;
    return counts;
  });
}

function allCounts(results: QuinielaPaleDraw[]) {
  const counts = Array(100).fill(0) as number[];
  for (const draw of results) for (const number of draw.numbers) counts[number] += 1;
  return counts;
}

function lastSeen(results: QuinielaPaleDraw[], number: number, position?: number) {
  const index = results.findIndex((draw) => position === undefined ? draw.numbers.includes(number) : draw.numbers[position] === number);
  return index < 0 ? results.length : index;
}

function pairKey(a: number, b: number) {
  return [a, b].sort((x, y) => x - y).join("-");
}

function pairCounts(results: QuinielaPaleDraw[]) {
  const counts = new Map<string, number>();
  for (const draw of results) {
    for (let a = 0; a < 2; a += 1) for (let b = a + 1; b < 3; b += 1) {
      const key = pairKey(draw.numbers[a], draw.numbers[b]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildQuinielaStats(results: QuinielaPaleDraw[]) {
  const total = allCounts(results);
  const positions = countsByPosition(results);
  const topHot = total.map((count, number) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 10);
  const topCold = total.map((count, number) => ({ number, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.count - b.count || a.number - b.number).slice(0, 10);
  const topByPosition = positions.map((counts) => counts.map((count, number) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 5));
  return { drawCount: results.length, latest: results[0] ?? null, topHot, topCold, topByPosition };
}

function dayName(date: string) {
  return new Intl.DateTimeFormat("es-DO", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function getNextQuinielaDate(now = new Date()) {
  const dominican = new Date(now.toLocaleString("en-US", { timeZone: "America/Santo_Domingo" }));
  const cutoffHour = dominican.getDay() === 0 ? 15 : 20;
  const cutoffMinute = dominican.getDay() === 0 ? 55 : 55;
  if (dominican.getHours() > cutoffHour || (dominican.getHours() === cutoffHour && dominican.getMinutes() >= cutoffMinute)) {
    dominican.setDate(dominican.getDate() + 1);
  }
  return [dominican.getFullYear(), String(dominican.getMonth() + 1).padStart(2, "0"), String(dominican.getDate()).padStart(2, "0")].join("-");
}

export function getQuinielaTargetLabel(date: string) {
  return `${dayName(date)} ${date.split("-").reverse().join("-")}`;
}

function seededRandom(text: string) {
  let seed = 2166136261;
  for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildQuinielaSuggestions(
  results: QuinielaPaleDraw[],
  targetDate: string,
  limit = 5,
  requestedProfiles: QuinielaProfile[] = ["fuerte", "fuerte", "fuerte", "equilibrada", "exploratoria"]
): QuinielaSuggestion[] {
  if (!results.length) return [];
  const targetWeekday = new Date(`${targetDate}T00:00:00Z`).getUTCDay();
  const scoped = results.filter((draw) => new Date(`${draw.date}T00:00:00Z`).getUTCDay() === targetWeekday);
  const analysis = scoped.length >= 10 ? scoped : results;
  const generalPositions = countsByPosition(results);
  const dayPositions = countsByPosition(analysis);
  const general = allCounts(results);
  const day = allCounts(analysis);
  const recent = allCounts(analysis.slice(0, 20));
  const pairs = pairCounts(analysis);
  const maxGeneral = Math.max(...general, 1);
  const maxDay = Math.max(...day, 1);
  const maxRecent = Math.max(...recent, 1);
  const maxPosition = Math.max(...dayPositions.flat(), 1);
  const generalPositionMax = generalPositions.map((counts) => Math.max(...counts, 1));
  const positionDelay = Array.from({ length: 3 }, (_, position) =>
    Array.from({ length: 100 }, (_, number) =>
      Math.min(lastSeen(analysis, number, position) / Math.max(analysis.length, 1), 1)
    )
  );
  const positionWeights = Array.from({ length: 3 }, (_, position) =>
    Array.from({ length: 100 }, (_, number) =>
      0.06 +
      (dayPositions[position][number] / maxPosition) * 1.5 +
      (generalPositions[position][number] / generalPositionMax[position]) * 0.75 +
      (day[number] / maxDay) * 0.8 +
      (general[number] / maxGeneral) * 0.45 +
      (recent[number] / maxRecent) * 0.35 +
      positionDelay[position][number] * 0.35
    )
  );
  const random = seededRandom(`${targetDate}-${results[0]?.date}-${results.length}`);
  const existing = new Set(results.map((draw) => draw.numbers.join("-")));
  const candidateKeys = new Set<string>();
  const candidates: Array<{ numbers: [number, number, number]; raw: number; lowAffinity: number }> = [];

  for (let iteration = 0; iteration < 4000; iteration += 1) {
    const picked: number[] = [];
    for (let position = 0; position < 3; position += 1) {
      const weights = positionWeights[position];
      const total = weights.reduce((sum, value, number) => picked.includes(number) ? sum : sum + value, 0);
      let point = random() * total;
      let selectedNumber = 0;
      for (let number = 0; number < 100; number += 1) {
        if (picked.includes(number)) continue;
        point -= weights[number];
        if (point <= 0) {
          selectedNumber = number;
          break;
        }
      }
      picked.push(selectedNumber);
    }
    const numbers = picked as [number, number, number];
    const key = numbers.join("-");
    if (existing.has(key) || candidateKeys.has(key)) continue;
    candidateKeys.add(key);
    const positionScore = numbers.reduce((sum, number, position) => sum + dayPositions[position][number] / maxPosition, 0) / 3;
    const dayScore = numbers.reduce((sum, number) => sum + day[number] / maxDay, 0) / 3;
    const generalScore = numbers.reduce((sum, number) => sum + general[number] / maxGeneral, 0) / 3;
    const pairScore = ((pairs.get(pairKey(numbers[0], numbers[1])) ?? 0) + (pairs.get(pairKey(numbers[0], numbers[2])) ?? 0) + (pairs.get(pairKey(numbers[1], numbers[2])) ?? 0)) / 3;
    const lowAffinity = numbers.filter((number, position) => dayPositions[position][number] === 0).length;
    candidates.push({ numbers, raw: positionScore * 2.2 + dayScore * 1.5 + generalScore + pairScore * 0.35, lowAffinity });
  }

  const ranked = candidates.sort((a, b) => b.raw - a.raw).slice(0, 800);
  const selected: Array<(typeof ranked)[number] & { profile: QuinielaProfile }> = [];
  for (const profile of requestedProfiles.slice(0, limit)) {
    const candidate = ranked
      .filter((item) => !selected.some((play) => play.numbers.join("-") === item.numbers.join("-")))
      .filter((item) => profile !== "fuerte" || item.lowAffinity === 0)
      .filter((item) => profile !== "exploratoria" || item.lowAffinity >= 1)
      .map((item) => ({ item, adjusted: item.raw - selected.reduce((penalty, play) => penalty + item.numbers.filter((number) => play.numbers.includes(number)).length * 0.35, 0) + (profile === "exploratoria" ? item.lowAffinity * 0.25 : 0) }))
      .sort((a, b) => b.adjusted - a.adjusted)[0]?.item;
    if (candidate) selected.push({ ...candidate, profile });
  }
  const profileOrder = { fuerte: 0, equilibrada: 1, exploratoria: 2 };
  selected.sort((a, b) => profileOrder[a.profile] - profileOrder[b.profile] || b.raw - a.raw);
  const best = Math.max(...selected.map((item) => item.raw), 1);
  return selected.map((item, index) => ({ id: index + 1, numbers: item.numbers, profile: item.profile, score: Math.round(item.raw / best * 100) }));
}

export function buildThirtyQuinielaSuggestions(results: QuinielaPaleDraw[], targetDate: string) {
  const profiles: QuinielaProfile[] = [
    ...Array.from({ length: 10 }, () => "fuerte" as const),
    ...Array.from({ length: 10 }, () => "equilibrada" as const),
    ...Array.from({ length: 10 }, () => "exploratoria" as const)
  ];
  return buildQuinielaSuggestions(results, targetDate, 30, profiles);
}

export function buildQuinielaPairs(results: QuinielaPaleDraw[], limit = 5) {
  return [...pairCounts(results).entries()].map(([key, count]) => ({ numbers: key.split("-").map(Number) as [number, number], count }))
    .sort((a, b) => b.count - a.count).slice(0, limit);
}
