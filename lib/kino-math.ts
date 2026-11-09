/** Offline combinatorics for a uniform draw without replacement. Never a predictor. */
export interface KinoProbabilityModel {
  universe: number;
  drawSize: number;
  ticketSize: number;
  threshold: number;
}

export function choose(n: number, r: number): bigint {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || n < 0) throw new Error("Invalid combination arguments");
  if (r < 0 || r > n) return 0n;
  let result = 1n;
  for (let i = 1; i <= Math.min(r, n - r); i++) result = result * BigInt(n - i + 1) / BigInt(i);
  return result;
}

function validate(model: KinoProbabilityModel) {
  const { universe: n, drawSize: d, ticketSize: t, threshold: k } = model;
  if (![n, d, t, k].every(Number.isSafeInteger) || n < 1 || d < 0 || d > n || t < 0 || t > n || k < 0 || k > t) {
    throw new Error("Invalid uniform-draw model");
  }
}

function ratio(numerator: bigint, denominator: bigint) {
  if (!numerator) return 0;
  const n = Number(numerator), d = Number(denominator);
  if (Number.isFinite(n) && Number.isFinite(d)) return n / d;
  // Preserve significant figures instead of truncating probabilities below1e-18.
  const ns = numerator.toString(), ds = denominator.toString();
  const mantissa = (text: string) => Number(text.slice(0, 16)) / 10 ** (Math.min(16, text.length) - 1);
  return Number(`${mantissa(ns) / mantissa(ds)}e${ns.length - ds.length}`);
}

export function thresholdProbability(model: KinoProbabilityModel): number {
  validate(model);
  const { universe: n, drawSize: d, ticketSize: t, threshold: k } = model;
  let count = 0n;
  for (let h = k; h <= Math.min(t, d); h++) count += choose(t, h) * choose(n - t, d - h);
  return ratio(count, choose(n, d));
}

/** Two equal-size tickets sharing overlap numbers; sum over shared and exclusive hits. */
export function jointThresholdProbability(model: KinoProbabilityModel, overlap: number): number {
  validate(model);
  const { universe: n, drawSize: d, ticketSize: t, threshold: k } = model;
  if (!Number.isSafeInteger(overlap) || overlap < Math.max(0, 2 * t - n) || overlap > t) throw new Error("Invalid ticket overlap");
  const exclusive = t - overlap;
  const outside = n - 2 * t + overlap;
  let count = 0n;
  for (let shared = 0; shared <= Math.min(overlap, d); shared++) {
    for (let a = Math.max(0, k - shared); a <= exclusive; a++) {
      for (let b = Math.max(0, k - shared); b <= exclusive; b++) {
        count += choose(overlap, shared) * choose(exclusive, a) * choose(exclusive, b) * choose(outside, d - shared - a - b);
      }
    }
  }
  return ratio(count, choose(n, d));
}

/** Analytical bounds evaluated numerically, not estimates or achievable targets.
 * Combinatorial counts are exact; returned ratios/bounds have floating-point error.
 * Floating-point summation error can accumulate over ticket pairs: not interval-certified.
 */
export function portfolioCoverageBounds(model: KinoProbabilityModel, tickets: readonly (readonly number[])[]) {
  validate(model);
  const sets = tickets.map(ticket => {
    const set = new Set(ticket);
    if (ticket.length !== model.ticketSize || set.size !== ticket.length || ticket.some(n => !Number.isSafeInteger(n) || n < 1 || n > model.universe)) {
      throw new Error("Invalid ticket");
    }
    return set;
  });
  const probabilities = Array.from({ length: model.ticketSize + 1 }, (_, overlap) =>
    overlap < Math.max(0, 2 * model.ticketSize - model.universe) ? 0 : jointThresholdProbability(model, overlap));
  let pairIntersectionSum = 0;
  for (let i = 0; i < tickets.length; i++) {
    for (let j = i + 1; j < tickets.length; j++) {
      pairIntersectionSum += probabilities[tickets[i]!.filter(n => sets[j]!.has(n)).length]!;
    }
  }
  const marginal = thresholdProbability(model);
  const expectedQualifying = tickets.length * marginal;
  return {
    marginal, expectedQualifying, pairIntersectionSum,
    unionUpper: Math.min(1, expectedQualifying),
    bonferroniLower: Math.max(0, expectedQualifying - pairIntersectionSum),
    secondMomentLower: expectedQualifying ? expectedQualifying ** 2 / (expectedQualifying + 2 * pairIntersectionSum) : 0,
  };
}
