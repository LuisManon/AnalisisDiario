/** Analytical audit only: no simulated draws, outcomes, tuning or operational writes. */
import {thresholdProbability,jointThresholdProbability,portfolioCoverageBounds} from "../lib/kino-math.ts";
import {buildV2Portfolio} from "../lib/kino-experiment-v2.ts";
const model={universe:84,drawSize:20,ticketSize:10,threshold:7};
const seed="math-foundation-2026-11-08";
console.log(JSON.stringify({
  model,seed,assumption:"Uniform draws without replacement under repository84/20/10 model; no independently verified rule change",
  marginal:thresholdProbability(model),
  unionUpper200:Math.min(1,200*thresholdProbability(model)),
  jointByOverlap:Array.from({length:11},(_,overlap)=>({overlap,probability:jointThresholdProbability(model,overlap)})),
  exampleDiverse:portfolioCoverageBounds(model,buildV2Portfolio("balanced-diverse",seed)),
  caveat:"Combinatorial counts use BigInt; probabilities/bounds are floating-point evaluations, not machine-certified intervals. One example is not a generator-wide ranking; an upper bound is not necessarily achievable."
},null,2));
