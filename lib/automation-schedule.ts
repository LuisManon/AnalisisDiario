import { dominicanClock, drawSlots, drawTimestamp, latestPublishedSlot, shiftDrawDate } from "./draw-schedule.ts";

export const automationWindows = [
  { cron: "37 12 * * *", minute: 517, kind: "prepare", final: false },
  { cron: "37 14 * * *", minute: 637, kind: "prepare", final: true },
  { cron: "17 16 * * *", minute: 737, kind: "dia", final: false },
  { cron: "47 16 * * *", minute: 767, kind: "dia", final: false },
  { cron: "17 17 * * *", minute: 797, kind: "dia", final: true },
  { cron: "37 21 * * *", minute: 1057, kind: "prepare-night", final: true },
  { cron: "17 23 * * *", minute: 1157, kind: "noche", final: false },
  { cron: "47 23 * * *", minute: 1187, kind: "noche", final: false },
  { cron: "17 0 * * *", minute: 1217, kind: "noche", final: true },
  { cron: "17 1 * * 0,2-6", minute: 1277, kind: "leidsa", final: false },
  { cron: "47 1 * * 0,2-6", minute: 1307, kind: "leidsa", final: false },
  { cron: "17 2 * * 0,2-6", minute: 1337, kind: "leidsa", final: true },
  { cron: "17 20 * * 0", minute: 977, kind: "leidsa", final: false },
  { cron: "47 20 * * 0", minute: 1007, kind: "leidsa", final: false },
  { cron: "17 21 * * 0", minute: 1037, kind: "leidsa", final: true }
] as const;

export type AutomationOperation = {
  label: string; path: string; body?: { session: "dia" | "noche" };
  expect: "kino-result" | "loto-result" | "quinielon-result" | "portfolio" | "loto-portfolio" | "assignment";
  date: string; session?: "dia" | "noche";
};
export function automationPlan(cron: string, now = new Date()) {
  const window = automationWindows.find(window => window.cron === cron);
  if (!window) throw new Error("Ventana de automatización desconocida.");
  const clock = dominicanClock(now);
  const date = clock.minutes < window.minute ? shiftDrawDate(clock.date, -1) : clock.date;
  const due = drawTimestamp({ date, minutes: window.minute });
  if (now.getTime() - due > 3 * 60 * 60_000) throw new Error("La ventana llegó con más de tres horas de retraso; no se generarán carteras para otra tanda.");
  const operations: AutomationOperation[] = [];
  const missed: string[] = [];
  const add = (operation: AutomationOperation) => operations.push(operation);
  const prepare = (product: "kino" | "loto" | "quinielon", session?: "dia" | "noche") => {
    if (product === "quinielon") {
      const slot = drawSlots(product, date).find(slot => slot.session === session)!;
      if (now.getTime() >= drawTimestamp(slot)) { missed.push(`Preparación ${session}: la tanda ya cerró`); return; }
      add({ label: `Reparto ${session}`, path: "/api/quinielon/distributor", body: { session: session! }, expect: "assignment", date, session });
    } else if (product === "kino") {
      const slot = drawSlots(product, date)[0];
      if (!slot) return;
      if (now.getTime() >= drawTimestamp(slot) - 5 * 60_000) { missed.push("Preparación Kino: el sorteo ya cerró"); return; }
      add({ label: "Cartera Super Kino", path: "/api/super-kino/portfolio", expect: "portfolio", date });
    } else {
      // Loto's application cutoff remains 17:00; prepare only its next open draw.
      let target = date;
      while (!drawSlots("loto", target).length || (target === clock.date && clock.minutes >= 1020)) target = shiftDrawDate(target, 1);
      add({ label: "Carteras Loto Más", path: `/api/portfolio?drawDate=${target}`, expect: "loto-portfolio", date: target });
    }
  };
  if (window.kind === "prepare") {
    add({ label: "Recuperar últimos resultados Kino", path: "/api/super-kino/update", expect: "kino-result", date: latestPublishedSlot("kino", now).date });
    add({ label: "Recuperar ganador Quinielón", path: "/api/la-primera/update", expect: "quinielon-result", date: shiftDrawDate(date, -1), session: "noche" });
    add({ label: "Recuperar ganador Loto Más", path: "/api/update", expect: "loto-result", date: latestPublishedSlot("loto", now).date });
    prepare("kino"); prepare("loto"); prepare("quinielon", "dia");
  } else if (window.kind === "prepare-night") prepare("quinielon", "noche");
  else if (window.kind === "dia" || window.kind === "noche") {
    add({ label: `Ganador Quinielón ${window.kind}`, path: `/api/la-primera/update?date=${date}`, expect: "quinielon-result", date, session: window.kind });
  } else {
    if (drawSlots("kino", date).length) add({ label: "Ganadores Super Kino", path: "/api/super-kino/update", expect: "kino-result", date });
    if (drawSlots("loto", date).length) add({ label: "Ganadores Loto Más", path: "/api/update", expect: "loto-result", date });
    // Evaluate/freeze the saved Kino prizes independently of future generation.
    let nextKinoDate = shiftDrawDate(date, 1);
    while (!drawSlots("kino", nextKinoDate).length) nextKinoDate = shiftDrawDate(nextKinoDate, 1);
    add({ label: "Seguimiento Super Kino", path: "/api/super-kino/portfolio", expect: "portfolio", date: nextKinoDate });
  }
  return { date, window, operations, missed };
}

export function operationReady(operation: AutomationOperation, payload: Record<string, any>) {
  if (operation.expect === "portfolio" || operation.expect === "loto-portfolio") {
    const current = payload.current;
    const saved = current?.targetDate === operation.date && Array.isArray(current.plays) && current.plays.length > 0;
    return saved && (operation.expect !== "loto-portfolio" || (current.plays.length === 30 && payload.exploratory?.current?.targetDate === operation.date && payload.exploratory.current.playCount === 100));
  }
  if (operation.expect === "assignment") return payload.date === operation.date && payload.session === operation.session && Array.isArray(payload.investors) && payload.investors.length === 4;
  return Array.isArray(payload.results) && payload.results.some((draw: {date: string; session?: string; verification?: string}) =>
    draw.date === operation.date && (!operation.session || draw.session === operation.session) && (operation.expect !== "quinielon-result" || draw.verification !== "provisional"));
}
