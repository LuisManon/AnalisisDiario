import { z } from "zod";

export const KINO_OFFICIAL = "https://www.leidsa.com/play/draw/leidsa-kinotv";
// First observed draw containing 81–84 in the imported archive; not an official rule-change date.
export const KINO_ANALYSIS_START = "2026-09-15";
export const KINO_CANDIDATE_START = "2026-10-11";
export const KINO_V91_START = "2026-10-12";
export const KINO_V93_START = "2026-10-15";
export function kinoAlgorithmForDate(targetDate: string) {
  if (targetDate >= KINO_V93_START) return "kino-v9.3" as const;
  if (targetDate >= KINO_V91_START) return "kino-v9.1" as const;
  return targetDate >= KINO_CANDIDATE_START ? "kino-v9" as const : "kino-v7" as const;
}
export const kinoDrawSchema = z.object({
  date: z.iso.date(),
  numbers: z.array(z.number().int().min(1).max(84)).length(20).refine(n => new Set(n).size === 20, "Números repetidos"),
  source: z.url()
});
export type KinoDraw = z.infer<typeof kinoDrawSchema>;
export const kinoPrizes = [{hits:10,amount:25000000},{hits:9,amount:200000},{hits:8,amount:10000},{hits:7,amount:1000},{hits:6,amount:300},{hits:5,amount:60},{hits:0,amount:80}];
export function kinoPrize(hits: number) { return kinoPrizes.find(p => p.hits === hits)?.amount ?? 0; }
export function kinoStats(draws: KinoDraw[]) {
  const ordered = [...draws].sort((a,b) => b.date.localeCompare(a.date));
  return Array.from({length:84}, (_,i) => {
    const number = i+1;
    const appearances = ordered.filter(d => d.numbers.includes(number));
    const gap = ordered.findIndex(d => d.numbers.includes(number));
    return {number, count:appearances.length, percent:ordered.length ? appearances.length / ordered.length * 100 : 0, gap:gap < 0 ? ordered.length : gap, lastDate:appearances[0]?.date ?? null};
  });
}
export function kinoGroups(draws: KinoDraw[], allowedNumbers?: ReadonlySet<number>) {
  const ranked = kinoStats(draws)
    .filter(item => !allowedNumbers || allowedNumbers.has(item.number))
    .sort((a,b) => b.count-a.count || a.number-b.number);
  const hotSize = Math.ceil(ranked.length / 3);
  const middleSize = Math.ceil((ranked.length - hotSize) / 2);
  return {
    hot: ranked.slice(0, hotSize),
    middle: ranked.slice(hotSize, hotSize + middleSize),
    cold: ranked.slice(hotSize + middleSize).sort((a,b) => a.count-b.count || b.gap-a.gap || a.number-b.number)
  };
}
export const kinoProfiles = ["fuerte", "equilibrada", "exploratoria"] as const;
export type KinoProfile = typeof kinoProfiles[number];
export const kinoProfileLabels = { fuerte: "Fuertes", equilibrada: "Equilibradas", exploratoria: "Exploratorias" };
export const kinoPlaySchema = z.object({
  id: z.number().int().min(1).max(120),
  profile: z.enum(kinoProfiles),
  numbers: z.array(z.number().int().min(1).max(84)).length(10).refine(n => new Set(n).size === 10),
  hot: z.number().int(), middle: z.number().int(), cold: z.number().int(),
  quickHot: z.boolean().optional()
}).refine(p => p.hot + p.middle + p.cold === 10);
export type KinoPlay = z.infer<typeof kinoPlaySchema>;
export function kinoQuickHotStats(draws: KinoDraw[], allowedNumbers?: ReadonlySet<number>) {
  const ordered = [...draws].sort((a,b) => a.date.localeCompare(b.date));
  return kinoGroups(draws, allowedNumbers).hot.flatMap(item => {
    const appearances: number[] = [];
    ordered.forEach((draw, index) => { if (draw.numbers.includes(item.number)) appearances.push(index); });
    const recentIntervals = appearances.slice(1).map((index, previous) => index - appearances[previous]).slice(-3);
    if (recentIntervals.length < 3) return [];
    const averageInterval = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    return averageInterval >= 1 && averageInterval <= 2 ? [{number: item.number, averageInterval: Number(averageInterval.toFixed(2)), recentIntervals}] : [];
  }).sort((a,b) => a.averageInterval-b.averageInterval || a.number-b.number);
}
export function buildKinoPlays(draws: KinoDraw[], profile: KinoProfile = "exploratoria", allowedNumbers?: ReadonlySet<number>, count = 10, quickHotNumbers: readonly number[] = [], quickHotCount = 0) {
  if (!draws.length) return [];
  const groups = kinoGroups(draws, allowedNumbers);
  const quickHotSet = new Set(quickHotNumbers);
  const quickHotPool = groups.hot.filter(item => quickHotSet.has(item.number));
  const usage = new Map<number, number>();
  const seen = new Set<string>();
  return Array.from({length: count}, (_, index): KinoPlay => {
    const mix = profile === "fuerte" ? [7, 2, 1] : profile === "equilibrada" ? [4, 4, 2] : [3, 3, 4];
    const reinforced = index < quickHotCount;
    const pools = [reinforced ? quickHotPool : groups.hot, groups.middle, groups.cold];
    if (pools.some((pool, group) => pool.length < mix[group])) {
      throw new Error("Quedan muy pocos números elegibles para mantener la composición de las jugadas.");
    }
    let numbers: number[] = [];
    for (let attempt = 0; attempt < 240; attempt++) {
      numbers = [];
      pools.forEach((pool, group) => {
        const rotated = pool.map((_, i) => pool[(i + index * 5 + attempt) % pool.length]);
        rotated.sort((a, b) => (usage.get(a.number) ?? 0) - (usage.get(b.number) ?? 0));
        numbers.push(...rotated.slice(0, mix[group]).map(x => x.number));
      });
      numbers.sort((a, b) => a - b);
      if (!seen.has(numbers.join(","))) break;
    }
    if (seen.has(numbers.join(","))) throw new Error("No se pudieron diversificar las jugadas.");
    seen.add(numbers.join(","));
    numbers.forEach(n => usage.set(n, (usage.get(n) ?? 0) + 1));
    return { id: index + 1, profile, numbers, hot: mix[0], middle: mix[1], cold: mix[2], ...(reinforced ? {quickHot: true} : {}) };
  });
}

