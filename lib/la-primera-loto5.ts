import type { LaPrimeraLoto5Draw, Loto5PortfolioPlay, Loto5PortfolioSnapshot, Loto5Profile } from "./types";

const profiles: Loto5Profile[] = ["fuerte", "equilibrada", "exploratoria"];
const algorithmVersion = "loto5-v1";

export function cleanLoto5Results(results: LaPrimeraLoto5Draw[]) {
  const chronological = results.slice().sort((a, b) => a.date.localeCompare(b.date));
  const clean: LaPrimeraLoto5Draw[] = [];
  for (const draw of chronological) {
    const previous = clean.at(-1);
    const sameNumbers = previous && previous.numbers.every((number, position) => number === draw.numbers[position]);
    if (previous && sameNumbers && previous.plus === draw.plus) continue;
    clean.push(draw);
  }
  return clean.sort((a, b) => b.date.localeCompare(a.date));
}

export function getNextLoto5Date(results: LaPrimeraLoto5Draw[]) {
  const latest = cleanLoto5Results(results)[0]?.date;
  const date = latest ? new Date(`${latest}T00:00:00Z`) : new Date();
  date.setUTCDate(date.getUTCDate() + (latest ? 1 : 0));
  return date.toISOString().slice(0, 10);
}

function normalize(values: number[]) {
  const max = Math.max(1, ...values);
  return values.map((value) => value / max);
}

function countNumbers(draws: LaPrimeraLoto5Draw[]) {
  const counts = Array(39).fill(0) as number[];
  for (const draw of draws) for (const number of draw.numbers) counts[number] += 1;
  return counts;
}

function numberScores(results: LaPrimeraLoto5Draw[]) {
  const annual = normalize(countNumbers(results));
  const medium = normalize(countNumbers(results.slice(0, 90)));
  const recent = normalize(countNumbers(results.slice(0, 30)));
  const delays = Array(39).fill(results.length) as number[];
  results.forEach((draw, index) => draw.numbers.forEach((number) => { if (delays[number] === results.length) delays[number] = index; }));
  const normalizedDelay = normalize(delays.map((delay) => Math.min(delay, 45)));
  return Array.from({ length: 39 }, (_, number) => number === 0 ? 0 : annual[number] * 0.42 + medium[number] * 0.33 + recent[number] * 0.2 + normalizedDelay[number] * 0.05);
}

