import type { DayFilter, DrawResult } from "./types";

export type SearchType = "main" | "plus" | "both";
export type SearchPosition = "any" | "1" | "2" | "3" | "4" | "5" | "6" | "plus";
export type TrafficStatus = "hot" | "regular" | "cold" | "never";

export type AnalysisMetric = {
  totalDraws: number;
  appearances: number;
  percentage: number;
  lastDate: string | null;
  currentDelay: number | null;
  averageGap: number | null;
  maxGap: number | null;
  recent: Record<10 | 20 | 50 | 100, { appearances: number; percentage: number }>;
  status: TrafficStatus;
};

export type AppearanceRow = {
  date: string;
  day: DrawResult["day"];
  numbers: number[];
  plus: number;
  positions: string[];
  drawId: number;
};

export const statusLabels: Record<TrafficStatus, string> = {
  hot: "🔥 Caliente",
  regular: "⚖️ Regular",
  cold: "❄️ Frío",
  never: "🚫 Nunca"
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function buildMetric(draws: DrawResult[], predicate: (draw: DrawResult) => boolean, expectedRate: number): AnalysisMetric {
  const occurrenceIndexes = draws.flatMap((draw, index) => predicate(draw) ? [index] : []);
  const appearances = occurrenceIndexes.length;
  const percentage = draws.length ? (appearances / draws.length) * 100 : 0;
  const currentDelay = appearances ? occurrenceIndexes[0] : null;
  const gaps = occurrenceIndexes.slice(1).map((index, position) => index - occurrenceIndexes[position] - 1);
  const maxGap = appearances ? Math.max(currentDelay ?? 0, ...gaps, 0) : null;
  const averageGap = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : null;
  const recentSizes = [10, 20, 50, 100] as const;
  const recent = Object.fromEntries(recentSizes.map((size) => {
    const sample = draws.slice(0, size);
    const count = sample.filter(predicate).length;
    return [size, {
      appearances: count,
      percentage: sample.length ? round((count / sample.length) * 100) : 0
    }];
  })) as AnalysisMetric["recent"];

  let status: TrafficStatus = "never";
  if (appearances) {
    const expectedInterval = 1 / Math.max(expectedRate, 0.001);
    const frequencyRatio = (appearances / Math.max(draws.length, 1)) / expectedRate;
    const recentRatio = (recent[20].appearances / Math.max(Math.min(draws.length, 20), 1)) / expectedRate;
    if ((currentDelay ?? Infinity) <= Math.max(2, expectedInterval * 0.45) || frequencyRatio >= 1.3 || recentRatio >= 1.45) {
      status = "hot";
    } else if ((currentDelay ?? 0) >= expectedInterval * 1.55 || frequencyRatio < 0.65) {
      status = "cold";
    } else {
      status = "regular";
    }
  }

  return {
    totalDraws: draws.length,
    appearances,
    percentage: round(percentage),
    lastDate: appearances ? draws[occurrenceIndexes[0]].date : null,
    currentDelay,
    averageGap: averageGap === null ? null : round(averageGap),
    maxGap,
    recent,
    status
  };
}

export function filterAnalysisDraws(results: DrawResult[], day: DayFilter) {
  const ordered = [...results].sort((a, b) => b.date.localeCompare(a.date));
  return day === "todos" ? ordered : ordered.filter((draw) => draw.day === day);
}

export function mainPredicate(number: number, position: SearchPosition) {
  return (draw: DrawResult) => {
    if (position === "plus") return false;
    if (position === "any") return draw.numbers.includes(number);
    return draw.numbers[Number(position) - 1] === number;
  };
}

export function plusPredicate(number: number) {
  return (draw: DrawResult) => draw.plus === number;
}

export function combinedPredicate(mainNumber: number, plusNumber: number, position: SearchPosition) {
  const main = mainPredicate(mainNumber, position);
  const plus = plusPredicate(plusNumber);
  return (draw: DrawResult) => main(draw) || plus(draw);
}

export function analyzeMain(results: DrawResult[], number: number, day: DayFilter, position: SearchPosition) {
  const draws = filterAnalysisDraws(results, day);
  const expectedRate = position === "any" ? 6 / 40 : 1 / 40;
  return buildMetric(draws, mainPredicate(number, position), expectedRate);
}

export function analyzePlus(results: DrawResult[], number: number, day: DayFilter) {
  return buildMetric(filterAnalysisDraws(results, day), plusPredicate(number), 1 / 12);
}

export function analyzeCombined(
  results: DrawResult[],
  mainNumber: number,
  plusNumber: number,
  day: DayFilter,
  position: SearchPosition
) {
  const draws = filterAnalysisDraws(results, day);
  const mainRate = position === "any" ? 6 / 40 : position === "plus" ? 0 : 1 / 40;
  return buildMetric(draws, combinedPredicate(mainNumber, plusNumber, position), Math.min(1, mainRate + 1 / 12));
}

export function analyzePositions(results: DrawResult[], number: number, day: DayFilter) {
  return (["1", "2", "3", "4", "5", "6"] as SearchPosition[]).map((position) => ({
    position: `Posición ${position}`,
    metric: analyzeMain(results, number, day, position)
  }));
}

export function analyzeDays(
  results: DrawResult[],
  mainNumber: number,
  plusNumber: number,
  type: SearchType,
  position: SearchPosition
) {
  return (["miercoles", "sabado"] as const).map((day) => ({
    day,
    metric: type === "main"
      ? analyzeMain(results, mainNumber, day, position)
      : type === "plus"
        ? analyzePlus(results, plusNumber, day)
        : analyzeCombined(results, mainNumber, plusNumber, day, position)
  }));
}

export function buildAppearanceHistory(
  results: DrawResult[],
  mainNumber: number,
  plusNumber: number,
  type: SearchType,
  position: SearchPosition,
  day: DayFilter
): AppearanceRow[] {
  return filterAnalysisDraws(results, day).flatMap((draw) => {
    const positions = draw.numbers.flatMap((number, index) => {
      const positionMatches = position === "any" || position === String(index + 1);
      return type !== "plus" && position !== "plus" && positionMatches && number === mainNumber
        ? [`P${index + 1}`]
        : [];
    });
    if (type !== "main" && draw.plus === plusNumber) positions.push("Más");
    if (!positions.length) return [];
    return [{
      date: draw.date,
      day: draw.day,
      numbers: draw.numbers,
      plus: draw.plus,
      positions,
      drawId: results.length - results.findIndex((result) => result.date === draw.date)
    }];
  });
}