type KinoCandidateMode = "none" | "recent" | "blend";
const kinoCandidateMixes = [[3,4,3],[3,4,3],[4,3,3],[3,3,4]] as const;
const kinoOriginalMix = [[3,3,4]] as const;
function kinoPairKey(a: number, b: number) { return a < b ? `${a}-${b}` : `${b}-${a}`; }
function kinoPairStats(draws: KinoDraw[]) {
  const counts = new Map<string, number>();
  const frequency = Array(85).fill(0) as number[];
  for (const draw of draws) {
    for (const number of draw.numbers) frequency[number]++;
    for (let first = 0; first < draw.numbers.length; first++) for (let second = first + 1; second < draw.numbers.length; second++) {
      const key = kinoPairKey(draw.numbers[first], draw.numbers[second]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return {counts, frequency, size: draws.length};
}
function buildKinoCandidateSource(draws: KinoDraw[], targetDate: string, sample: KinoDraw[], allowedNumbers: ReadonlySet<number>, quickHotNumbers: readonly number[], mode: KinoCandidateMode, mixes: readonly (readonly [number,number,number])[] = kinoCandidateMixes, quickHotCount = 2) {
  const groups = kinoGroups(sample, allowedNumbers);
  const groupPools = [groups.hot, groups.middle, groups.cold];
  const quickHotSet = new Set(quickHotNumbers);
  const recentPairs = kinoPairStats(sample);
  const history = draws.filter(draw => draw.date < targetDate).sort((a,b) => a.date.localeCompare(b.date));
  const longPairs = kinoPairStats(history.slice(-180));
  const cohortPairs = kinoPairStats(history.filter(draw => draw.date >= KINO_ANALYSIS_START));
  const usage = new Map<number, number>();
  const seen = new Set<string>();
  const plays: KinoPlay[] = [];
  const affinity = (candidate: number, selected: number[]) => selected.reduce((sum, number) => {
    const key = kinoPairKey(candidate, number);
    const recent = recentPairs.counts.get(key) ?? 0;
    if (mode === "none") return sum;
    if (mode === "recent") return sum + recent;
    const basis = candidate > 80 || number > 80 ? cohortPairs : longPairs;
    const expected = basis.size ? basis.frequency[candidate] * basis.frequency[number] / basis.size : 0;
    const observed = basis.counts.get(key) ?? 0;
    const shrunkenLift = expected > 0 ? (observed + 2 * expected) / (3 * expected) - 1 : 0;
    return sum + recent + 1.5 * shrunkenLift;
  }, 0);
  for (let index = 0; index < 120; index++) {
    const mix = mixes[index % mixes.length];
    let numbers: number[] = [];
    for (let attempt = 0; attempt < 400; attempt++) {
      numbers = [];
      for (let group = 0; group < groupPools.length; group++) {
        let required = mix[group];
        const choose = (pool: typeof groups.hot, size: number) => {
          const rotated = pool.map((_, poolIndex) => pool[(poolIndex + index * 5 + attempt) % pool.length]);
          const noise = (number: number) => attempt ? (((number * 37 + index * 13 + attempt * 17) % 101) / 100 - 0.5) * Math.min(5, attempt / 2) : 0;
          rotated.sort((a,b) => (usage.get(a.number) ?? 0) - (usage.get(b.number) ?? 0) || affinity(b.number, numbers) + noise(b.number) - affinity(a.number, numbers) - noise(a.number));
          return rotated.filter(item => !numbers.includes(item.number)).slice(0, size).map(item => item.number);
        };
        if (group === 0 && index < 30) {
          const quickPool = groupPools[0].filter(item => quickHotSet.has(item.number));
          const take = Math.min(required, quickHotCount, quickPool.length);
          numbers.push(...choose(quickPool, take));
          required -= take;
        }
        numbers.push(...choose(groupPools[group], required));
      }
      numbers.sort((a,b) => a-b);
      if (!seen.has(numbers.join(","))) break;
    }
    if (seen.has(numbers.join(","))) throw new Error("No se pudieron diversificar las jugadas del candidato Kino.");
    seen.add(numbers.join(","));
    numbers.forEach(number => usage.set(number, (usage.get(number) ?? 0) + 1));
    plays.push({id:index+1, profile:"exploratoria", numbers, hot:mix[0], middle:mix[1], cold:mix[2], ...(index < 30 ? {quickHot:true} : {})});
  }
  return plays;
}
function uniqueKinoPlays(preferred: KinoPlay[], fallbacks: KinoPlay[] = []) {
  const seen = new Set<string>();
  const result: KinoPlay[] = [];
  for (const play of [...preferred, ...fallbacks]) {
    const key = play.numbers.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({...play, numbers:[...play.numbers]});
    if (result.length === 120) break;
  }
  if (result.length !== 120) throw new Error("No se pudieron completar 120 jugadas únicas del candidato Kino.");
  return result.map((play,index) => ({...play,id:index+1}));
}
function kinoInverseScores(draws: KinoDraw[], targetDate: string) {
  const previous = draws.filter(draw => draw.date < targetDate).sort((a,b) => b.date.localeCompare(a.date))[0];
  if (!previous) return new Map<number, number>();
  const previousSample = draws.filter(draw => draw.date >= KINO_ANALYSIS_START && draw.date < previous.date).sort((a,b) => b.date.localeCompare(a.date)).slice(0,30);
  if (!previousSample.length) return new Map<number, number>();
  const previousExcluded = new Set(getKinoStaleNumbers(draws, previous.date).map(item => item.number));
  const previousAllowed = new Set(Array.from({length:84},(_,index)=>index+1).filter(number => !previousExcluded.has(number)));
  const previousQuick = kinoQuickHotStats(previousSample, previousAllowed);
  const shadow = buildKinoCandidateSource(draws, previous.date, previousSample, previousAllowed, previousQuick.map(item => item.number), "none", kinoOriginalMix, 3);
  const result = new Set(previous.numbers);
  const totalExposure = new Map<number, number>();
  const zeroExposure = new Map<number, number>();
  for (const play of shadow) {
    const zero = play.numbers.every(number => !result.has(number));
    for (const number of play.numbers) {
      totalExposure.set(number, (totalExposure.get(number) ?? 0) + 1);
      if (zero) zeroExposure.set(number, (zeroExposure.get(number) ?? 0) + 1);
    }
  }
  return new Map(Array.from({length:84},(_,index) => {
    const number = index + 1;
    const total = totalExposure.get(number) ?? 0;
    const zero = zeroExposure.get(number) ?? 0;
    return [number, (total - zero + 1) / (total + 2)];
  }));
}
function buildKinoCandidatePlays(draws: KinoDraw[], targetDate: string, sample: KinoDraw[], allowedNumbers: ReadonlySet<number>, quickHotNumbers: readonly number[]) {
  const recent = buildKinoCandidateSource(draws, targetDate, sample, allowedNumbers, quickHotNumbers, "recent");
  const blend = buildKinoCandidateSource(draws, targetDate, sample, allowedNumbers, quickHotNumbers, "blend");
  const base = uniqueKinoPlays([...blend.slice(0,75), ...recent.slice(75)], [...recent, ...blend]);
  const inverseScores = kinoInverseScores(draws, targetDate);
  const groups = kinoGroups(sample, allowedNumbers);
  const pools = [groups.hot, groups.middle, groups.cold];
  const membership = new Map<number, number>();
  pools.forEach((pool, group) => pool.forEach(item => membership.set(item.number, group)));
  const replacementUsage = new Map<number, number>();
  const inverse = base.map(play => ({...play,numbers:[...play.numbers]}));
  for (let index = 30; index < 60; index++) {
    const play = inverse[index];
    const removed = [...play.numbers].sort((a,b) => (inverseScores.get(a) ?? 0) - (inverseScores.get(b) ?? 0) || a-b)[0];
    const group = membership.get(removed);
    if (group === undefined) continue;
    const replacement = pools[group].map(item => item.number).filter(number => !play.numbers.includes(number)).sort((a,b) =>
      ((inverseScores.get(b) ?? 0) - 0.035 * (replacementUsage.get(b) ?? 0)) - ((inverseScores.get(a) ?? 0) - 0.035 * (replacementUsage.get(a) ?? 0)) || a-b
    )[0];
    if (replacement !== undefined && (inverseScores.get(replacement) ?? 0) > (inverseScores.get(removed) ?? 0)) {
      play.numbers.splice(play.numbers.indexOf(removed),1,replacement);
      play.numbers.sort((a,b) => a-b);
      replacementUsage.set(replacement,(replacementUsage.get(replacement) ?? 0)+1);
    }
  }
  const inverseSeen = new Set<string>();
  const inverseUnique = inverse.map((play,index) => {
    const key = play.numbers.join(",");
    if (!inverseSeen.has(key)) {
      inverseSeen.add(key);
      return play;
    }
    const fallback = base[index];
    inverseSeen.add(fallback.numbers.join(","));
    return fallback;
  });
  const evenTail = base.slice(60).filter((_,index) => index % 2 === 0);
  return uniqueKinoPlays([...base.slice(0,60), ...inverseUnique.slice(30,60), ...evenTail], base);
}

function kinoTransitionStats(draws: KinoDraw[]) {
  const seen = Array(85).fill(0) as number[];
  const repeated = Array(85).fill(0) as number[];
  for (let index = 0; index < draws.length - 1; index++) {
    const next = new Set(draws[index + 1].numbers);
    for (const number of draws[index].numbers) {
      seen[number]++;
      if (next.has(number)) repeated[number]++;
    }
  }
  return {seen, repeated};
}

function applyKinoAntiredundancy(
  plays: KinoPlay[],
  groups: ReturnType<typeof kinoGroups>,
  pairs: ReturnType<typeof kinoPairStats>,
  previous: ReadonlySet<number>,
  persistentTopNumbers: readonly number[]
) {
  const persistent = new Set(persistentTopNumbers);
  const middleRank = new Map(groups.middle.map((item, index) => [item.number, index]));
  const metrics = plays.map((play, index) => {
    let pairScore = 0;
    for (let first = 0; first < play.numbers.length; first++) for (let second = first + 1; second < play.numbers.length; second++) {
      pairScore += pairs.counts.get(kinoPairKey(play.numbers[first], play.numbers[second])) ?? 0;
    }
    const score = pairScore
      + 2 * play.numbers.filter(number => previous.has(number)).length
      + play.numbers.filter(number => persistent.has(number)).length;
    const overlaps = plays.map((other, otherIndex) => otherIndex === index ? 0 : play.numbers.filter(number => other.numbers.includes(number)).length);
    return {
      index,
      play,
      score,
      maxOverlap: Math.max(...overlaps),
      redundancy: overlaps.filter(overlap => overlap >= 5).reduce((sum, overlap) => sum + overlap, 0)
    };
  });
  const dropped = new Set([...metrics]
    .sort((a,b) => b.redundancy-a.redundancy || a.score-b.score || a.index-b.index)
    .slice(0,5)
    .map(metric => metric.index));
  const kept = [...metrics]
    .sort((a,b) => b.score-a.score || a.index-b.index)
    .filter(metric => !dropped.has(metric.index));
  const anchors = [...kept]
    .sort((a,b) => (b.maxOverlap*20+b.redundancy+b.score*0.1)-(a.maxOverlap*20+a.redundancy+a.score*0.1) || b.score-a.score || a.index-b.index)
    .slice(0,5);
  const retained = metrics.filter(metric => !dropped.has(metric.index)).map(metric => ({...metric.play,numbers:[...metric.play.numbers]}));
  const seen = new Set(retained.map(play => play.numbers.join(",")));
  const usage = new Map<number,number>();
  retained.forEach(play => play.numbers.forEach(number => usage.set(number,(usage.get(number) ?? 0)+1)));
  const variants: KinoPlay[] = [];
  for (const anchor of anchors) {
    const removed = anchor.play.numbers
      .filter(number => middleRank.has(number))
      .sort((a,b) => (middleRank.get(b) ?? 0)-(middleRank.get(a) ?? 0) || b-a)[0];
    if (removed === undefined) throw new Error("Una jugada Kino v9.1 no contiene el grupo intermedio esperado.");
    const retained = anchor.play.numbers.filter(number => number !== removed);
    const replacements = groups.middle.map(item => item.number)
      .filter(number => !retained.includes(number) && number !== removed)
      .sort((a,b) => (usage.get(a) ?? 0)-(usage.get(b) ?? 0) || (middleRank.get(a) ?? 0)-(middleRank.get(b) ?? 0) || a-b);
    let variant: KinoPlay | null = null;
    for (const replacement of replacements) {
      const numbers = [...retained,replacement].sort((a,b) => a-b);
      const key = numbers.join(",");
      if (seen.has(key) || numbers.filter(number => persistent.has(number)).length < 3) continue;
      seen.add(key);
      numbers.forEach(number => usage.set(number,(usage.get(number) ?? 0)+1));
      variant = {...anchor.play,numbers};
      break;
    }
    if (!variant) throw new Error("No se pudo completar una rotación intermedia antirredundancia Kino v9.1.");
    variants.push(variant);
  }
  if (retained.length !== 115 || variants.length !== 5) throw new Error("Kino v9.1 requiere 115 jugadas base y 5 rotaciones antirredundancia.");
  let variantIndex = 0;
  return plays.map((play,index) => ({...(dropped.has(index) ? variants[variantIndex++] : play),id:index+1}));
}

function buildKinoPersistentPlays(draws: KinoDraw[], targetDate: string, sample: KinoDraw[], allowedNumbers: ReadonlySet<number>, antiRedundancy = false) {
  const groups = kinoGroups(sample, allowedNumbers);
  const pools = [groups.hot, groups.middle, groups.cold];
  if (groups.hot.length < 20 || groups.middle.length < 3 || groups.cold.length < 2) throw new Error("Quedan muy pocos números elegibles para el candidato persistente Kino.");
  const persistentTopNumbers = groups.hot.slice(0,20).map(item => item.number);
  const persistent = new Set(persistentTopNumbers);
  const pairs = kinoPairStats(sample);
  const history = draws.filter(draw => draw.date >= KINO_ANALYSIS_START && draw.date < targetDate).sort((a,b) => a.date.localeCompare(b.date));
  const transitions = kinoTransitionStats(history);
  const previous = new Set(history.at(-1)?.numbers ?? []);
  const baseRate = 20 / 84;
  const usage = new Map<number,number>();
  const seen = new Set<string>();
  const plays: KinoPlay[] = [];
  const affinity = (candidate: number, selected: number[]) => selected.reduce((sum, number) => sum + (pairs.counts.get(kinoPairKey(candidate, number)) ?? 0), 0);
  const continuation = (candidate: number) => previous.has(candidate)
    ? 3 * ((transitions.repeated[candidate] + 12 * baseRate) / (transitions.seen[candidate] + 12) - baseRate)
    : 0;
  for (let index = 0; index < 120; index++) {
    let numbers: number[] = [];
    for (let attempt = 0; attempt < 80; attempt++) {
      numbers = [];
      for (let group = 0; group < pools.length; group++) {
        let required = [5,3,2][group];
        const choose = (pool: typeof groups.hot, size: number) => {
          const rotated = pool.map((_, poolIndex) => pool[(poolIndex + index * 5 + attempt) % pool.length]);
          const noise = (number: number) => attempt ? (((number * 37 + index * 13 + attempt * 17) % 101) / 100 - 0.5) * Math.min(5, attempt / 2) : 0;
          rotated.sort((a,b) => (usage.get(a.number) ?? 0) - (usage.get(b.number) ?? 0)
            || affinity(b.number, numbers) + continuation(b.number) + noise(b.number) - affinity(a.number, numbers) - continuation(a.number) - noise(a.number));
          return rotated.filter(item => !numbers.includes(item.number)).slice(0,size).map(item => item.number);
        };
        if (group === 0 && attempt < 40) {
          const elitePool = groups.hot.filter(item => persistent.has(item.number));
          const take = Math.min(required, 3, elitePool.length);
          numbers.push(...choose(elitePool, take));
          required -= take;
        }
        numbers.push(...choose(pools[group], required));
      }
      numbers.sort((a,b) => a-b);
      if (!seen.has(numbers.join(",")) && numbers.filter(number => persistent.has(number)).length >= 3) break;
    }
    if (seen.has(numbers.join(",")) || numbers.filter(number => persistent.has(number)).length < 3) {
      let diversified: number[] | null = null;
      outer: for (const pool of pools) for (const old of numbers.filter(number => pool.some(item => item.number === number))) for (const item of pool) {
        if (numbers.includes(item.number)) continue;
        const candidate = numbers.map(number => number === old ? item.number : number).sort((a,b) => a-b);
        if (!seen.has(candidate.join(",")) && candidate.filter(number => persistent.has(number)).length >= 3) {
          diversified = candidate;
          break outer;
        }
      }
      if (!diversified) throw new Error("No se pudieron diversificar las jugadas persistentes Kino.");
      numbers = diversified;
    }
    seen.add(numbers.join(","));
    numbers.forEach(number => usage.set(number, (usage.get(number) ?? 0) + 1));
    plays.push({id:index+1, profile:"exploratoria", numbers, hot:5, middle:3, cold:2});
  }
  return {plays: antiRedundancy ? applyKinoAntiredundancy(plays,groups,pairs,previous,persistentTopNumbers) : plays, persistentTopNumbers};
}

const kinoV92Mixes = [
  ...Array.from({length:30}, () => [5,3,2] as const),
  ...Array.from({length:30}, () => [4,3,3] as const),
  ...Array.from({length:40}, () => [3,3,4] as const),
  ...Array.from({length:20}, () => [4,2,4] as const)
];

function buildKinoV92Plays(sample: KinoDraw[], allowedNumbers: ReadonlySet<number>) {
  const groups = kinoGroups(sample, allowedNumbers);
  const pools = [groups.hot, groups.middle, groups.cold];
  if (groups.hot.length < 20 || groups.middle.length < 3 || groups.cold.length < 4) throw new Error("Quedan muy pocos números elegibles para la cartera Kino v9.2.");
  const persistentTopNumbers = groups.hot.slice(0,20).map(item => item.number);
  const persistent = new Set(persistentTopNumbers);
  const recentPairs = kinoPairStats(sample);
  const usage = new Map<number,number>();
  const pairUsage = new Map<string,number>();
  const seen = new Set<string>();
  const plays: KinoPlay[] = [];
  const overlap = (numbers: number[], play: KinoPlay) => numbers.filter(number => play.numbers.includes(number)).length;
  for (let index=0; index<kinoV92Mixes.length; index++) {
    const mix = kinoV92Mixes[index];
    const persistentMinimum = index < 30 ? 3 : index < 60 ? 2 : 1;
    let accepted: number[] | null = null;
    for (let attempt=0; attempt<500 && !accepted; attempt++) {
      const numbers: number[] = [];
      const choose = (pool: typeof groups.hot, size: number) => {
        for (let slot=0; slot<size; slot++) {
          const candidates = pool.filter(item => !numbers.includes(item.number)).sort((a,b) => {
            const score = (item: typeof a) => {
              const repeatedPairs = numbers.reduce((sum,number) => sum + (pairUsage.get(kinoPairKey(item.number,number)) ?? 0),0);
              const affinity = numbers.reduce((sum,number) => sum + (recentPairs.counts.get(kinoPairKey(item.number,number)) ?? 0),0);
              const jitter = ((item.number*37 + index*17 + attempt*29 + slot*11) % 101) / 101;
              return (usage.get(item.number) ?? 0)*100 + repeatedPairs*8 - affinity*0.35 + jitter;
            };
            return score(a)-score(b) || a.number-b.number;
          });
          if (!candidates.length) throw new Error("No se pudo completar una jugada Kino v9.2.");
          numbers.push(candidates[0].number);
        }
      };
      choose(groups.hot.filter(item => persistent.has(item.number)),persistentMinimum);
      choose(pools[0],mix[0]-persistentMinimum);
      choose(pools[1],mix[1]);
      choose(pools[2],mix[2]);
      numbers.sort((a,b)=>a-b);
      const key = numbers.join(",");
      if (seen.has(key) || plays.some(play => overlap(numbers,play)>6)) continue;
      accepted = numbers;
    }
    if (!accepted) throw new Error("No se pudieron diversificar las 120 jugadas Kino v9.2.");
    seen.add(accepted.join(","));
    accepted.forEach(number => usage.set(number,(usage.get(number) ?? 0)+1));
    for (let first=0; first<accepted.length; first++) for (let second=first+1; second<accepted.length; second++) {
      const key = kinoPairKey(accepted[first],accepted[second]);
      pairUsage.set(key,(pairUsage.get(key) ?? 0)+1);
    }
    plays.push({id:index+1,profile:"exploratoria",numbers:accepted,hot:mix[0],middle:mix[1],cold:mix[2]});
  }
  return {plays,persistentTopNumbers};
}

function buildKinoV93Plays(draws: KinoDraw[], targetDate: string, sample: KinoDraw[], allowedNumbers: ReadonlySet<number>) {
  const base = buildKinoPersistentPlays(draws,targetDate,sample,allowedNumbers,true);
  const diversified = buildKinoV92Plays(sample,allowedNumbers);
  const selected: KinoPlay[] = [];
  const overlap = (left: KinoPlay, right: KinoPlay) => left.numbers.filter(number=>right.numbers.includes(number)).length;
  for (const play of base.plays) {
    if (selected.length === 50) break;
    if (selected.every(existing=>overlap(play,existing)<=6)) selected.push(play);
  }
  for (const [mix,count] of [["4/3/3",30],["3/3/4",30],["4/2/4",10]] as const) {
    let added=0;
    for (const play of diversified.plays) {
      if (`${play.hot}/${play.middle}/${play.cold}` !== mix || !selected.every(existing=>overlap(play,existing)<=6)) continue;
      selected.push(play);
      added++;
      if (added===count) break;
    }
    if (added!==count) throw new Error(`No se pudo completar el bloque híbrido ${mix} de Kino v9.3.`);
  }
  if (selected.length!==120) throw new Error("No se pudieron completar las 120 jugadas híbridas Kino v9.3.");
  return {plays:selected.map((play,index)=>({...play,id:index+1})),persistentTopNumbers:base.persistentTopNumbers};
}

const kinoQuickHotSchema = z.object({
  number: z.number().int().min(1).max(84),
  averageInterval: z.number().min(1).max(2),
  recentIntervals: z.array(z.number().int().positive()).length(3)
});
const kinoPrizeSummarySchema = z.object({
  groups: z.array(z.object({amount: z.number().nonnegative(), count: z.number().int().positive(), total: z.number().nonnegative()})),
  winningPlays: z.number().int().nonnegative(),
  total: z.number().nonnegative()
});
export const kinoSnapshotSchema = z.object({
  targetDate: z.iso.date(), generatedAt: z.iso.datetime(),
  analysisFrom: z.iso.date(), analysisTo: z.iso.date(), sampleSize: z.number().int().positive(),
  algorithm: z.enum(["kino-v2", "kino-v3", "kino-v4", "kino-v5", "kino-v7", "kino-v8", "kino-v9", "kino-v9.1", "kino-v9.2", "kino-v9.3"]),
  delayCutoff: z.iso.date().optional(),
  excludedByDelay: z.array(z.object({
    number: z.number().int().min(1).max(84),
    lastDate: z.iso.date().nullable()
  })).optional(),
  quickHotNumbers: kinoQuickHotSchema.array().optional(),
  persistentTopNumbers: z.array(z.number().int().min(1).max(84)).max(20).optional(),
  prizeSummary: kinoPrizeSummarySchema.optional(),
  prizeDrawNumbers: z.array(z.number().int().min(1).max(84)).length(20).refine(numbers => new Set(numbers).size === 20).optional(),
  plays: kinoPlaySchema.array(),
  prizes: z.array(z.object({hits: z.number().int().min(0).max(10), amount: z.number().nonnegative()})).length(7)
}).superRefine((snapshot, ctx) => {
  if (snapshot.analysisFrom > snapshot.analysisTo || snapshot.analysisTo >= snapshot.targetDate) ctx.addIssue({code: "custom", message: "El análisis debe preceder al sorteo."});
  if (Boolean(snapshot.prizeSummary) !== Boolean(snapshot.prizeDrawNumbers)) ctx.addIssue({code: "custom", message: "El premio registrado requiere conservar también el resultado evaluado."});
  const deadline = new Date(`${snapshot.targetDate}T${new Date(`${snapshot.targetDate}T12:00:00Z`).getUTCDay() === 0 ? "15" : "20"}:55:00-04:00`);
  if (new Date(snapshot.generatedAt) >= deadline) ctx.addIssue({code: "custom", message: "No se admiten jugadas creadas después del cierre."});
  if (snapshot.algorithm === "kino-v9.3") {
    const persistent = new Set(snapshot.persistentTopNumbers ?? []);
    const mixCounts = new Map<string,number>();
    snapshot.plays.forEach(play => mixCounts.set(`${play.hot}/${play.middle}/${play.cold}`,(mixCounts.get(`${play.hot}/${play.middle}/${play.cold}`) ?? 0)+1));
    if (snapshot.plays.length !== 120 || new Set(snapshot.plays.map(play=>play.id)).size !== 120) ctx.addIssue({code:"custom",message:"Kino v9.3 requiere 120 jugadas únicas."});
    if (persistent.size !== 20 || persistent.size !== (snapshot.persistentTopNumbers?.length ?? 0)) ctx.addIssue({code:"custom",message:"Kino v9.3 requiere un top 20 persistente."});
    if (mixCounts.get("5/3/2") !== 50 || mixCounts.get("4/3/3") !== 30 || mixCounts.get("3/3/4") !== 30 || mixCounts.get("4/2/4") !== 10) ctx.addIssue({code:"custom",message:"Kino v9.3 requiere la mezcla híbrida 50/30/30/10."});
    if (snapshot.plays.some((play,index) => play.numbers.filter(number=>persistent.has(number)).length < (index<50?3:index<80?2:1))) ctx.addIssue({code:"custom",message:"Kino v9.3 no cumple la cobertura persistente escalonada."});
    if (snapshot.plays.some((play,index) => snapshot.plays.slice(index+1).some(other => play.numbers.filter(number=>other.numbers.includes(number)).length>6))) ctx.addIssue({code:"custom",message:"Kino v9.3 contiene jugadas demasiado redundantes."});
  } else if (snapshot.algorithm === "kino-v9.2") {
    const persistent = new Set(snapshot.persistentTopNumbers ?? []);
    const mixCounts = new Map<string,number>();
    snapshot.plays.forEach(play => mixCounts.set(`${play.hot}/${play.middle}/${play.cold}`,(mixCounts.get(`${play.hot}/${play.middle}/${play.cold}`) ?? 0)+1));
    if (snapshot.plays.length !== 120 || new Set(snapshot.plays.map(play=>play.id)).size !== 120) ctx.addIssue({code:"custom",message:"Kino v9.2 requiere 120 jugadas únicas."});
    if (persistent.size !== 20 || persistent.size !== (snapshot.persistentTopNumbers?.length ?? 0)) ctx.addIssue({code:"custom",message:"Kino v9.2 requiere un top 20 persistente."});
    if (mixCounts.get("5/3/2") !== 30 || mixCounts.get("4/3/3") !== 30 || mixCounts.get("3/3/4") !== 40 || mixCounts.get("4/2/4") !== 20) ctx.addIssue({code:"custom",message:"Kino v9.2 requiere la mezcla diversificada 30/30/40/20."});
    if (snapshot.plays.some((play,index) => play.numbers.filter(number=>persistent.has(number)).length < (index<30?3:index<60?2:1))) ctx.addIssue({code:"custom",message:"Kino v9.2 no cumple la cobertura persistente escalonada."});
    if (snapshot.plays.some((play,index) => snapshot.plays.slice(index+1).some(other => play.numbers.filter(number=>other.numbers.includes(number)).length>6))) ctx.addIssue({code:"custom",message:"Kino v9.2 contiene jugadas demasiado redundantes."});
  } else if (snapshot.algorithm === "kino-v9" || snapshot.algorithm === "kino-v9.1") {
    const ids = new Set(snapshot.plays.map(play => play.id));
    const persistent = new Set(snapshot.persistentTopNumbers ?? []);
    if (snapshot.plays.length !== 120 || snapshot.plays.some(play => play.profile !== "exploratoria" || play.hot !== 5 || play.middle !== 3 || play.cold !== 2)) ctx.addIssue({code: "custom", message: "Kino v9 requiere 120 jugadas exploratorias 5/3/2."});
    if (ids.size !== 120 || snapshot.plays.some(play => play.id < 1 || play.id > 120)) ctx.addIssue({code: "custom", message: "Kino v9 requiere identificadores del 1 al 120."});
    if (persistent.size !== 20 || persistent.size !== (snapshot.persistentTopNumbers?.length ?? 0)) ctx.addIssue({code: "custom", message: "Kino v9 requiere un top 20 persistente sin duplicados."});
    if (snapshot.plays.some(play => play.numbers.filter(number => persistent.has(number)).length < 3)) ctx.addIssue({code: "custom", message: "Kino v9 requiere al menos tres números del top 20 en cada jugada."});
  } else if (snapshot.algorithm === "kino-v8") {
    const ids = new Set(snapshot.plays.map(play => play.id));
    const quickHotNumbers = new Set(snapshot.quickHotNumbers?.map(item => item.number) ?? []);
    const reinforced = snapshot.plays.filter(play => play.quickHot);
    const mixes = new Set(["3/4/3", "4/3/3", "3/3/4"]);
    if (snapshot.plays.length !== 120 || snapshot.plays.some(play => play.profile !== "exploratoria" || !mixes.has(`${play.hot}/${play.middle}/${play.cold}`))) ctx.addIssue({code: "custom", message: "Kino v8 requiere 120 jugadas exploratorias con la mezcla candidata."});
    if (ids.size !== 120 || snapshot.plays.some(play => play.id < 1 || play.id > 120)) ctx.addIssue({code: "custom", message: "Kino v8 requiere identificadores del 1 al 120."});
    if (quickHotNumbers.size < 3 || quickHotNumbers.size !== (snapshot.quickHotNumbers?.length ?? 0)) ctx.addIssue({code: "custom", message: "Kino v8 requiere al menos tres calientes rápidos distintos."});
    if (reinforced.length !== 30 || reinforced.some(play => play.numbers.filter(number => quickHotNumbers.has(number)).length < 2)) ctx.addIssue({code: "custom", message: "Kino v8 requiere 30 jugadas reforzadas con al menos dos calientes rápidos."});
  } else if (snapshot.algorithm === "kino-v5" || snapshot.algorithm === "kino-v7") {
    const ids = new Set(snapshot.plays.map(play => play.id));
    const quickHotNumbers = new Set(snapshot.quickHotNumbers?.map(item => item.number) ?? []);
    const reinforced = snapshot.plays.filter(play => play.quickHot);
    if (snapshot.plays.length !== 120 || snapshot.plays.some(play => play.profile !== "exploratoria" || play.hot !== 3 || play.middle !== 3 || play.cold !== 4)) ctx.addIssue({code: "custom", message: "Kino v5 requiere 120 jugadas exploratorias 3/3/4."});
    if (ids.size !== 120 || snapshot.plays.some(play => play.id < 1 || play.id > 120)) ctx.addIssue({code: "custom", message: "Kino v5 requiere identificadores del 1 al 120."});
    if (quickHotNumbers.size < 3 || quickHotNumbers.size !== (snapshot.quickHotNumbers?.length ?? 0)) ctx.addIssue({code: "custom", message: "Kino v5 requiere al menos tres calientes rápidos distintos."});
    if (reinforced.length < 30 || reinforced.some(play => play.numbers.filter(number => quickHotNumbers.has(number)).length !== 3)) ctx.addIssue({code: "custom", message: "Kino v5 requiere al menos 30 jugadas reforzadas con tres calientes rápidos."});
  } else if (snapshot.algorithm === "kino-v4") {
    const ids = new Set(snapshot.plays.map(play => play.id));
    if (snapshot.plays.length !== 30) ctx.addIssue({code: "custom", message: "Kino v4 requiere 30 jugadas."});
    if (snapshot.plays.some(play => play.profile !== "exploratoria" || play.hot !== 3 || play.middle !== 3 || play.cold !== 4)) ctx.addIssue({code: "custom", message: "Kino v4 requiere 30 jugadas exploratorias 3/3/4."});
    if (ids.size !== 30 || snapshot.plays.some(play => play.id < 1 || play.id > 30)) ctx.addIssue({code: "custom", message: "Kino v4 requiere identificadores del 1 al 30."});
  } else {
    for (const profile of kinoProfiles) {
      const plays = snapshot.plays.filter(p => p.profile === profile);
      if (plays.length !== 10 || new Set(plays.map(p => p.id)).size !== 10 || plays.some(play => play.id > 10)) ctx.addIssue({code: "custom", message: "Cada perfil requiere 10 jugadas."});
    }
  }
  if (new Set(snapshot.plays.map(p => p.numbers.join(","))).size !== snapshot.plays.length) ctx.addIssue({code: "custom", message: "Hay jugadas duplicadas."});
  if (snapshot.algorithm === "kino-v3" || snapshot.algorithm === "kino-v4" || snapshot.algorithm === "kino-v5" || snapshot.algorithm === "kino-v7" || snapshot.algorithm === "kino-v8" || snapshot.algorithm === "kino-v9" || snapshot.algorithm === "kino-v9.1" || snapshot.algorithm === "kino-v9.2" || snapshot.algorithm === "kino-v9.3") {
    if (!snapshot.delayCutoff || !snapshot.excludedByDelay) ctx.addIssue({code: "custom", message: "Falta el filtro de atraso de un mes."});
    if (snapshot.delayCutoff && snapshot.delayCutoff !== kinoOneMonthCutoff(snapshot.targetDate)) ctx.addIssue({code: "custom", message: "El corte de atraso no corresponde al sorteo."});
    const excluded = new Set(snapshot.excludedByDelay?.map(item => item.number) ?? []);
    if (excluded.size !== (snapshot.excludedByDelay?.length ?? 0)) ctx.addIssue({code: "custom", message: "Hay números excluidos repetidos."});
    if (snapshot.delayCutoff && snapshot.excludedByDelay?.some(item => item.lastDate !== null && item.lastDate >= snapshot.delayCutoff!)) ctx.addIssue({code: "custom", message: "Un número excluido no supera el mes de atraso."});
    if (snapshot.plays.some(play => play.numbers.some(number => excluded.has(number)))) ctx.addIssue({code: "custom", message: "Una jugada contiene un número excluido por atraso."});
  }
});
export type KinoSnapshot = z.infer<typeof kinoSnapshotSchema>;

export function formatKinoPortfolioText(snapshot: KinoSnapshot) {
  const quickNumbers = snapshot.quickHotNumbers?.map(item => `${String(item.number).padStart(2,"0")} (${item.averageInterval.toFixed(2)})`).join(", ") ?? "No aplica";
  const persistentAlgorithm = snapshot.algorithm === "kino-v9" || snapshot.algorithm === "kino-v9.1" || snapshot.algorithm === "kino-v9.2" || snapshot.algorithm === "kino-v9.3";
  const composition = persistentAlgorithm
    ? snapshot.algorithm === "kino-v9.3" ? "Composición principal híbrida: 50×5/3/2 · 30×4/3/3 · 30×3/3/4 · 10×4/2/4; top 20 escalonado + antirredundancia global" : snapshot.algorithm === "kino-v9.2" ? "Composición candidata diversificada: 30×5/3/2 · 30×4/3/3 · 40×3/3/4 · 20×4/2/4; top 20 escalonado + antirredundancia global" : `Composición final 84: 5 calientes · 3 intermedios · 2 fríos; top 20 persistente + continuidad + parejas recientes${snapshot.algorithm === "kino-v9.1" ? " + 5 rotaciones intermedias antirredundancia" : ""}`
    : snapshot.algorithm === "kino-v8"
    ? "Composición candidata: 3/4/3 · 4/3/3 · 3/3/4, con cobertura inversa protegida"
    : "Composición: 3 calientes · 3 intermedios · 4 fríos";
  const reinforcement = persistentAlgorithm
    ? `Top 20 persistente: ${snapshot.persistentTopNumbers?.map(number => String(number).padStart(2,"0")).join(", ") ?? "No aplica"}`
    : `Calientes rápidos · promedio de los 3 intervalos recientes: ${quickNumbers}`;
  const label = persistentAlgorithm ? "[TOP 20]" : "[RÁPIDA 1–2]";
  return [
    `SUPER KINO TV · ${snapshot.plays.length} JUGADAS EXPLORATORIAS`,
    `Sorteo: ${snapshot.targetDate}`,
    `Base histórica: ${snapshot.analysisFrom} a ${snapshot.analysisTo} (${snapshot.sampleSize} sorteos)`,
    composition,
    reinforcement,
    persistentAlgorithm ? "Cada jugada contiene entre 3 y 5 números del top 20." : `[RÁPIDA 1–2] identifica las ${snapshot.plays.filter(play => play.quickHot).length} jugadas reforzadas.`,
    "",
    ...snapshot.plays.map(play => `${String(play.id).padStart(3,"0")} ${persistentAlgorithm ? label : play.quickHot ? label : "[EXPLORATORIA]"} ${play.numbers.map(number => String(number).padStart(2,"0")).join(" ")}`)
  ].join("\n");
}

export function kinoOneMonthCutoff(targetDate: string) {
  const value = new Date(`${targetDate}T12:00:00Z`);
  const targetDay = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() - 1);
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(targetDay, lastDay));
  return value.toISOString().slice(0, 10);
}

export function getKinoStaleNumbers(draws: KinoDraw[], targetDate: string) {
  const cutoff = kinoOneMonthCutoff(targetDate);
  const prior = draws.filter(draw => draw.date < targetDate).sort((a,b) => b.date.localeCompare(a.date));
  return Array.from({length: 84}, (_, index) => {
    const number = index + 1;
    return {number, lastDate: prior.find(draw => draw.numbers.includes(number))?.date ?? null};
  }).filter(item => item.lastDate === null || item.lastDate < cutoff);
}

export function buildKinoSnapshot(draws: KinoDraw[], targetDate: string, now = new Date()): KinoSnapshot {
  const sample = draws.filter(d => d.date >= KINO_ANALYSIS_START && d.date < targetDate).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
  if (!sample.length) throw new Error("No hay historial anterior suficiente para generar las jugadas.");
  const delayCutoff = kinoOneMonthCutoff(targetDate);
  const excludedByDelay = getKinoStaleNumbers(draws, targetDate);
  const excluded = new Set(excludedByDelay.map(item => item.number));
  const allowedNumbers = new Set(Array.from({length: 84}, (_, index) => index + 1).filter(number => !excluded.has(number)));
  const algorithm = kinoAlgorithmForDate(targetDate);
  const quickHotNumbers = kinoQuickHotStats(sample, allowedNumbers);
  const persistentAlgorithm = algorithm === "kino-v9" || algorithm === "kino-v9.1" || algorithm === "kino-v9.3";
  if (!persistentAlgorithm && quickHotNumbers.length < 3) throw new Error("No hay al menos tres números calientes con recurrencia reciente media de 1 a 2 sorteos.");
  const quickNumbers = quickHotNumbers.map(item => item.number);
  const persistent = algorithm === "kino-v9.3" ? buildKinoV93Plays(draws,targetDate,sample,allowedNumbers) : persistentAlgorithm ? buildKinoPersistentPlays(draws, targetDate, sample, allowedNumbers, algorithm === "kino-v9.1") : null;
  return kinoSnapshotSchema.parse({
    targetDate, generatedAt: now.toISOString(), analysisFrom: sample.at(-1)!.date, analysisTo: sample[0].date,
    sampleSize: sample.length, algorithm, delayCutoff, excludedByDelay, ...(persistentAlgorithm ? {} : {quickHotNumbers}), ...(persistent ? {persistentTopNumbers:persistent.persistentTopNumbers} : {}), prizes: kinoPrizes,
    plays: persistent?.plays ?? buildKinoPlays(sample, "exploratoria", allowedNumbers, 120, quickNumbers, 30)
  });
}

export function buildKinoV92Snapshot(draws: KinoDraw[], targetDate: string, now = new Date()): KinoSnapshot {
  const sample = draws.filter(d => d.date >= KINO_ANALYSIS_START && d.date < targetDate).sort((a,b) => b.date.localeCompare(a.date)).slice(0,30);
  if (!sample.length) throw new Error("No hay historial anterior suficiente para generar la candidata Kino v9.2.");
  const delayCutoff = kinoOneMonthCutoff(targetDate);
  const excludedByDelay = getKinoStaleNumbers(draws,targetDate);
  const excluded = new Set(excludedByDelay.map(item=>item.number));
  const allowedNumbers = new Set(Array.from({length:84},(_,index)=>index+1).filter(number=>!excluded.has(number)));
  const candidate = buildKinoV92Plays(sample,allowedNumbers);
  return kinoSnapshotSchema.parse({
    targetDate,generatedAt:now.toISOString(),analysisFrom:sample.at(-1)!.date,analysisTo:sample[0].date,sampleSize:sample.length,
    algorithm:"kino-v9.2",delayCutoff,excludedByDelay,persistentTopNumbers:candidate.persistentTopNumbers,plays:candidate.plays,prizes:kinoPrizes
  });
}
export function evaluateKinoSnapshot(snapshot: KinoSnapshot, draw: KinoDraw) {
  if (draw.date !== snapshot.targetDate) throw new Error("El resultado no corresponde a las jugadas guardadas.");
  return kinoProfiles.filter(profile => snapshot.plays.some(play => play.profile === profile)).map(profile => {
    const plays = snapshot.plays.filter(p => p.profile === profile).map(play => {
      const matches = play.numbers.filter(n => draw.numbers.includes(n));
      return {...play, matches, hits: matches.length, prize: snapshot.prizes.find(p => p.hits === matches.length)?.amount ?? 0};
    });
    const total = plays.reduce((sum, p) => sum + p.prize, 0);
    const cost = plays.length * 25;
    return {profile, plays, total, cost, net: total - cost, winners: plays.filter(p => p.prize > 0).length};
  });
}
export function summarizeKinoPrizes(snapshot: KinoSnapshot, draw: KinoDraw) {
  const winningPlays = evaluateKinoSnapshot(snapshot, draw).flatMap(evaluation => evaluation.plays).filter(play => play.prize > 0);
  const groups = [...new Set(winningPlays.map(play => play.prize))].sort((a,b) => b-a).map(amount => {
    const count = winningPlays.filter(play => play.prize === amount).length;
    return {amount, count, total: amount * count};
  });
  return {groups, winningPlays: winningPlays.length, total: groups.reduce((sum, group) => sum + group.total, 0)};
}
export function freezeKinoPrizeSummaries(snapshots: KinoSnapshot[], draws: KinoDraw[]) {
  return snapshots.map(snapshot => {
    const draw = draws.find(item => item.date === snapshot.targetDate);
    if (!draw) return snapshot;
    const needsMain = !snapshot.prizeSummary || !snapshot.prizeDrawNumbers;
    if (!needsMain) return snapshot;
    return {
      ...snapshot,
      prizeSummary:summarizeKinoPrizes(snapshot, draw), prizeDrawNumbers:[...draw.numbers]
    };
  });
}
export function parseKinoArchive(html: string, source: string): KinoDraw[] {
  const draws: KinoDraw[] = [];
  for (const [,row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    if (!row.includes("lad-t-kino")) continue;
    const date = row.match(/\/resultados\/(\d{4}-\d{2}-\d{2})\//)?.[1];
    const numbers = [...row.matchAll(/<span class="b">\s*(\d{1,2})\s*<\/span>/g)].map(m=>Number(m[1]));
    const parsed = kinoDrawSchema.safeParse({date,numbers,source});
    if (!parsed.success) throw new Error("El archivo Kino contiene un resultado inválido.");
    draws.push(parsed.data);
  }
  if (!draws.length) throw new Error("La fuente no devolvió resultados de Super Kino TV.");
  return draws;
}
