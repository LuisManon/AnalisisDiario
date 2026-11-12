import { dominicanClock, drawSlots, shiftDrawDate } from "./draw-schedule.ts";

/** Display the pending draw independently of the 17:00 generation cutoff. */
export function lotoPortfolioDisplayDate(results: readonly { date: string }[], now = new Date()) {
  const { date } = dominicanClock(now);
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = shiftDrawDate(date, offset);
    if (drawSlots("loto", candidate).length && !results.some(draw => draw.date === candidate)) return candidate;
  }
  throw new Error("No se encontró un próximo sorteo de Loto Más.");
}
