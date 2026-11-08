import kinoNoDraws from "../data/super-kino-no-draws.json" with { type: "json" };
export type ScheduledProduct = "kino" | "loto" | "quinielon";
export type DrawSlot = { date: string; session?: "dia" | "noche"; minutes: number };
export const PUBLICATION_DELAY_MINUTES = 15;
export function dominicanClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
export function shiftDrawDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function drawSlots(product: ScheduledProduct, date: string): DrawSlot[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (product === "kino" && kinoNoDraws.some(draw => draw.date === date)) return [];
  if (product === "quinielon") return [{ date, session: "dia", minutes: 720 }, { date, session: "noche", minutes: 1140 }];
  if (product === "loto" && weekday !== 3 && weekday !== 6) return [];
  return [{ date, minutes: product === "kino" && weekday === 0 ? 955 : 1255 }];
}
export function drawTimestamp(slot: DrawSlot) {
  return Date.parse(`${slot.date}T${String(Math.floor(slot.minutes / 60)).padStart(2, "0")}:${String(slot.minutes % 60).padStart(2, "0")}:00-04:00`);
}
export function publicationWindow(product: ScheduledProduct, now = new Date()) {
  const { date } = dominicanClock(now);
  const slot = drawSlots(product, date).find(slot => now.getTime() >= drawTimestamp(slot) && now.getTime() < drawTimestamp(slot) + PUBLICATION_DELAY_MINUTES * 60_000);
  return slot ? { ...slot, remainingMinutes: Math.ceil((drawTimestamp(slot) + PUBLICATION_DELAY_MINUTES * 60_000 - now.getTime()) / 60_000) } : null;
}
export function latestPublishedSlot(product: ScheduledProduct, now = new Date()): DrawSlot {
  const { date } = dominicanClock(now);
  for (let offset = 0; offset < 8; offset++) {
    const slot = drawSlots(product, shiftDrawDate(date, -offset)).reverse().find(slot => drawTimestamp(slot) + PUBLICATION_DELAY_MINUTES * 60_000 <= now.getTime());
    if (slot) return slot;
  }
  throw new Error("No se encontró una ventana de publicación.");
}

export function canGenerateLotoPortfolio(date: string, now = new Date()) {
  return drawSlots("loto", date).length > 0 && now.getTime() < Date.parse(`${date}T17:00:00-04:00`);
}
