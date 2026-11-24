import { summarizeThirtyPlayPrizes } from "./game.ts";
import type { DrawResult, ThirtyPlayPortfolio } from "./types.ts";

/** One shared set of saved records feeds current, previous and calendar. */
export function buildLotoPortfolioView(saved: ThirtyPlayPortfolio[], results: DrawResult[], targetDate: string, calendarDate: string) {
  const current = saved.find(p => p.targetDate === targetDate) ?? null;
  const previousDraw = results.find(d => d.date < targetDate);
  const previous = previousDraw ? saved.find(p => p.targetDate === previousDraw.date) : null;
  const value = new Date(`${calendarDate}T12:00:00Z`), day = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + (day === 0 ? -6 : 1 - day));
  const calendar = [2, 5].map(offset => {
    const dateValue = new Date(value); dateValue.setUTCDate(dateValue.getUTCDate() + offset);
    const date = dateValue.toISOString().slice(0,10);
    const portfolio = saved.find(p => p.targetDate === date), draw = results.find(d => d.date === date);
    return { date, day: offset === 2 ? "miercoles" : "sabado",
      summary: portfolio && draw ? summarizeThirtyPlayPrizes(portfolio, draw) : null,
      status: !portfolio && (draw || date < calendarDate) ? "missing" : "pending" };
  });
  return { current, previous: previous && previousDraw ? { ...previous, draw: previousDraw } : null, calendar };
}
