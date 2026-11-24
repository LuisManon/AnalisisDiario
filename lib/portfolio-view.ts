import { summarizeKinoPrizes, type KinoDraw, type KinoSnapshot } from "./super-kino.ts";
import type { KinoNeighborSnapshot } from "./super-kino-neighbor.ts";

export type KinoCalendarEntry = Pick<KinoSnapshot, "targetDate" | "prizes" | "prizeSummary" | "simulation">;
export type NeighborCalendarEntry = Pick<KinoNeighborSnapshot, "targetDate" | "prizeSummary"> & { playCount: number };

/** Frozen prizes always win over a subsequently corrected source result. */
export function compactKinoPortfolio(portfolio: { current: KinoSnapshot | null; snapshots: KinoSnapshot[]; waitingForResult?: boolean }, results: KinoDraw[]) {
  const snapshots: KinoCalendarEntry[] = portfolio.snapshots.map(s => {
    const draw = results.find(d => d.date === s.targetDate);
    return { targetDate: s.targetDate, prizes: s.prizes, simulation: s.simulation,
      prizeSummary: s.prizeSummary ?? (draw ? summarizeKinoPrizes(s, s.prizeDrawNumbers ? { ...draw, numbers: s.prizeDrawNumbers } : draw) : undefined) };
  });
  const latest = portfolio.snapshots.find(s => results.some(d => d.date === s.targetDate)) ?? null;
  return { current: portfolio.current, latest, snapshots, waitingForResult: portfolio.waitingForResult };
}

export function compactNeighborPortfolio(portfolio: { current: KinoNeighborSnapshot | null; snapshots: KinoNeighborSnapshot[]; startDate: string }) {
  const snapshots: NeighborCalendarEntry[] = portfolio.snapshots.map(s => ({ targetDate: s.targetDate, prizeSummary: s.prizeSummary, playCount: s.plays.length }));
  return { current: portfolio.current, snapshots, startDate: portfolio.startDate };
}
