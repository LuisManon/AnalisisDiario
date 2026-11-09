/** Validate only the minimum stored state required by the scheduler. No writes. */
import { operationReady, type AutomationOperation } from "./automation-schedule.ts";
import { kinoSnapshotSchema } from "./super-kino.ts";
import { validateAssignment, type Assignment } from "./quinielon-distributor.ts";

export const savedStateKinds = ["kino-result", "loto-result", "quinielon-result", "portfolio", "loto-portfolio", "assignment"] as const;
export type SavedStateKind = typeof savedStateKinds[number];
export function savedStateReady(kind: SavedStateKind, date: string, session: "dia" | "noche" | undefined, value: unknown) {
  if (kind === "portfolio") {
    const parsed = kinoSnapshotSchema.safeParse(value);
    return parsed.success && parsed.data.targetDate === date && !parsed.data.simulation;
  }
  if (kind === "assignment") {
    const assignment = value as Assignment | null;
    return Boolean(assignment && !assignment.simulation && assignment.date === date && assignment.session === session && !validateAssignment(assignment));
  }
  const operation: AutomationOperation = {label:"Stored state",path:"",expect:kind,date,session};
  return operationReady(operation, kind === "loto-portfolio" ? {current:value} : {results:value});
}
