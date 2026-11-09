import type {InvestorWinner} from "./quinielon-distributor.ts";
import type {LaPrimeraDraw} from "./types.ts";

/** Presentation only: group is taken from the saved distribution, never today's ranking. */
export function quinielonOutcomeTone(draw: Pick<LaPrimeraDraw,"number" | "verification"> | undefined, winner: InvestorWinner | undefined): "neutral" | "danger" | "success" | "warning" {
  if (!draw || draw.verification === "provisional" || !winner || winner.number !== draw.number || !winner.recorded || winner.simulated || winner.validationError || !winner.group) return "neutral";
  if (winner.group === "banca" || !winner.name?.trim()) return "danger";
  return winner.group === "nosotros" ? "success" : "warning";
}

export function summarizeQuinielonOutcomes(tones: readonly ReturnType<typeof quinielonOutcomeTone>[]) {
  const won=tones.filter(tone=>tone==="success" || tone==="warning").length;
  const lost=tones.filter(tone=>tone==="danger").length;
  const evaluated=won+lost;
  const wonPercentage=evaluated ? Math.round(won/evaluated*100) : null;
  return {won,lost,evaluated,pending:tones.length-evaluated,wonPercentage,lostPercentage:wonPercentage===null?null:100-wonPercentage};
}
