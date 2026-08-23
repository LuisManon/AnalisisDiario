import { simulate } from "./stats";
import type { DayFilter, DrawDay, DrawResult, Play, RecommendedPlay } from "./types";

export type VirtualTicket = {
  drawDate: string;
  day: DrawDay;
  plays: Play[];
  submittedAt: string | null;
};

export const virtualPrizeTable = [
  { matches: 6, plus: true, amount: 150_000_000, label: "6 aciertos + Más" },
  { matches: 6, plus: false, amount: 20_000_000, label: "6 aciertos" },
  { matches: 5, plus: true, amount: 1_000_000, label: "5 aciertos + Más" },
  { matches: 5, plus: false, amount: 50_000, label: "5 aciertos" },
  { matches: 4, plus: true, amount: 10_000, label: "4 aciertos + Más" },
  { matches: 4, plus: false, amount: 1_000, label: "4 aciertos" },
  { matches: 3, plus: true, amount: 1_000, label: "3 aciertos + Más" },
  { matches: 3, plus: false, amount: 100, label: "3 aciertos" }
];

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(amount);
}

export function getVirtualPrize(matches: number, plusMatched: boolean) {
  return (
    virtualPrizeTable.find((prize) => prize.matches === matches && prize.plus === plusMatched) ??
    virtualPrizeTable.find((prize) => prize.matches === matches && !prize.plus) ??
    { matches, plus: plusMatched, amount: 0, label: "Sin premio virtual" }
  );
}

export function getDominicanNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santo_Domingo" }));
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isDrawWeekday(date: Date) {
  const day = date.getDay();
  return day === 3 || day === 6;
}

export function getNextGameDate(now = getDominicanNow()) {
  const date = new Date(now);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + offset);
    if (!isDrawWeekday(candidate)) continue;
    const cutoff = new Date(candidate);
    cutoff.setHours(17, 0, 0, 0);
    if (offset === 0 && now > cutoff) continue;
    return formatLocalDate(candidate);
  }
  return formatLocalDate(date);
}

export function getDrawDay(date: string): DrawDay {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 6 ? "sabado" : "miercoles";
}

export function getGameWindow(drawDate: string, now = getDominicanNow()) {
  const currentDate = formatLocalDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayIsDrawDay = isDrawWeekday(now);
  const cutoffMinutes = 17 * 60;
  const drawMinutes = 21 * 60;
  const cutoff = new Date(`${drawDate}T17:00:00`);
  const drawTime = new Date(`${drawDate}T21:00:00`);
  const reviewTime = new Date(drawTime);
  reviewTime.setDate(reviewTime.getDate() + 1);
  const isBeforeDrawDate = currentDate < drawDate;
  const isSameDrawDate = currentDate === drawDate;
  const isAfterDrawDate = currentDate > drawDate;

  return {
    isEditable: isBeforeDrawDate || (isSameDrawDate && (!todayIsDrawDay || currentMinutes <= cutoffMinutes)),
    isDrawTimePassed: isAfterDrawDate || (isSameDrawDate && currentMinutes >= drawMinutes),
    canReview: currentDate > drawDate,
    cutoffIso: cutoff.toISOString(),
    drawIso: drawTime.toISOString(),
    reviewIso: reviewTime.toISOString()
  };
}

export type RecommendationWeights = {
  generalFrequency: number;
  dayFrequency: number;
  dayAffinity: number;
  hotNumbers: number;
  coldNumbers: number;
  delay: number;
  frequentPairs: number;
  frequentTriples: number;
  parityBalance: number;
  rangeBalance: number;
  typicalSum: number;
  positionFrequency: number;
  positionRange: number;
  recentRepeatPenalty: number;
  portfolioDiversity: number;
};

export const recommendationWeights: RecommendationWeights = {
  generalFrequency: 1.1,
  dayFrequency: 1.35,
  dayAffinity: 1.1,
  hotNumbers: 0.85,
  coldNumbers: 0.55,
  delay: 0.8,
  frequentPairs: 1.2,
  frequentTriples: 0.85,
  parityBalance: 0.9,
  rangeBalance: 0.8,
  typicalSum: 1,
  positionFrequency: 0.9,
  positionRange: 1.15,
  recentRepeatPenalty: 1.3,
  portfolioDiversity: 0.72
} as const;