function pairScores(results: LaPrimeraLoto5Draw[]) {
  const pairs = new Map<string, number>();
  for (const draw of results) {
    const numbers = [...draw.numbers].sort((a, b) => a - b);
    for (let i = 0; i < numbers.length; i += 1) for (let j = i + 1; j < numbers.length; j += 1) {
      const key = `${numbers[i]}-${numbers[j]}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...pairs.values());
  return new Map([...pairs].map(([key, count]) => [key, count / max]));
}

function structuralScore(numbers: number[], profile: Loto5Profile) {
  const sum = numbers.reduce((total, number) => total + number, 0);
  const odd = numbers.filter((number) => number % 2 === 1).length;
  let consecutive = 0;
  for (let index = 1; index < numbers.length; index += 1) if (numbers[index] === numbers[index - 1] + 1) consecutive += 1;
  const limits = profile === "fuerte" ? { low: 81, high: 114, oddLow: 2, oddHigh: 3, consecutive: 1 }
    : profile === "equilibrada" ? { low: 69, high: 125, oddLow: 1, oddHigh: 4, consecutive: 2 }
      : { low: 60, high: 135, oddLow: 0, oddHigh: 5, consecutive: 3 };
  if (sum < limits.low || sum > limits.high || odd < limits.oddLow || odd > limits.oddHigh || consecutive > limits.consecutive) return null;
  const center = profile === "fuerte" ? 98 : profile === "equilibrada" ? 97 : 96;
  return 1 - Math.min(1, Math.abs(sum - center) / Math.max(center - limits.low, limits.high - center));
}

type Candidate = { set: number[]; score: number };

function bestCandidates(results: LaPrimeraLoto5Draw[], profile: Loto5Profile) {
  const scores = numberScores(results);
  const pairs = pairScores(results);
  const candidates: Candidate[] = [];
  for (let a = 1; a <= 34; a += 1) for (let b = a + 1; b <= 35; b += 1) for (let c = b + 1; c <= 36; c += 1) for (let d = c + 1; d <= 37; d += 1) for (let e = d + 1; e <= 38; e += 1) {
    const set = [a, b, c, d, e];
    const structure = structuralScore(set, profile);
    if (structure === null) continue;
    const numberScore = set.reduce((total, number) => total + scores[number], 0) / 5;
    let pairScore = 0;
    for (let i = 0; i < 5; i += 1) for (let j = i + 1; j < 5; j += 1) pairScore += pairs.get(`${set[i]}-${set[j]}`) ?? 0;
    pairScore /= 10;
    const profileScore = profile === "fuerte" ? numberScore * 0.58 + pairScore * 0.27 + structure * 0.15
      : profile === "equilibrada" ? numberScore * 0.48 + pairScore * 0.2 + structure * 0.32
        : numberScore * 0.35 + pairScore * 0.15 + (1 - structure) * 0.5;
    candidates.push({ set, score: profileScore });
  }
  return candidates.sort((left, right) => right.score - left.score).slice(0, 1200);
}

function positionCounts(results: LaPrimeraLoto5Draw[]) {
  const counts = Array.from({ length: 5 }, () => Array(39).fill(0) as number[]);
  for (const draw of results) draw.numbers.forEach((number, position) => { counts[position][number] += 1; });
  return counts;
}

function assignPositions(set: number[], counts: number[][], previous: LaPrimeraLoto5Draw | undefined, repeatRequired: boolean) {
  let best: { numbers: number[]; score: number } | null = null;
  function visit(numbers: number[], remaining: number[]) {
    const position = numbers.length;
    if (position === 5) {
      const repeats = previous ? numbers.filter((number, index) => previous.numbers[index] === number).length : 0;
      if ((repeatRequired && repeats !== 1) || (!repeatRequired && repeats !== 0)) return;
      const score = numbers.reduce((total, number, index) => total + counts[index][number], 0);
      if (!best || score > best.score) best = { numbers, score };
      return;
    }
    for (const number of remaining) {
      if (counts[position][number] < 6) continue;
      visit([...numbers, number], remaining.filter((candidate) => candidate !== number));
    }
  }
  visit([], set);
  return best as { numbers: [number, number, number, number, number]; score: number } | null;
}

function plusAssignments(results: LaPrimeraLoto5Draw[], plays: Array<Omit<Loto5PortfolioPlay, "plus">>) {
  const latest = results[0];
  const countsYear = Array(11).fill(0) as number[];
  const counts90 = Array(11).fill(0) as number[];
  const counts30 = Array(11).fill(0) as number[];
  const lastSeen = Array<string | null>(11).fill(null);
  results.forEach((draw, index) => {
    countsYear[draw.plus] += 1;
    if (index < 90) counts90[draw.plus] += 1;
    if (index < 30) counts30[draw.plus] += 1;
    if (lastSeen[draw.plus] === null) lastSeen[draw.plus] = draw.date;
  });
  const latestTime = latest ? Date.parse(`${latest.date}T00:00:00Z`) : Date.now();
  const delayDays = lastSeen.map((date) => date === null
    ? Number.POSITIVE_INFINITY
    : Math.floor((latestTime - Date.parse(`${date}T00:00:00Z`)) / 86_400_000));
  const scores = Array.from({ length: 11 }, (_, number) => countsYear[number] * 0.25 + counts90[number] * 0.4 + counts30[number] * 0.7);
  const assigned = Array(11).fill(0) as number[];
  const previousPlus = latest?.plus;
  return plays.map((play, index) => {
    const profileIndex = index % 20;
    if (previousPlus && profileIndex < 2) {
      assigned[previousPlus] += 1;
      return { ...play, plus: previousPlus };
    }
    const eligible = Array.from({ length: 10 }, (_, item) => item + 1).filter((number) => {
      if (number === previousPlus) return false;
      const cap = delayDays[number] >= 20 ? 3 : 12;
      return assigned[number] < cap;
    });
    const plus = eligible.sort((left, right) => (scores[right] / (assigned[right] + 1)) - (scores[left] / (assigned[left] + 1)) || left - right)[0] ?? 1;
    assigned[plus] += 1;
    return { ...play, plus };
  });
}

export function buildLoto5Portfolio(allResults: LaPrimeraLoto5Draw[], targetDate: string): Loto5PortfolioSnapshot {
  const results = cleanLoto5Results(allResults.filter((draw) => draw.date < targetDate));
  const counts = positionCounts(results);
  const previous = results[0];
  const used = new Set<string>();
  const plays: Array<Omit<Loto5PortfolioPlay, "plus">> = [];
  for (const profile of profiles) {
    const candidates = bestCandidates(results, profile);
    let profileCount = 0;
    for (const candidate of candidates) {
      if (profileCount >= 20) break;
      const key = candidate.set.join("-");
      if (used.has(key)) continue;
      const repeatRequired = profileCount < 2;
      const assigned = assignPositions(candidate.set, counts, previous, repeatRequired);
      if (!assigned) continue;
      used.add(key);
      profileCount += 1;
      plays.push({
        id: plays.length + 1,
        profile,
        numbers: assigned.numbers,
        score: Math.round((candidate.score * 100 + assigned.score / Math.max(1, results.length) * 10) * 10) / 10,
        exactPositionRepeat: repeatRequired,
        explanation: repeatRequired ? "Incluye una repetición exacta de posición del sorteo anterior." : "Sin repeticiones exactas de posición del sorteo anterior."
      });
    }
  }
  if (plays.length !== 60) throw new Error(`Solo se pudieron construir ${plays.length} de las 60 jugadas de Loto 5.`);
  return {
    targetDate,
    generatedAt: new Date().toISOString(),
    algorithmVersion,
    historicalThrough: previous?.date ?? null,
    plays: plusAssignments(results, plays)
  };
}
