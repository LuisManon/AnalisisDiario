import { dominicanClock, drawSlots, drawTimestamp, latestPublishedSlot, shiftDrawDate } from "./draw-schedule.ts";
import { KINO_NEIGHBOR_START, KINO_NEIGHBOR_VERSION } from "./super-kino-neighbor-schedule.ts";

export const automationWindows = [
  { cron: "37 12 * * *", minute: 517, kind: "prepare", final: false },
  { cron: "37 14 * * *", minute: 637, kind: "prepare", final: true },
  { cron: "17 16 * * *", minute: 737, kind: "dia", final: false },
  { cron: "47 16 * * *", minute: 767, kind: "dia", final: false },
  { cron: "17 17 * * *", minute: 797, kind: "dia", final: true },
  { cron: "37 17 * * *", minute: 817, kind: "prepare-night", final: false },
  { cron: "37 19 * * *", minute: 937, kind: "prepare-night", final: false },
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
  label: string; path: string; body?: { session: "dia" | "noche" } | { date: string };
  expect: "kino-result" | "loto-result" | "quinielon-result" | "portfolio" | "neighbor-portfolio" | "loto-portfolio" | "assignment" | "saved-state";
  date: string; session?: "dia" | "noche"; deadline?: number; verifyFirst?: boolean;
};
type AutomationPlan = { date: string; window: typeof automationWindows[number]; operations: AutomationOperation[]; expired: boolean };
export function automationPlan(cron: string, now = new Date()): AutomationPlan {
  const window = automationWindows.find(window => window.cron === cron);
  if (!window) throw new Error("Ventana de automatización desconocida.");
  const clock = dominicanClock(now);
  const date = clock.minutes < window.minute ? shiftDrawDate(clock.date, -1) : clock.date;
  const due = drawTimestamp({ date, minutes: window.minute });
  if (now.getTime() - due > 6 * 60 * 60_000) {
    // Reconstruct the intended targets, not the current/next session. Never call
    // generation or update endpoints when the window has expired.
    const intended = automationPlan(cron, new Date(due));
    return { ...intended, expired: true, operations: intended.operations.map(savedStateOperation) };
  }
  const operations: AutomationOperation[] = [];
  const add = (operation: AutomationOperation) => {
    // A late trigger must verify the original record, never move generation to
    // another session or declare failure before checking persisted state.
    operations.push(operation.deadline !== undefined && now.getTime() >= operation.deadline
      ? savedStateOperation(operation) : operation);
  };
  const prepareNeighbor = (target: string) => {
    if (target >= KINO_NEIGHBOR_START) add({ label: "Cartera Super Kino TV ±1", path: "/api/super-kino-neighbor/portfolio", body: { date: target }, expect: "neighbor-portfolio", date: target, verifyFirst: true, deadline: drawTimestamp(drawSlots("kino", target)[0]) });
  };
  const prepare = (product: "kino" | "loto" | "quinielon", session?: "dia" | "noche") => {
    if (product === "quinielon") {
      const slot = drawSlots(product, date).find(slot => slot.session === session)!;
      add({ label: `Reparto ${session}`, path: "/api/quinielon/distributor", body: { session: session! }, expect: "assignment", date, session, verifyFirst: true, deadline: drawTimestamp(slot) });
    } else if (product === "kino") {
      const slot = drawSlots(product, date)[0];
      if (!slot) return;
      add({ label: "Cartera Super Kino", path: "/api/super-kino/portfolio", expect: "portfolio", date, verifyFirst: true, deadline: drawTimestamp(slot) - 5 * 60_000 });
      prepareNeighbor(date);
    } else {
      // Loto's application cutoff remains 17:00; prepare only its next open draw.
      let target = date;
      while (!drawSlots("loto", target).length || (target === clock.date && clock.minutes >= 1020)) target = shiftDrawDate(target, 1);
      add({ label: "Cartera Loto Más", path: `/api/portfolio?drawDate=${target}`, expect: "loto-portfolio", date: target, verifyFirst: true, deadline: Date.parse(`${target}T17:00:00-04:00`) });
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
    prepareNeighbor(nextKinoDate);
  }
  return { date, window, operations, expired: false };
}

export function operationReady(operation: AutomationOperation, payload: Record<string, any>) {
  if (operation.expect === "saved-state") return payload.ready === true && payload.date === operation.date && (!operation.session || payload.session === operation.session);
  if (operation.expect === "neighbor-portfolio") return payload.current?.targetDate === operation.date && payload.current?.version === KINO_NEIGHBOR_VERSION && Array.isArray(payload.current.plays) && payload.current.plays.length === 200;
  if (operation.expect === "portfolio" || operation.expect === "loto-portfolio") {
    const current = payload.current;
    const saved = current?.targetDate === operation.date && Array.isArray(current.plays) && current.plays.length > 0;
    return saved && (operation.expect !== "loto-portfolio" || current.plays.length === 30);
  }
  if (operation.expect === "assignment") return payload.date === operation.date && payload.session === operation.session && Array.isArray(payload.investors) && payload.investors.length === 4;
  return Array.isArray(payload.results) && payload.results.some((draw: {date: string; session?: string; verification?: string}) =>
    draw.date === operation.date && (!operation.session || draw.session === operation.session) && (operation.expect !== "quinielon-result" || draw.verification !== "provisional"));
}

export function savedStateOperation(operation: AutomationOperation): AutomationOperation {
  return { ...operation, expect: "saved-state", body: undefined, verifyFirst: false,
    path: `/api/automation/status?kind=${operation.expect}&date=${operation.date}${operation.session ? `&session=${operation.session}` : ""}` };
}