type NumberMetrics = {
  general: number[];
  scoped: number[];
  dayAffinity: number[];
  lowDayAffinity: boolean[];
  hot: number[];
  cold: number[];
  delay: number[];
  repeatSupport: number[];
  recentPenalty: number[];
  positionGeneral: number[][];
  positionScoped: number[][];
};

function normalize(values: number[]) {
  const max = Math.max(...values, 1);
  return values.map((value) => value / max);
}

function countNumbers(draws: DrawResult[], select: (draw: DrawResult) => number[]) {
  const counts = Array(41).fill(0) as number[];
  for (const draw of draws) {
    for (const number of select(draw)) counts[number] += 1;
  }
  return counts;
}

function buildNumberMetrics(results: DrawResult[], scoped: DrawResult[]): NumberMetrics {
  const generalCounts = countNumbers(results, (draw) => draw.numbers);
  const scopedCounts = countNumbers(scoped, (draw) => draw.numbers);
  const recent = scoped.slice(0, Math.min(16, scoped.length));
  const hotCounts = countNumbers(recent, (draw) => draw.numbers);
  const lastIndexes = Array(41).fill(scoped.length + 4) as number[];
  const repeatHits = Array(41).fill(0) as number[];
  const repeatOpportunities = Array(41).fill(0) as number[];

  scoped.forEach((draw, drawIndex) => {
    draw.numbers.forEach((number) => {
      if (lastIndexes[number] === scoped.length + 4) lastIndexes[number] = drawIndex;
    });
  });

  for (let olderIndex = 1; olderIndex < scoped.length; olderIndex += 1) {
    const olderDraw = scoped[olderIndex];
    const followingDraw = scoped[olderIndex - 1];
    for (const number of olderDraw.numbers) {
      repeatOpportunities[number] += 1;
      if (followingDraw.numbers.includes(number)) repeatHits[number] += 1;
    }
  }

  const expectedRepeatRate = 6 / 40;
  const repeatSupport = Array.from({ length: 41 }, (_, number) => {
    if (number === 0) return 0;
    const smoothedRate = (repeatHits[number] + expectedRepeatRate * 8) / (repeatOpportunities[number] + 8);
    return Math.min(1, smoothedRate / (expectedRepeatRate * 2));
  });
  const recentPenalty = Array(41).fill(0) as number[];
  scoped[0]?.numbers.forEach((number) => {
    recentPenalty[number] = 1 - repeatSupport[number];
  });
  scoped[1]?.numbers.forEach((number) => {
    recentPenalty[number] = Math.max(recentPenalty[number], (1 - repeatSupport[number]) * 0.35);
  });

  const positionCounts = (draws: DrawResult[]) =>
    Array.from({ length: 6 }, (_, position) =>
      normalize(countNumbers(draws, (draw) => [draw.numbers[position]]))
    );

  const general = normalize(generalCounts);
  const scopedFrequency = normalize(scopedCounts);
  const dayAffinity = normalize(scopedCounts.map((count, number) => {
    if (number === 0) return 0;
    const generalRate = generalCounts[number] / Math.max(results.length, 1);
    const smoothedDayRate = (count + generalRate * 8) / (scoped.length + 8);
    return smoothedDayRate * (0.65 + 0.35 * Math.sqrt(general[number]));
  }));
  const positiveAffinity = dayAffinity.slice(1).filter((value) => value > 0).sort((a, b) => a - b);
  const lowAffinityLimit = percentile(positiveAffinity, 0.2);

  return {
    general,
    scoped: scopedFrequency,
    dayAffinity,
    lowDayAffinity: dayAffinity.map((value, number) => number > 0 && (scopedCounts[number] === 0 || value <= lowAffinityLimit)),
    hot: normalize(hotCounts),
    cold: normalize(generalCounts.map((count, number) => number === 0 ? 0 : 1 / (count + 1))),
    delay: normalize(lastIndexes),
    repeatSupport,
    recentPenalty,
    positionGeneral: positionCounts(results),
    positionScoped: positionCounts(scoped)
  };
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const index = Math.round((values.length - 1) * ratio);
  return values[Math.min(values.length - 1, Math.max(0, index))];
}

