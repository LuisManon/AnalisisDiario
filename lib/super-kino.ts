import { z } from "zod";

export const KINO_OFFICIAL = "https://www.leidsa.com/play/draw/leidsa-kinotv";
// First observed draw containing 81–84 in the imported archive; not an official rule-change date.
export const KINO_ANALYSIS_START = "2026-09-15";
export const KINO_CANDIDATE_START = "2026-10-11";
export const KINO_V91_START = "2026-10-12";
export const KINO_V93_START = "2026-10-15";
export const KINO_V94_START = "2026-10-16";
export const KINO_V10_START = "2026-10-25";
export const KINO_STRATEGIC_EXCLUSION_START = "2026-10-26";
export const KINO_STRATEGY_VERSION = "low-frequency-stale-v1";
export function kinoStrategyVersionForDate(targetDate:string) {
  return targetDate>=KINO_STRATEGIC_EXCLUSION_START?KINO_STRATEGY_VERSION:undefined;
}
export function kinoAlgorithmForDate(targetDate: string) {
  if (targetDate >= KINO_V10_START) return "kino-v10" as const;
  if (targetDate >= KINO_V94_START) return "kino-v9.4" as const;
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
  id: z.number().int().min(1).max(200),
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

function buildKinoDiversifiedPlays(sample: KinoDraw[], allowedNumbers: ReadonlySet<number>, mixes: readonly (readonly [number,number,number])[], initialPlays: KinoPlay[]) {
  const groups = kinoGroups(sample, allowedNumbers);
  const pools = [groups.hot, groups.middle, groups.cold];
  if (groups.hot.length < 20 || mixes.some(mix=>pools.some((pool,index)=>pool.length<mix[index]))) throw new Error("Quedan muy pocos números elegibles para la cobertura diversificada Kino.");
  const persistentTopNumbers = groups.hot.slice(0,20).map(item => item.number);
  const persistent = new Set(persistentTopNumbers);
  const recentPairs = kinoPairStats(sample);
  const usage = new Map<number,number>();
  const pairUsage = new Map<string,number>();
  const rangeIndex = (number: number) => number <= 9 ? 0 : Math.min(8,Math.floor(number/10));
  const rangeUsage = new Map<number,number>();
  const recentRangeSample=sample.slice(0,10);
  const rangeAppearances = Array.from({length:9},(_,range)=>recentRangeSample.reduce((sum,draw)=>sum+draw.numbers.filter(number=>rangeIndex(number)===range).length,0));
  const rangeTargets = rangeAppearances.map(count=>Math.max(1,count/recentRangeSample.length/2*mixes.length));
  const seen = new Set<string>();
  const plays: KinoPlay[] = initialPlays.map(play=>({...play,numbers:[...play.numbers]}));
  for (const play of plays) {
    seen.add(play.numbers.join(","));
    play.numbers.forEach(number=>usage.set(number,(usage.get(number)??0)+1));
    play.numbers.forEach(number=>rangeUsage.set(rangeIndex(number),(rangeUsage.get(rangeIndex(number))??0)+1));
    for (let first=0;first<play.numbers.length;first++) for (let second=first+1;second<play.numbers.length;second++) {
      const key=kinoPairKey(play.numbers[first],play.numbers[second]);
      pairUsage.set(key,(pairUsage.get(key)??0)+1);
    }
  }
  const overlap = (numbers: number[], play: KinoPlay) => numbers.filter(number => play.numbers.includes(number)).length;
  for (let index=0; index<mixes.length; index++) {
    const mix = mixes[index];
    const playIndex=initialPlays.length+index;
    const persistentMinimum = mix[0]===0 ? 0 : mix[0]>=8 ? 3 : mix[0]>=4 && mix[1]>=3 ? 2 : 1;
    let accepted: number[] | null = null;
    for (let attempt=0; attempt<500 && !accepted; attempt++) {
      const numbers: number[] = [];
      const remaining=[...mix];
      const score = (item: typeof groups.hot[number], slot: number) => {
        const repeatedPairs = numbers.reduce((sum,number) => sum + (pairUsage.get(kinoPairKey(item.number,number)) ?? 0),0);
        const affinity = numbers.reduce((sum,number) => sum + (recentPairs.counts.get(kinoPairKey(item.number,number)) ?? 0),0);
        const range=rangeIndex(item.number);
        const rangePressure=((rangeUsage.get(range)??0)/rangeTargets[range])*1000;
        const jitter = ((item.number*37 + playIndex*17 + attempt*29 + slot*11) % 101) / 101 * 300;
        return (usage.get(item.number) ?? 0)*25 + repeatedPairs*8 + rangePressure - affinity*0.35 + jitter;
      };
      const lowChoices=pools.flatMap((pool,group)=>remaining[group]>0?pool.filter(item=>item.number<=9).map(item=>({item,group})):[]).sort((a,b)=>score(a.item,0)-score(b.item,0)||a.item.number-b.item.number);
      if (!lowChoices.length) throw new Error("No hay números del 1 al 9 elegibles para completar Kino v9.3.");
      const lowChoice=lowChoices[attempt%Math.min(5,lowChoices.length)];
      numbers.push(lowChoice.item.number);
      remaining[lowChoice.group]--;
      const choose = (pool: typeof groups.hot, size: number, group: number) => {
        for (let slot=0; slot<size; slot++) {
          const lowCount=numbers.filter(number=>number<=9).length;
          const candidates = pool.filter(item => !numbers.includes(item.number) && (lowCount<3 || item.number>9)).sort((a,b) => score(a,slot+group*10)-score(b,slot+group*10) || a.number-b.number);
          if (!candidates.length) throw new Error("No se pudo completar una jugada diversificada Kino.");
          numbers.push(candidates[(attempt+slot*3+group)%Math.min(6,candidates.length)].number);
        }
      };
      const persistentAlready=numbers.filter(number=>persistent.has(number)).length;
      const persistentNeeded=Math.max(0,persistentMinimum-persistentAlready);
      choose(groups.hot.filter(item => persistent.has(item.number)),persistentNeeded,0);
      remaining[0]-=persistentNeeded;
      choose(pools[0],remaining[0],0);
      choose(pools[1],remaining[1],1);
      choose(pools[2],remaining[2],2);
      numbers.sort((a,b)=>a-b);
      const key = numbers.join(",");
      if (numbers.length!==10 || numbers.filter(number=>number<=9).length<1 || numbers.filter(number=>number<=9).length>3 || seen.has(key) || plays.some(play => overlap(numbers,play)>8)) continue;
      accepted = numbers;
    }
    if (!accepted) throw new Error(`No se pudo diversificar la jugada Kino ${playIndex+1}.`);
    seen.add(accepted.join(","));
    accepted.forEach(number => usage.set(number,(usage.get(number) ?? 0)+1));
    accepted.forEach(number => rangeUsage.set(rangeIndex(number),(rangeUsage.get(rangeIndex(number))??0)+1));
    for (let first=0; first<accepted.length; first++) for (let second=first+1; second<accepted.length; second++) {
      const key = kinoPairKey(accepted[first],accepted[second]);
      pairUsage.set(key,(pairUsage.get(key) ?? 0)+1);
    }
    plays.push({id:playIndex+1,profile:"exploratoria",numbers:accepted,hot:mix[0],middle:mix[1],cold:mix[2]});
  }
  return {plays,persistentTopNumbers};
}

function buildKinoV93Plays(sample: KinoDraw[], allowedNumbers: ReadonlySet<number>) {
  const mixes = [
    ...Array.from({length:25},()=>[10,0,0] as const),
    ...Array.from({length:18},()=>[1,9,0] as const),
    ...Array.from({length:17},()=>[0,9,1] as const),
    ...Array.from({length:10},()=>[0,0,10] as const),
    ...Array.from({length:20},()=>[4,3,3] as const),
    ...Array.from({length:15},()=>[5,3,2] as const),
    ...Array.from({length:15},()=>[3,3,4] as const)
  ];
  const hybrid=buildKinoDiversifiedPlays(sample,allowedNumbers,mixes,[]);
  if (hybrid.plays.length!==120) throw new Error("No se pudieron completar las 120 jugadas híbridas Kino v9.3.");
  return {plays:hybrid.plays.map((play,index)=>({...play,id:index+1})),persistentTopNumbers:hybrid.persistentTopNumbers};
}

type KinoMix = readonly [number,number,number];

export function kinoAdaptiveMixes(requested:KinoMix, maximumDistance=6):KinoMix[] {
  const supportChanges=(candidate:KinoMix)=>candidate.reduce((total,value,index)=>
    total+Number((requested[index]===0)!==(value===0)),0);
  return Array.from({length:11},(_,hot)=>Array.from({length:11-hot},(_,middle)=>
    [hot,middle,10-hot-middle] as KinoMix
  )).flat()
    // Moving at most three positions keeps the requested strategy recognizable
    // while covering every nearby group distribution automatically.
    .filter(candidate=>candidate.reduce((total,value,index)=>total+Math.abs(value-requested[index]),0)<=maximumDistance)
    .sort((left,right)=>{
      const distance=(candidate:KinoMix)=>candidate.reduce((total,value,index)=>total+Math.abs(value-requested[index]),0);
      return distance(left)-distance(right)
        || supportChanges(left)-supportChanges(right)
        || right[0]-left[0]
        || right[1]-left[1]
        || right[2]-left[2];
    });
}

function buildKinoV94Plays(sample: KinoDraw[], allowedNumbers: ReadonlySet<number>, freshNumbers: ReadonlySet<number>, playCount:120|200=120) {
  const mixCounts=playCount===200?[42,30,28,17,33,25,25]:[25,18,17,10,20,15,15];
  const mixTemplates:KinoMix[]=[[10,0,0],[1,9,0],[0,9,1],[0,0,10],[4,3,3],[5,3,2],[3,3,4]];
  const mixes=mixTemplates.flatMap((mix,index)=>Array.from({length:mixCounts[index]},()=>mix));
  const groups = kinoGroups(sample,freshNumbers);
  const recoveryNumbers=new Set([...allowedNumbers].filter(number=>!freshNumbers.has(number)));
  // A fully fresh eligible universe legitimately has nothing to recover. The
  // old fixed tail made every one of those plays require a number from an empty
  // set, causing an exhaustive search until the function timed out.
  const recoveryPlayCount=recoveryNumbers.size===0?0:playCount===200?25:15;
  const hotThreshold=groups.hot.at(-1)?.count??Infinity;
  const middleThreshold=groups.middle.at(-1)?.count??Infinity;
  const recoveryItems=kinoStats(sample).filter(item=>recoveryNumbers.has(item.number));
  const pools = [
    [...groups.hot,...recoveryItems.filter(item=>item.count>=hotThreshold)],
    [...groups.middle,...recoveryItems.filter(item=>item.count<hotThreshold&&item.count>=middleThreshold)],
    [...groups.cold,...recoveryItems.filter(item=>item.count<middleThreshold)]
  ];
  if (groups.hot.length<20 || pools.some(pool=>pool.length<10)) throw new Error("Quedan muy pocos números elegibles para Kino v9.4.");
  const persistentTopNumbers=groups.hot.slice(0,20).map(item=>item.number);
  const persistent=new Set(persistentTopNumbers);
  // Use the ranges players naturally read on the ticket: 1–10, 11–20, ...
  // 81–84. The previous 1–9/10–19 split made the displayed range model and
  // the generated tickets disagree about where number 10 belonged.
  const rangeIndex=(number:number)=>Math.min(8,Math.floor((number-1)/10));
  const recent=sample.slice(0,10);
  const previous=sample.slice(10,20);
  const rangeAverage=(draws:KinoDraw[],range:number)=>draws.length?draws.reduce((sum,draw)=>sum+draw.numbers.filter(number=>rangeIndex(number)===range).length,0)/draws.length:0;
  const rangeModel=Array.from({length:9},(_,range)=>{
    const recentAverage=rangeAverage(recent,range);
    const previousAverage=rangeAverage(previous,range);
    const historicalAverage=rangeAverage(sample,range);
    const concentrationRate=sample.filter(draw=>draw.numbers.filter(number=>rangeIndex(number)===range).length>=4).length/sample.length;
    const momentum=recentAverage-previousAverage;
    const score=recentAverage*.55+previousAverage*.20+historicalAverage*.25+concentrationRate*.6+Math.max(0,momentum)*.25;
    return {range,from:range*10+1,to:range===8?84:range*10+10,recentAverage,previousAverage,historicalAverage,concentrationRate,momentum,score};
  });
  const dominantRanges=[...rangeModel].sort((a,b)=>b.score-a.score||a.range-b.range).slice(0,3);
  const usage=new Map<number,number>();
  const rangeUsage=new Map<number,number>();
  const pairUsage=new Map<string,number>();
  const recentPairs=kinoPairStats(recent);
  const seen=new Set<string>();
  const plays:KinoPlay[]=[];
  const overlap=(numbers:number[],play:KinoPlay)=>numbers.filter(number=>play.numbers.includes(number)).length;
  const groupByNumber=new Map<number,number>();
  pools.forEach((pool,group)=>pool.forEach(item=>groupByNumber.set(item.number,group)));
  // A winning draw has recently carried roughly two numbers from 1–10. Keep
  // every generated ticket at exactly two instead of spending the portfolio
  // on one-low-number or overconcentrated low-number combinations.
  const mandatoryMinimums=[2,0,1,0,0,0,0,0,1];
  const adaptiveWeights=rangeModel.map((item,range)=>Math.max(.08,item.score/2-mandatoryMinimums[range]));
  const adaptiveTotal=adaptiveWeights.reduce((sum,weight)=>sum+weight,0);
  const openSlots=10-mandatoryMinimums.reduce((sum,count)=>sum+count,0);
  const targetTotals=adaptiveWeights.map((weight,range)=>mandatoryMinimums[range]*playCount+weight/adaptiveTotal*(playCount*openSlots));
  const rangeCaps=[2,4,2,4,4,4,4,4,2];

  for(let index=0;index<mixes.length;index++) {
    const requestedMix=mixes[index];
    // Start with the intended nearby compositions, then try the three balanced
    // production mixes as a bounded fallback. This prevents an impossible
    // extreme mix (for example 0/0/10 after eligibility exclusions) from
    // stalling the whole portfolio without opening an unbounded search space.
    const mixVariants=[...new Map([...kinoAdaptiveMixes(requestedMix),[3,3,4] as KinoMix,[4,3,3] as KinoMix,[5,3,2] as KinoMix].map(mix=>[mix.join("/"),mix])).values()];
    const recoveryPlay=index>=playCount-recoveryPlayCount;
    const candidateNumbers=recoveryPlay?allowedNumbers:freshNumbers;
    let accepted:number[]|null=null;
    let acceptedMix:KinoMix=requestedMix;
    // Keep portfolio creation within a serverless request budget. Some range/group
    // combinations are impossible and the recursive search used to spend minutes
    // proving that before trying the next adaptive mix.
    const attemptsPerMix=90;
    for(let attempt=0;attempt<mixVariants.length*attemptsPerMix&&!accepted;attempt++) {
      const mixIndex=Math.floor(attempt/attemptsPerMix);
      const mixAttempt=attempt%attemptsPerMix;
      const mix=mixVariants[mixIndex];
      const persistentMinimum=mix[0]===0?0:mix[0]>=8?3:mix[0]>=4&&mix[1]>=3?2:1;
      const remainingRanges=[...mandatoryMinimums];
      const concentrationScenario=index%4===0;
      if(concentrationScenario) {
        const preferredDesired=index%12===0?4:3;
        const desired=mixAttempt<300?preferredDesired:Math.max(2,preferredDesired-1);
        const preferred=Math.floor(index/4)%dominantRanges.length;
        const candidates=dominantRanges.map((item,position)=>({
          range:item.range, position,
          available:pools.reduce((sum,pool,group)=>sum+Math.min(mix[group],pool.filter(entry=>candidateNumbers.has(entry.number)&&rangeIndex(entry.number)===item.range).length),0)
        }));
        const selected=candidates.find(item=>item.position===preferred&&item.available>=Math.min(desired,rangeCaps[item.range]))
          ??candidates.filter(item=>item.available>=Math.min(desired,rangeCaps[item.range])).sort((a,b)=>b.available-a.available||a.position-b.position)[0]
          ??candidates.sort((a,b)=>b.available-a.available||a.position-b.position)[0];
        const dominant=selected.range;
        const availableForMix=selected.available;
        remainingRanges[dominant]=Math.max(remainingRanges[dominant],Math.min(desired,rangeCaps[dominant],availableForMix));
      }
      for(let slot=remainingRanges.reduce((sum,count)=>sum+count,0);slot<10;slot++) {
        const choices=Array.from({length:9},(_,range)=>range).filter(range=>{
          const available=pools.reduce((sum,pool,group)=>sum+(mix[group]>0?pool.filter(item=>candidateNumbers.has(item.number)&&rangeIndex(item.number)===range).length:0),0);
          return remainingRanges[range]<Math.min(rangeCaps[range],available);
        }).sort((a,b)=>
          (targetTotals[b]-((rangeUsage.get(b)??0)+remainingRanges[b]))-(targetTotals[a]-((rangeUsage.get(a)??0)+remainingRanges[a]))
          || ((a+attempt+slot+index)%9)-((b+attempt+slot+index)%9)
        );
        const choice=choices[(attempt+slot)%Math.min(3,choices.length)];
        remainingRanges[choice]++;
      }
      const remainingGroups=[...mix];
      const selected:number[]=[];
      const score=(number:number,depth:number)=>{
        const repeatedPairs=selected.reduce((sum,other)=>sum+(pairUsage.get(kinoPairKey(number,other))??0),0);
        const affinity=selected.reduce((sum,other)=>sum+(recentPairs.counts.get(kinoPairKey(number,other))??0),0);
        const jitter=((number*37+index*17+attempt*29+depth*11)%101)/101*60;
        const recoveryPriority=recoveryPlay&&recoveryNumbers.has(number)?-10_000:0;
        return recoveryPriority+(usage.get(number)??0)*25+repeatedPairs*8-affinity*.35+jitter;
      };
      const feasible=()=>{
        for(let group=0;group<3;group++) {
          let capacity=0;
          for(let range=0;range<9;range++) if(remainingRanges[range]>0&&pools[group].some(item=>candidateNumbers.has(item.number)&&rangeIndex(item.number)===range&&!selected.includes(item.number))) capacity+=remainingRanges[range];
          if(capacity<remainingGroups[group]) return false;
        }
        for(let range=0;range<9;range++) {
          const available=pools.reduce((sum,pool,group)=>sum+(remainingGroups[group]>0?pool.filter(item=>candidateNumbers.has(item.number)&&rangeIndex(item.number)===range&&!selected.includes(item.number)).length:0),0);
          if(available<remainingRanges[range]) return false;
        }
        return true;
      };
      let searchNodes=0;
      const maximumSearchNodes=1_200;
      const search=(depth:number):boolean=>{
        if(++searchNodes>maximumSearchNodes) return false;
        if(depth===10) return remainingGroups.every(value=>value===0)&&remainingRanges.every(value=>value===0)&&selected.filter(number=>persistent.has(number)).length>=persistentMinimum&&(!recoveryPlay||selected.some(number=>recoveryNumbers.has(number)));
        if(!feasible()) return false;
        const persistentNeeded=Math.max(0,persistentMinimum-selected.filter(number=>persistent.has(number)).length);
        if(remainingGroups[0]<persistentNeeded) return false;
        const nextRange=Array.from({length:9},(_,range)=>range).filter(range=>remainingRanges[range]>0).sort((a,b)=>{
          const available=(range:number)=>pools.reduce((sum,pool,group)=>sum+(remainingGroups[group]>0?pool.filter(item=>candidateNumbers.has(item.number)&&rangeIndex(item.number)===range&&!selected.includes(item.number)).length:0),0);
          return available(a)/remainingRanges[a]-available(b)/remainingRanges[b]||a-b;
        })[0];
        const options:{number:number;group:number;range:number;score:number}[]=[];
        for(let group=0;group<3;group++) if(remainingGroups[group]>0) for(const item of pools[group]) {
          if(!candidateNumbers.has(item.number)||rangeIndex(item.number)!==nextRange||selected.includes(item.number)) continue;
          if(group===0&&remainingGroups[0]===persistentNeeded&&!persistent.has(item.number)) continue;
          options.push({number:item.number,group,range:nextRange,score:score(item.number,depth)});
        }
        options.sort((a,b)=>a.score-b.score||a.number-b.number);
        for(const option of options.slice(0,Math.min(30,options.length))) {
          selected.push(option.number); remainingGroups[option.group]--; remainingRanges[option.range]--;
          if(search(depth+1)) return true;
          selected.pop(); remainingGroups[option.group]++; remainingRanges[option.range]++;
        }
        return false;
      };
      if(!search(0)) continue;
      selected.sort((a,b)=>a-b);
      const key=selected.join(",");
      // Prefer at most eight shared numbers. Near the end of a constrained
      // 120-play portfolio, allow nine only after exhausting the strict search;
      // the exact-play check still guarantees every ticket is unique.
      const maximumOverlap = mixIndex===0 || mixAttempt<300 ? 8 : 9;
      if(seen.has(key)||selected.filter(number=>persistent.has(number)).length<persistentMinimum||(playCount===120&&plays.some(play=>overlap(selected,play)>maximumOverlap))) continue;
      accepted=selected;
      acceptedMix=mix;
    }
    if(!accepted) throw new Error(`No se pudo completar la jugada Kino v9.4 #${index+1}.`);
    seen.add(accepted.join(","));
    accepted.forEach(number=>{usage.set(number,(usage.get(number)??0)+1);rangeUsage.set(rangeIndex(number),(rangeUsage.get(rangeIndex(number))??0)+1);});
    for(let first=0;first<accepted.length;first++) for(let second=first+1;second<accepted.length;second++) {
      const key=kinoPairKey(accepted[first],accepted[second]); pairUsage.set(key,(pairUsage.get(key)??0)+1);
    }
    plays.push({id:index+1,profile:"exploratoria",numbers:accepted,hot:acceptedMix[0],middle:acceptedMix[1],cold:acceptedMix[2]});
  }
  return {
    plays,persistentTopNumbers,recoveryNumbers:[...recoveryNumbers].sort((a,b)=>a-b),
    recoveryPlayCount,
    rangeModel:rangeModel.map(item=>({...item,dominant:dominantRanges.some(candidate=>candidate.range===item.range)})),
    concentrationPlayCount:plays.filter((_,index)=>index%4===0).length
  };
}

function buildKinoV10Plays(sample: KinoDraw[], allowedNumbers: ReadonlySet<number>, freshNumbers: ReadonlySet<number>) {
  return {...buildKinoV94Plays(sample,allowedNumbers,freshNumbers,200),portfolioPlan:{core:200,recombination:0,underexposed:0,contrast:0}};
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
  algorithm: z.enum(["kino-v2", "kino-v3", "kino-v4", "kino-v5", "kino-v7", "kino-v8", "kino-v9", "kino-v9.1", "kino-v9.3", "kino-v9.4", "kino-v10"]),
  strategyVersion:z.literal(KINO_STRATEGY_VERSION).optional(),
  delayCutoff: z.iso.date().optional(),
  maximumDaysWithoutAppearance: z.number().int().positive().optional(),
  minimumGlobalAppearances: z.number().int().positive().optional(),
  recoveryPlayCount: z.number().int().nonnegative().optional(),
  recoveryNumbers: z.array(z.number().int().min(1).max(84)).optional(),
  concentrationPlayCount: z.number().int().nonnegative().optional(),
  portfolioPlan:z.object({core:z.literal(200),recombination:z.literal(0),underexposed:z.literal(0),contrast:z.literal(0)}).optional(),
  rangeModel: z.array(z.object({
    range:z.number().int().min(0).max(8), from:z.number().int().min(1).max(84), to:z.number().int().min(1).max(84),
    recentAverage:z.number().nonnegative(), previousAverage:z.number().nonnegative(), historicalAverage:z.number().nonnegative(),
    concentrationRate:z.number().min(0).max(1), momentum:z.number(), score:z.number().nonnegative(), dominant:z.boolean()
  })).length(9).optional(),
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
  if (snapshot.algorithm === "kino-v9.3" || snapshot.algorithm === "kino-v9.4" || snapshot.algorithm === "kino-v10") {
    const persistent = new Set(snapshot.persistentTopNumbers ?? []);
    const mixCounts = new Map<string,number>();
    snapshot.plays.forEach(play => mixCounts.set(`${play.hot}/${play.middle}/${play.cold}`,(mixCounts.get(`${play.hot}/${play.middle}/${play.cold}`) ?? 0)+1));
    const constrainedPlays=snapshot.algorithm==="kino-v10"?snapshot.plays.slice(0,120):snapshot.plays;
    const expectedPlayCount=snapshot.algorithm==="kino-v10"?200:120;
    if (snapshot.plays.length !== expectedPlayCount || new Set(snapshot.plays.map(play=>play.id)).size !== expectedPlayCount) ctx.addIssue({code:"custom",message:`${snapshot.algorithm} requiere ${expectedPlayCount} jugadas únicas.`});
    if (persistent.size !== 20 || persistent.size !== (snapshot.persistentTopNumbers?.length ?? 0)) ctx.addIssue({code:"custom",message:"Kino v9.3 requiere un top 20 persistente."});
    if (snapshot.algorithm === "kino-v9.3" && (mixCounts.get("10/0/0") !== 25 || mixCounts.get("1/9/0") !== 18 || mixCounts.get("0/9/1") !== 17 || mixCounts.get("0/0/10") !== 10 || mixCounts.get("4/3/3") !== 20 || mixCounts.get("5/3/2") !== 15 || mixCounts.get("3/3/4") !== 15)) ctx.addIssue({code:"custom",message:"Kino v9.3 requiere 70 coberturas de grupo con anclas bajas y 50 híbridas."});
    if (snapshot.algorithm === "kino-v9.3" && constrainedPlays.some(play=>play.numbers.filter(number=>number>=1&&number<=9).length<1 || play.numbers.filter(number=>number>=1&&number<=9).length>3)) ctx.addIssue({code:"custom",message:"Cada jugada base Kino v9.3 requiere entre uno y tres números del 1 al 9."});
    if (constrainedPlays.some(play => play.numbers.filter(number=>persistent.has(number)).length < (play.hot===0?0:play.hot>=8?3:play.hot>=4&&play.middle>=3?2:1))) ctx.addIssue({code:"custom",message:"La base Kino no cumple la cobertura persistente escalonada."});
    if (snapshot.algorithm!=="kino-v10"&&snapshot.plays.some((play,index) => snapshot.plays.slice(index+1).some(other => play.numbers.filter(number=>other.numbers.includes(number)).length>8))) ctx.addIssue({code:"custom",message:"Kino v9.3 contiene jugadas demasiado redundantes."});
    if(snapshot.algorithm==="kino-v9.4" || snapshot.algorithm==="kino-v10") {
      if(snapshot.maximumDaysWithoutAppearance!==9||snapshot.minimumGlobalAppearances!==4) ctx.addIssue({code:"custom",message:"Kino v9.4 requiere atraso máximo de 9 días y al menos 4 salidas globales."});
      if(snapshot.recoveryPlayCount!==undefined||snapshot.recoveryNumbers!==undefined) {
        const recovery=new Set(snapshot.recoveryNumbers??[]);
        const expectedRecovery=(snapshot.recoveryNumbers?.length??0)===0?0:snapshot.algorithm==="kino-v10"?25:15;
        const expectedConcentration=snapshot.algorithm==="kino-v10"?50:30;
        const recoveryStart=snapshot.plays.length-expectedRecovery;
        if(snapshot.recoveryPlayCount!==expectedRecovery||recovery.size!==(snapshot.recoveryNumbers?.length??0)) ctx.addIssue({code:"custom",message:`${snapshot.algorithm} requiere ${expectedRecovery} jugadas de recuperación y números únicos.`});
        if(snapshot.rangeModel&&(snapshot.concentrationPlayCount!==expectedConcentration||snapshot.rangeModel.filter(item=>item.dominant).length!==3)) ctx.addIssue({code:"custom",message:`${snapshot.algorithm} requiere tres rangos dominantes y ${expectedConcentration} jugadas de concentración.`});
        const usesNaturalTenRanges=snapshot.rangeModel?.[0]?.to===10;
        const invalidRangeShape=usesNaturalTenRanges
          ? snapshot.plays.some(play=>{const counts=Array.from({length:9},(_,range)=>play.numbers.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length);return counts[0]!==2||counts[2]<1||counts[2]>2||counts[8]<1||counts[8]>2||counts.some(count=>count>4)})
          : snapshot.plays.some(play=>{const counts=Array.from({length:9},(_,range)=>play.numbers.filter(number=>(number<=9?0:Math.min(8,Math.floor(number/10)))===range).length);return counts[0]<1||counts[0]>3||counts[2]<1||counts[2]>2||counts[8]<1||counts[8]>2||counts.some(count=>count>4)});
        if(invalidRangeShape) ctx.addIssue({code:"custom",message:usesNaturalTenRanges?`${snapshot.algorithm} requiere exactamente 2 números de 1–10, además de cobertura en 21–30 y 81–84, con concentración máxima de cuatro por rango.`:`${snapshot.algorithm} histórico requiere 1–9, 20–29 y 80–84 en cada jugada.`});
        if(snapshot.plays.slice(0,recoveryStart).some(play=>play.numbers.some(number=>recovery.has(number)))||snapshot.plays.slice(recoveryStart).some(play=>!play.numbers.some(number=>recovery.has(number)))) ctx.addIssue({code:"custom",message:`Las ${expectedRecovery} jugadas finales deben cubrir los números de recuperación.`});
      }
      if(snapshot.algorithm==="kino-v10"&&(snapshot.portfolioPlan?.core!==200||snapshot.portfolioPlan.recombination!==0||snapshot.portfolioPlan.underexposed!==0||snapshot.portfolioPlan.contrast!==0)) ctx.addIssue({code:"custom",message:"Kino v10 requiere 200 jugadas generadas directamente por la estrategia v9.4."});
    }
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
  if (snapshot.algorithm === "kino-v3" || snapshot.algorithm === "kino-v4" || snapshot.algorithm === "kino-v5" || snapshot.algorithm === "kino-v7" || snapshot.algorithm === "kino-v8" || snapshot.algorithm === "kino-v9" || snapshot.algorithm === "kino-v9.1" || snapshot.algorithm === "kino-v9.3" || snapshot.algorithm === "kino-v9.4" || snapshot.algorithm === "kino-v10") {
    if (!snapshot.delayCutoff || !snapshot.excludedByDelay) ctx.addIssue({code: "custom", message: "Falta el filtro de atraso."});
    const expectedCutoff=snapshot.algorithm==="kino-v9.4"||snapshot.algorithm==="kino-v10"?kinoNineDayCutoff(snapshot.targetDate):kinoOneMonthCutoff(snapshot.targetDate);
    if (snapshot.delayCutoff && snapshot.delayCutoff !== expectedCutoff) ctx.addIssue({code: "custom", message: "El corte de atraso no corresponde al sorteo."});
    const excluded = new Set(snapshot.excludedByDelay?.map(item => item.number) ?? []);
    if (excluded.size !== (snapshot.excludedByDelay?.length ?? 0)) ctx.addIssue({code: "custom", message: "Hay números excluidos repetidos."});
    if (snapshot.algorithm!=="kino-v9.4"&&snapshot.algorithm!=="kino-v10"&&snapshot.delayCutoff && snapshot.excludedByDelay?.some(item => item.lastDate !== null && item.lastDate >= snapshot.delayCutoff!)) ctx.addIssue({code: "custom", message: "Un número excluido no supera el mes de atraso."});
    if (snapshot.plays.some(play => play.numbers.some(number => excluded.has(number)))) ctx.addIssue({code: "custom", message: "Una jugada contiene un número excluido por atraso."});
  }
});
export type KinoSnapshot = z.infer<typeof kinoSnapshotSchema>;

export function formatKinoPortfolioText(snapshot: KinoSnapshot) {
  const quickNumbers = snapshot.quickHotNumbers?.map(item => `${String(item.number).padStart(2,"0")} (${item.averageInterval.toFixed(2)})`).join(", ") ?? "No aplica";
  const persistentAlgorithm = snapshot.algorithm === "kino-v9" || snapshot.algorithm === "kino-v9.1" || snapshot.algorithm === "kino-v9.3" || snapshot.algorithm === "kino-v9.4" || snapshot.algorithm === "kino-v10";
  const composition = persistentAlgorithm
    ? snapshot.algorithm === "kino-v9.3" || snapshot.algorithm === "kino-v9.4" || snapshot.algorithm === "kino-v10" ? `Composición principal por grupos y rangos: ${snapshot.algorithm==="kino-v10"?"42×10/0/0 · 30×1/9/0 · 28×0/9/1 · 17×0/0/10 · 33×4/3/3 · 25×5/3/2 · 25×3/3/4; 200 jugadas v9.4 escaladas, 175 recientes + 25 de recuperación":"25×10/0/0 · 18×1/9/0 · 17×0/9/1 · 10×0/0/10 · 20×4/3/3 · 15×5/3/2 · 15×3/3/4; "+(snapshot.algorithm==="kino-v9.4"?"modelo adaptativo de rangos: 90 jugadas ponderadas + 30 escenarios de concentración; 105 recientes + 15 de recuperación":"cada jugada contiene 1–3 números del 1 al 9")}` : `Composición final 84: 5 calientes · 3 intermedios · 2 fríos; top 20 persistente + continuidad + parejas recientes${snapshot.algorithm === "kino-v9.1" ? " + 5 rotaciones intermedias antirredundancia" : ""}`
    : snapshot.algorithm === "kino-v8"
    ? "Composición candidata: 3/4/3 · 4/3/3 · 3/3/4, con cobertura inversa protegida"
    : "Composición: 3 calientes · 3 intermedios · 4 fríos";
  const reinforcement = persistentAlgorithm
    ? `Top 20 persistente: ${snapshot.persistentTopNumbers ? [...snapshot.persistentTopNumbers].sort((a,b)=>a-b).map(number => String(number).padStart(2,"0")).join(", ") : "No aplica"}`
    : `Calientes rápidos · promedio de los 3 intervalos recientes: ${quickNumbers}`;
  const label = persistentAlgorithm ? "[TOP 20]" : "[RÁPIDA 1–2]";
  return [
    `SUPER KINO TV · ${snapshot.plays.length} JUGADAS EXPLORATORIAS`,
    `Sorteo: ${snapshot.targetDate}`,
    `Base histórica: ${snapshot.analysisFrom} a ${snapshot.analysisTo} (${snapshot.sampleSize} sorteos)`,
    composition,
    reinforcement,
    ...(snapshot.algorithm==="kino-v9.4"||snapshot.algorithm==="kino-v10"?[`Números de recuperación (>9 días): ${snapshot.recoveryNumbers?.map(number=>String(number).padStart(2,"0")).join(", ")||"Ninguno"}`]:[]),
    persistentAlgorithm ? snapshot.algorithm==="kino-v9.3"||snapshot.algorithm==="kino-v9.4"||snapshot.algorithm==="kino-v10" ? "La cobertura del top 20 es escalonada según la composición caliente de cada jugada." : "Cada jugada contiene entre 3 y 5 números del top 20." : `[RÁPIDA 1–2] identifica las ${snapshot.plays.filter(play => play.quickHot).length} jugadas reforzadas.`,
    "",
    ...snapshot.plays.map(play => `${String(play.id).padStart(3,"0")} ${(snapshot.algorithm==="kino-v10"&&play.id>175)||(snapshot.algorithm==="kino-v9.4"&&play.id>105)?"[RECUPERACIÓN]":persistentAlgorithm ? label : play.quickHot ? label : "[EXPLORATORIA]"} ${play.numbers.map(number => String(number).padStart(2,"0")).join(" ")}`)
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

export function kinoNineDayCutoff(targetDate:string) {
  const value=new Date(`${targetDate}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate()-9);
  return value.toISOString().slice(0,10);
}

export function getKinoStaleNumbers(draws: KinoDraw[], targetDate: string) {
  const cutoff = kinoOneMonthCutoff(targetDate);
  const prior = draws.filter(draw => draw.date < targetDate).sort((a,b) => b.date.localeCompare(a.date));
  return Array.from({length: 84}, (_, index) => {
    const number = index + 1;
    return {number, lastDate: prior.find(draw => draw.numbers.includes(number))?.date ?? null};
  }).filter(item => item.lastDate === null || item.lastDate < cutoff);
}

function buildKinoSnapshotForAlgorithm(draws: KinoDraw[], targetDate: string, now:Date, forcedAlgorithm?:"kino-v9.4"|"kino-v10"): KinoSnapshot {
  const sample = draws.filter(d => d.date >= KINO_ANALYSIS_START && d.date < targetDate).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30);
  if (!sample.length) throw new Error("No hay historial anterior suficiente para generar las jugadas.");
  const algorithm = forcedAlgorithm??kinoAlgorithmForDate(targetDate);
  const v94=algorithm==="kino-v9.4"||algorithm==="kino-v10";
  const priorFormatDraws=draws.filter(draw=>draw.date>=KINO_ANALYSIS_START&&draw.date<targetDate).sort((a,b)=>b.date.localeCompare(a.date));
  const delayCutoff = v94?kinoNineDayCutoff(targetDate):kinoOneMonthCutoff(targetDate);
  const globalFrequency=new Map<number,number>();
  priorFormatDraws.forEach(draw=>draw.numbers.forEach(number=>globalFrequency.set(number,(globalFrequency.get(number)??0)+1)));
  const eligibility=Array.from({length:84},(_,index)=>{
    const number=index+1;
    return {number,lastDate:priorFormatDraws.find(draw=>draw.numbers.includes(number))?.date??null};
  });
  const latestPriorDate=priorFormatDraws[0]?.date;
  const strategicExclusions=kinoStrategyVersionForDate(targetDate)&&latestPriorDate?eligibility.filter(item=>{
    if(item.lastDate===null||(globalFrequency.get(item.number)??0)>7) return false;
    const daysWithoutAppearance=(new Date(`${latestPriorDate}T12:00:00Z`).getTime()-new Date(`${item.lastDate}T12:00:00Z`).getTime())/86_400_000;
    return daysWithoutAppearance>5;
  }):[];
  const baseExclusions=v94?eligibility.filter(item=>(globalFrequency.get(item.number)??0)<4):getKinoStaleNumbers(draws, targetDate);
  const excludedByDelay=[...new Map([...baseExclusions,...strategicExclusions].map(item=>[item.number,item])).values()].sort((a,b)=>a.number-b.number);
  const excluded = new Set(excludedByDelay.map(item => item.number));
  const allowedNumbers = new Set(Array.from({length: 84}, (_, index) => index + 1).filter(number => !excluded.has(number)));
  const freshNumbers=new Set([...allowedNumbers].filter(number=>{
    const lastDate=eligibility.find(item=>item.number===number)?.lastDate;
    return lastDate!==null&&lastDate!==undefined&&lastDate>=delayCutoff;
  }));
  const quickHotNumbers = kinoQuickHotStats(sample, allowedNumbers);
  const persistentAlgorithm = algorithm === "kino-v9" || algorithm === "kino-v9.1" || algorithm === "kino-v9.3" || algorithm === "kino-v9.4" || algorithm === "kino-v10";
  if (!persistentAlgorithm && quickHotNumbers.length < 3) throw new Error("No hay al menos tres números calientes con recurrencia reciente media de 1 a 2 sorteos.");
  const quickNumbers = quickHotNumbers.map(item => item.number);
  const persistent = algorithm === "kino-v10"?buildKinoV10Plays(sample,allowedNumbers,freshNumbers):algorithm === "kino-v9.4"?buildKinoV94Plays(sample,allowedNumbers,freshNumbers):algorithm === "kino-v9.3" ? buildKinoV93Plays(sample,allowedNumbers) : persistentAlgorithm ? buildKinoPersistentPlays(draws, targetDate, sample, allowedNumbers, algorithm === "kino-v9.1") : null;
  return kinoSnapshotSchema.parse({
    targetDate, generatedAt: now.toISOString(), analysisFrom: sample.at(-1)!.date, analysisTo: sample[0].date,
    sampleSize: sample.length, algorithm, ...(kinoStrategyVersionForDate(targetDate)?{strategyVersion:KINO_STRATEGY_VERSION}:{}), delayCutoff, excludedByDelay, ...(v94?{maximumDaysWithoutAppearance:9,minimumGlobalAppearances:4,recoveryPlayCount:persistent&&"recoveryPlayCount" in persistent?persistent.recoveryPlayCount:0,recoveryNumbers:persistent&&"recoveryNumbers" in persistent?persistent.recoveryNumbers:[],concentrationPlayCount:persistent&&"concentrationPlayCount" in persistent?persistent.concentrationPlayCount:undefined,rangeModel:persistent&&"rangeModel" in persistent?persistent.rangeModel:undefined,...(persistent&&"portfolioPlan" in persistent?{portfolioPlan:persistent.portfolioPlan}:{})}:{}), ...(persistentAlgorithm ? {} : {quickHotNumbers}), ...(persistent ? {persistentTopNumbers:persistent.persistentTopNumbers} : {}), prizes: kinoPrizes,
    plays: persistent?.plays ?? buildKinoPlays(sample, "exploratoria", allowedNumbers, 120, quickNumbers, 30)
  });
}

export function buildKinoSnapshot(draws: KinoDraw[], targetDate: string, now = new Date()): KinoSnapshot {
  return buildKinoSnapshotForAlgorithm(draws,targetDate,now);
}

export function buildKinoV94RetrospectiveSnapshot(draws:KinoDraw[],targetDate:string,now=new Date(`${targetDate}T13:00:00Z`)):KinoSnapshot {
  return buildKinoSnapshotForAlgorithm(draws,targetDate,now,"kino-v9.4");
}

export function buildKinoV10RetrospectiveSnapshot(draws:KinoDraw[],targetDate:string,now=new Date(`${targetDate}T13:00:00Z`)):KinoSnapshot {
  return buildKinoSnapshotForAlgorithm(draws,targetDate,now,"kino-v10");
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
export function buildKinoPostgame(snapshot:KinoSnapshot,draw:KinoDraw) {
  const evaluations=evaluateKinoSnapshot(snapshot,draw);
  const evaluatedPlays=evaluations.flatMap(evaluation=>evaluation.plays);
  const exposure=new Map<number,number>();
  snapshot.plays.forEach(play=>play.numbers.forEach(number=>exposure.set(number,(exposure.get(number)??0)+1)));
  const expectedNumbers=[...exposure].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,20).map(([number,count])=>({number,count,drawn:draw.numbers.includes(number)}));
  const rangeIndex=(number:number)=>Math.min(8,Math.floor((number-1)/10));
  const ranges=Array.from({length:9},(_,range)=>({
    range,from:range*10+1,to:range===8?84:range*10+10,
    expected:snapshot.rangeModel?.find(item=>item.range===range)?.recentAverage??0,
    actual:draw.numbers.filter(number=>rangeIndex(number)===range).length
  }));
  const coveredWinningNumbers=draw.numbers.filter(number=>snapshot.plays.some(play=>play.numbers.includes(number)));
  const persistent=new Set(snapshot.persistentTopNumbers??[]);
  const recovery=new Set(snapshot.recoveryNumbers??[]);
  const excluded=new Set(snapshot.excludedByDelay?.map(item=>item.number)??[]);
  const totalPrize=evaluations.reduce((sum,evaluation)=>sum+evaluation.total,0);
  const cost=evaluations.reduce((sum,evaluation)=>sum+evaluation.cost,0);
  return {
    targetDate:snapshot.targetDate,playCount:snapshot.plays.length,totalPrize,cost,net:totalPrize-cost,
    awardedPlays:evaluatedPlays.filter(play=>play.prize>0).length,
    maximumHits:Math.max(...evaluatedPlays.map(play=>play.hits)),
    hitDistribution:Array.from({length:11},(_,hits)=>({hits,count:evaluatedPlays.filter(play=>play.hits===hits).length})),
    ranges,coveredWinningNumbers,expectedNumbers,
    expectedHits:expectedNumbers.filter(item=>item.drawn).map(item=>item.number),
    excludedHits:draw.numbers.filter(number=>excluded.has(number)),
    persistentHits:draw.numbers.filter(number=>persistent.has(number)),
    recoveryHits:draw.numbers.filter(number=>recovery.has(number))
  };
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
