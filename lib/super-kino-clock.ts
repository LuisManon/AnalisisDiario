import noDraws from "../data/super-kino-no-draws.json" with { type: "json" };
export const kinoNoDraws = noDraws;
export function isKinoNoDraw(date: string) { return noDraws.some(d => d.date === date); }
export function kinoClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const value = (name: string) => parts.find(p => p.type === name)!.value;
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  return { date, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}
export function shiftKinoDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function kinoDrawMinutes(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 0 ? 16 * 60 : 21 * 60;
}
export function kinoExpectedDate(now = new Date()) {
  const {date, minutes} = kinoClock(now);
  let expected = minutes >= kinoDrawMinutes(date) ? date : shiftKinoDate(date, -1);
  while (isKinoNoDraw(expected)) expected = shiftKinoDate(expected, -1);
  return expected;
}
// Freeze before the published 20:55 / 15:55 sales/draw boundary; polling starts at 21:00 / 16:00.
export function kinoTargetDate(now = new Date()) {
  const {date, minutes} = kinoClock(now);
  let target = minutes >= kinoDrawMinutes(date) - 5 ? shiftKinoDate(date, 1) : date;
  while (isKinoNoDraw(target)) target = shiftKinoDate(target, 1);
  return target;
}
export function kinoYearStart(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const month = value.getUTCMonth();
  value.setUTCFullYear(value.getUTCFullYear() - 1);
  if (value.getUTCMonth() !== month) value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}
export function kinoDates(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = shiftKinoDate(date, 1)) dates.push(date);
  return dates;
}