function buildPositionRanges(draws: DrawResult[]) {
  return Array.from({ length: 6 }, (_, position) => {
    const values = draws.map((draw) => draw.numbers[position]).sort((a, b) => a - b);
    return {
      low: values.length < 10 ? values[0] ?? 1 : percentile(values, 0.1),
      high: values.length < 10 ? values[values.length - 1] ?? 40 : percentile(values, 0.9)
    };
  });
}

function positionRangeScore(number: number, range: { low: number; high: number }) {
  if (number >= range.low && number <= range.high) return 1;
  const distance = number < range.low ? range.low - number : number - range.high;
  return Math.max(0.12, Math.exp(-distance / 4) * 0.65);
}

function combinationKey(numbers: number[]) {
  return numbers.join("-");
}

function buildGroupCounts(draws: DrawResult[], size: 2 | 3) {
  const counts = new Map<string, number>();
  for (const draw of draws) {
    const numbers = [...draw.numbers].sort((a, b) => a - b);
    if (size === 2) {
      for (let a = 0; a < 5; a += 1) {
        for (let b = a + 1; b < 6; b += 1) {
          const key = `${numbers[a]}-${numbers[b]}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    } else {
      for (let a = 0; a < 4; a += 1) {
        for (let b = a + 1; b < 5; b += 1) {
          for (let c = b + 1; c < 6; c += 1) {
            const key = `${numbers[a]}-${numbers[b]}-${numbers[c]}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
      }
    }
  }
  const max = Math.max(...counts.values(), 1);
  return { counts, max };
}

function distribution(draws: DrawResult[]) {
  const parity = Array(7).fill(0) as number[];
  const ranges = Array(7).fill(0) as number[];
  const sums = draws.map((draw) => {
    parity[draw.numbers.filter((number) => number % 2 !== 0).length] += 1;
    ranges[draw.numbers.filter((number) => number <= 20).length] += 1;
    return draw.numbers.reduce((sum, number) => sum + number, 0);
  });
  const mean = sums.reduce((sum, value) => sum + value, 0) / Math.max(sums.length, 1);
  const deviation = Math.sqrt(sums.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(sums.length, 1)) || 1;
  return { parity: normalize(parity), ranges: normalize(ranges), mean, deviation };
}

function seededRandom(seedText: string) {
  let seed = 2166136261;
  for (const char of seedText) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedCandidate(weights: number[], random: () => number) {
  const available = Array.from({ length: 40 }, (_, index) => index + 1);
  const selected: number[] = [];
  while (selected.length < 6) {
    const total = available.reduce((sum, number) => sum + Math.max(weights[number], 0.01), 0);
    let target = random() * total;
    const selectedIndex = available.findIndex((number) => {
      target -= Math.max(weights[number], 0.01);
      return target <= 0;
    });
    selected.push(available.splice(Math.max(0, selectedIndex), 1)[0]);
  }
  return selected.sort((a, b) => a - b);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function groupScore(numbers: number[], size: 2 | 3, groups: ReturnType<typeof buildGroupCounts>) {
  const values: number[] = [];
  for (let a = 0; a < numbers.length - (size - 1); a += 1) {
    for (let b = a + 1; b < numbers.length - (size - 2); b += 1) {
      if (size === 2) {
        values.push((groups.counts.get(`${numbers[a]}-${numbers[b]}`) ?? 0) / groups.max);
      } else {
        for (let c = b + 1; c < numbers.length; c += 1) {
          values.push((groups.counts.get(`${numbers[a]}-${numbers[b]}-${numbers[c]}`) ?? 0) / groups.max);
        }
      }
    }
  }
  return average(values);
}

function obviousPenalty(numbers: number[]) {
  const oddCount = numbers.filter((number) => number % 2 !== 0).length;
  let longestRun = 1;
  let currentRun = 1;
  let closeGaps = 0;
  for (let index = 1; index < numbers.length; index += 1) {
    currentRun = numbers[index] === numbers[index - 1] + 1 ? currentRun + 1 : 1;
    longestRun = Math.max(longestRun, currentRun);
    if (numbers[index] - numbers[index - 1] <= 2) closeGaps += 1;
  }
  return (oddCount === 0 || oddCount === 6 ? 1.4 : 0) + (longestRun >= 4 ? 1.2 : 0) + (closeGaps >= 4 ? 0.8 : 0);
}

function portfolioPenalty(numbers: number[], selected: Array<{ numbers: number[] }>) {
  if (!selected.length) return 0;
  const positionReuse = numbers.map((number, position) =>
    selected.filter((play) => play.numbers[position] === number).length
  );
  const numberReuse = numbers.map((number) =>
    selected.filter((play) => play.numbers.includes(number)).length
  );
  return average(positionReuse.map((reuse, position) => reuse * 1.35 + numberReuse[position] * 0.35));
}

type RecommendationProfile = RecommendedPlay["profile"];

function profileFit(
  candidate: { dayAffinity: number; generalSupport: number; exploratoryCount: number },
  profile: RecommendationProfile
) {
  if (profile === "fuerte") {
    return candidate.dayAffinity * 0.95 - candidate.exploratoryCount * 1.4;
  }
  if (profile === "equilibrada") {
    const agreement = 1 - Math.min(1, Math.abs(candidate.dayAffinity - candidate.generalSupport));
    return agreement * 0.7 + candidate.dayAffinity * 0.25 - candidate.exploratoryCount * 0.35;
  }
  const controlledExploration = candidate.exploratoryCount === 1 ? 1 : candidate.exploratoryCount === 2 ? 0.8 : 0;
  return controlledExploration * 0.9 + (1 - candidate.dayAffinity) * 0.3;
}

export function buildRecommendedPlays(
  results: DrawResult[],
  day: DayFilter,
  count = 5,
  weights: RecommendationWeights = recommendationWeights
): RecommendedPlay[] {
  const ordered = [...results].sort((a, b) => b.date.localeCompare(a.date));
  const scoped = day === "todos" ? ordered : ordered.filter((result) => result.day === day);
  const analysis = scoped.length ? scoped : ordered;
  const metrics = buildNumberMetrics(ordered, analysis);
  const pairs = buildGroupCounts(analysis, 2);
  const triples = buildGroupCounts(analysis, 3);
  const typical = distribution(analysis);
  const positionRanges = buildPositionRanges(analysis);
  const historical = new Set(ordered.map((draw) => combinationKey(draw.numbers)));
  const individual = Array(41).fill(0) as number[];

  for (let number = 1; number <= 40; number += 1) {
    individual[number] =
      weights.generalFrequency * Math.sqrt(metrics.general[number]) +
      weights.dayFrequency * Math.sqrt(metrics.scoped[number]) +
      weights.dayAffinity * Math.sqrt(metrics.dayAffinity[number]) +
      weights.hotNumbers * Math.sqrt(metrics.hot[number]) +
      weights.coldNumbers * metrics.cold[number] +
      weights.delay * metrics.delay[number] -
      weights.recentRepeatPenalty * metrics.recentPenalty[number];
  }

  const maxIndividual = Math.max(...individual, 1);
  const random = seededRandom(`${ordered[0]?.date ?? "empty"}-${day}-${ordered.length}`);
  const candidates = new Map<string, {
    numbers: number[];
    rawScore: number;
    dayAffinity: number;
    generalSupport: number;
    exploratoryCount: number;
  }>();

  for (let iteration = 0; iteration < 5000; iteration += 1) {
    const numbers = weightedCandidate(individual, random);
    const key = combinationKey(numbers);
    if (historical.has(key) || candidates.has(key)) continue;

    const oddCount = numbers.filter((number) => number % 2 !== 0).length;
    const lowCount = numbers.filter((number) => number <= 20).length;
    const sum = numbers.reduce((total, number) => total + number, 0);
    const positionScore = average(numbers.map((number, position) =>
      (metrics.positionGeneral[position][number] + metrics.positionScoped[position][number]) / 2
    ));
    const rangeScore = average(numbers.map((number, position) => positionRangeScore(number, positionRanges[position])));
    const sumScore = Math.exp(-0.5 * ((sum - typical.mean) / typical.deviation) ** 2);
    const rawScore =
      average(numbers.map((number) => individual[number] / maxIndividual)) +
      weights.frequentPairs * groupScore(numbers, 2, pairs) +
      weights.frequentTriples * groupScore(numbers, 3, triples) +
      weights.parityBalance * typical.parity[oddCount] +
      weights.rangeBalance * typical.ranges[lowCount] +
      weights.typicalSum * sumScore +
      weights.positionFrequency * positionScore +
      weights.positionRange * rangeScore -
      obviousPenalty(numbers);
    candidates.set(key, {
      numbers,
      rawScore,
      dayAffinity: average(numbers.map((number) => metrics.dayAffinity[number])),
      generalSupport: average(numbers.map((number) => metrics.general[number])),
      exploratoryCount: numbers.filter((number) => metrics.lowDayAffinity[number]).length
    });
  }

  const ranked = [...candidates.values()].sort((a, b) => b.rawScore - a.rawScore);
  const selected: Array<(typeof ranked)[number] & { profile: RecommendationProfile }> = [];
  const candidatePool = ranked.slice(0, Math.min(1200, ranked.length));
  const requestedProfiles: RecommendationProfile[] = ["fuerte", "fuerte", "fuerte", "equilibrada", "exploratoria"];
  while (selected.length < count) {
    const profile = requestedProfiles[selected.length] ?? "equilibrada";
    const next = candidatePool
      .filter((candidate) => !selected.some((play) => play.numbers === candidate.numbers))
      .filter((candidate) => selected.every((existing) => candidate.numbers.filter((number) => existing.numbers.includes(number)).length <= 4))
      .filter((candidate) => profile !== "fuerte" || candidate.exploratoryCount === 0)
      .filter((candidate) => profile !== "exploratoria" || (candidate.exploratoryCount >= 1 && candidate.exploratoryCount <= 2))
      .map((candidate) => ({
        candidate,
        adjustedScore:
          candidate.rawScore +
          profileFit(candidate, profile) -
          weights.portfolioDiversity * portfolioPenalty(candidate.numbers, selected)
      }))
      .sort((a, b) => b.adjustedScore - a.adjustedScore || b.candidate.rawScore - a.candidate.rawScore)[0]?.candidate;
    if (!next) break;
    selected.push({ ...next, profile });
  }
  for (const candidate of candidatePool) {
    if (selected.length >= count) break;
    if (!selected.some((play) => play.numbers === candidate.numbers)) {
      selected.push({ ...candidate, profile: requestedProfiles[selected.length] ?? "equilibrada" });
    }
  }
  const profileOrder: Record<RecommendationProfile, number> = {
    fuerte: 0,
    equilibrada: 1,
    exploratoria: 2
  };
  selected.sort((a, b) => profileOrder[a.profile] - profileOrder[b.profile] || b.rawScore - a.rawScore);

  const bestScore = Math.max(...selected.map((candidate) => candidate.rawScore), 1);
  const plusCounts = normalize(countNumbers(analysis, (draw) => [draw.plus]));
  const plusDelay = Array.from({ length: 13 }, (_, number) => {
    const index = analysis.findIndex((draw) => draw.plus === number);
    return index < 0 ? analysis.length : index;
  });
  const normalizedPlusDelay = normalize(plusDelay);
  const plusRanking = Array.from({ length: 12 }, (_, index) => index + 1)
    .sort((a, b) => (plusCounts[b] + normalizedPlusDelay[b] * 0.4) - (plusCounts[a] + normalizedPlusDelay[a] * 0.4));

  return selected.map((candidate, index) => ({
    id: index + 1,
    numbers: candidate.numbers,
    plus: plusRanking[index % plusRanking.length],
    score: Math.round(Math.max(0, Math.min(100, (candidate.rawScore / bestScore) * 100))),
    profile: candidate.profile,
    daySupportCount: 6 - candidate.exploratoryCount
  }));
}

export function evaluateVirtualTicket(ticket: VirtualTicket, draw: DrawResult | undefined) {
  if (!draw) return null;
  const results = simulate(draw, ticket.plays).map((result) => {
    const prize = getVirtualPrize(result.matchedNumbers.length, result.plusMatched);
    return { ...result, prize };
  });
  const total = results.reduce((sum, result) => sum + result.prize.amount, 0);
  return { draw, results, total };
}
