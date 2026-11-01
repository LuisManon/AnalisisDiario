import fs from "node:fs";
import { kinoPrize, type KinoDraw } from "../lib/super-kino.ts";

type Ticket=number[];
type Mode="random"|"global"|"v13"|"v131"|"v132"|"v133"|"v133_180"|"v133_170"|"v133_160";
const draws=JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")) as KinoDraw[];
const historical=draws.filter(draw=>draw.date>="2026-09-15").sort((a,b)=>a.date.localeCompare(b.date));
const simulationSeeds=Number(process.argv[2]??10);
const simulationsPerSeed=Number(process.argv[3]??10000);
const targetNumbers=process.argv[4]?.split(",").map(Number);
const comparison=process.argv[5]??"all";
const playCount=200;

function randomFor(seed:string) {
  let state=2166136261;
  for(const character of seed) state=Math.imul(state^character.charCodeAt(0),16777619);
  return ()=>{state+=0x6d2b79f5;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296;};
}
function shuffle<T>(values:readonly T[],random:()=>number) {
  const result=[...values];
  for(let index=result.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[result[index],result[other]]=[result[other]!,result[index]!];}
  return result;
}
const universe=Array.from({length:84},(_,index)=>index+1);
const pairKey=(a:number,b:number)=>a<b?`${a}-${b}`:`${b}-${a}`;
const tripleKey=(a:number,b:number,c:number)=>`${a},${b},${c}`;
const quadKey=(a:number,b:number,c:number,d:number)=>`${a},${b},${c},${d}`;
const overlap=(left:readonly number[],right:readonly number[])=>left.filter(number=>right.includes(number)).length;

function balancedQuotas(random:()=>number) {
  const quotas=Array(84).fill(Math.floor(playCount*10/84)) as number[];
  shuffle(Array.from({length:84},(_,index)=>index),random).slice(0,playCount*10-quotas.reduce((sum,value)=>sum+value,0)).forEach(index=>quotas[index]++);
  return quotas;
}

function randomPortfolio(seed:string) {
  const random=randomFor(seed);const seen=new Set<string>();const tickets:Ticket[]=[];
  while(tickets.length<playCount){const ticket=shuffle(universe,random).slice(0,10).sort((a,b)=>a-b),key=ticket.join(",");if(!seen.has(key)){seen.add(key);tickets.push(ticket);}}
  return tickets;
}

function parityTargets() {
  const choose=(n:number,k:number)=>{if(k<0||k>n)return 0;let value=1;for(let index=1;index<=k;index++)value=value*(n-k+index)/index;return value;};
  const desired=Array.from({length:11},(_,even)=>playCount*choose(42,even)*choose(42,10-even)/choose(84,10));
  const targets=desired.map(Math.floor);let missing=playCount-targets.reduce((sum,value)=>sum+value,0);
  desired.map((value,index)=>({index,remainder:value-Math.floor(value)})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index).slice(0,missing).forEach(item=>targets[item.index]++);
  return targets;
}

function structuredAttempt(mode:"global"|"v13"|"v131",seed:string) {
  const random=randomFor(seed),quotas=balancedQuotas(random),remaining=[0,...quotas];
  const tickets:Ticket[]=[],seen=new Set<string>(),pairs=new Map<string,number>(),triples=new Map<string,number>(),quads=new Map<string,number>();
  const parityUsage=Array(11).fill(0) as number[],parityGoal=parityTargets(),rangeShapes=new Map<string,number>();
  const weightedPick=(available:number[],count:number)=>{const pool=[...available],picked:number[]=[];while(picked.length<count){const total=pool.reduce((sum,number)=>sum+remaining[number]!,0);let point=random()*total,position=0;for(;position<pool.length-1;position++){point-=remaining[pool[position]!]!;if(point<=0)break;}picked.push(pool[position]!);pool.splice(position,1);}return picked;};
  for(let round=0;round<playCount;round++) {
    const roundsLeft=playCount-round,mandatory=universe.filter(number=>remaining[number]===roundsLeft);
    if(mandatory.length>10) throw new Error("Cuotas incompatibles.");
    let best:Ticket|undefined,bestScore=Number.POSITIVE_INFINITY;
    const attempts=roundsLeft<=3?1:mode==="v131"?320:mode==="v13"?180:120;
    for(let attempt=0;attempt<attempts;attempt++) {
      const optional=universe.filter(number=>remaining[number]!>0&&!mandatory.includes(number));
      const candidate=[...mandatory,...weightedPick(optional,10-mandatory.length)].sort((a,b)=>a-b),key=candidate.join(",");
      if(seen.has(key))continue;
      const overlaps=tickets.map(previous=>overlap(candidate,previous));
      if(mode==="v131"&&overlaps.some(shared=>shared>=5))continue;
      let score=0;
      for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){
        const pairCurrent=pairs.get(pairKey(candidate[a]!,candidate[b]!))??0;
        score+=mode==="v131"?(pairCurrent===0?-90:pairCurrent===1?-25:pairCurrent===2?12:pairCurrent===3?180:1200):(pairCurrent+1)**2*8;
        if(mode!=="global")for(let c=b+1;c<10;c++){
          const tripleNext=(triples.get(tripleKey(candidate[a]!,candidate[b]!,candidate[c]!))??0)+1;score+=tripleNext*tripleNext*1.6;
          for(let d=c+1;d<10;d++){const quadCurrent=quads.get(quadKey(candidate[a]!,candidate[b]!,candidate[c]!,candidate[d]!))??0;score+=mode==="v131"?(quadCurrent?80*quadCurrent**2:0):(quadCurrent+1)**2*.35;}
        }
      }
      for(const shared of overlaps)if(shared>=5)score+=(shared-4)**2*(mode==="v13"?900:500);
      if(mode!=="global"){
        const evens=candidate.filter(number=>number%2===0).length;score+=Math.max(0,parityUsage[evens]!+1-parityGoal[evens]!)**2*(mode==="v131"?100:350);
        const shape=Array.from({length:9},(_,range)=>candidate.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length).join("");
        score+=(rangeShapes.get(shape)??0)**2*(mode==="v131"?10:35);
      }
      if(score<bestScore){bestScore=score;best=candidate;}
    }
    if(!best)throw new Error("No se pudo completar la cartera estructurada.");
    tickets.push(best);seen.add(best.join(","));best.forEach(number=>remaining[number]!--);
    parityUsage[best.filter(number=>number%2===0).length]++;
    const shape=Array.from({length:9},(_,range)=>best!.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length).join("");rangeShapes.set(shape,(rangeShapes.get(shape)??0)+1);
    for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){
      const pair=pairKey(best[a]!,best[b]!);pairs.set(pair,(pairs.get(pair)??0)+1);
      for(let c=b+1;c<10;c++){const triple=tripleKey(best[a]!,best[b]!,best[c]!);triples.set(triple,(triples.get(triple)??0)+1);for(let d=c+1;d<10;d++){const quad=quadKey(best[a]!,best[b]!,best[c]!,best[d]!);quads.set(quad,(quads.get(quad)??0)+1);}}
    }
  }
  return tickets;
}
function structuredPortfolio(mode:"global"|"v13"|"v131",seed:string){let error:unknown;for(let retry=0;retry<8;retry++){try{return structuredAttempt(mode,`${seed}-${retry}`);}catch(reason){error=reason;}}throw error;}

function optimizedV132Portfolio(seed:string) {
  const tickets=structuredPortfolio("v13",`${seed}-base`).map(ticket=>[...ticket]);
  const random=randomFor(`${seed}-optimizer`);
  const trainingDraws=Array.from({length:2000},()=>{const present=new Uint8Array(85);shuffle(universe,random).slice(0,20).forEach(number=>present[number]=1);return present;});
  const hits=trainingDraws.map(draw=>tickets.map(ticket=>ticket.reduce((sum,number)=>sum+draw[number]!,0)));
  const utility=[0,0,0,0,0,0,0,1,25,400,8000];
  const topThree=(row:readonly number[])=>row.map((value,index)=>({value,index})).sort((a,b)=>b.value-a.value).slice(0,3);
  const tops=hits.map(topThree);
  const portfolioScore=()=>tops.reduce((sum,top)=>sum+utility[top[0]!.value]!,0);
  let score=portfolioScore();
  const keySet=new Set(tickets.map(ticket=>ticket.join(",")));
  const pairCounts=new Map<string,number>(),tripleCounts=new Map<string,number>();
  const addCombinations=(ticket:Ticket,pairDelta:number,tripleDelta:number)=>{for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){const pair=pairKey(ticket[a]!,ticket[b]!);pairCounts.set(pair,(pairCounts.get(pair)??0)+pairDelta);for(let c=b+1;c<10;c++){const triple=tripleKey(ticket[a]!,ticket[b]!,ticket[c]!);tripleCounts.set(triple,(tripleCounts.get(triple)??0)+tripleDelta);}}};
  tickets.forEach(ticket=>addCombinations(ticket,1,1));
  let missingPairs=3486-[...pairCounts.values()].filter(Boolean).length,repeatedTriples=[...tripleCounts.values()].filter(value=>value>1).length;
  const overlapFiveCount=()=>{let count=0;for(let left=0;left<tickets.length;left++)for(let right=left+1;right<tickets.length;right++)count+=Number(overlap(tickets[left]!,tickets[right]!)>=5);return count;};
  let fivePlus=overlapFiveCount();
  for(let iteration=0;iteration<2400;iteration++){
    const leftIndex=Math.floor(random()*tickets.length);let rightIndex=Math.floor(random()*tickets.length);if(leftIndex===rightIndex)rightIndex=(rightIndex+1)%tickets.length;
    const left=tickets[leftIndex]!,right=tickets[rightIndex]!;
    const leftPosition=Math.floor(random()*10),rightPosition=Math.floor(random()*10),leftNumber=left[leftPosition]!,rightNumber=right[rightPosition]!;
    if(leftNumber===rightNumber||left.includes(rightNumber)||right.includes(leftNumber))continue;
    const nextLeft=left.map((number,index)=>index===leftPosition?rightNumber:number).sort((a,b)=>a-b);
    const nextRight=right.map((number,index)=>index===rightPosition?leftNumber:number).sort((a,b)=>a-b);
    const leftKey=nextLeft.join(","),rightKey=nextRight.join(",");
    if(keySet.has(leftKey)||keySet.has(rightKey))continue;
    const pairDeltas=new Map<string,number>(),tripleDeltas=new Map<string,number>();
    const collectDeltas=(ticket:Ticket,direction:number)=>{for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){const pair=pairKey(ticket[a]!,ticket[b]!);pairDeltas.set(pair,(pairDeltas.get(pair)??0)+direction);for(let c=b+1;c<10;c++){const triple=tripleKey(ticket[a]!,ticket[b]!,ticket[c]!);tripleDeltas.set(triple,(tripleDeltas.get(triple)??0)+direction);}}};
    collectDeltas(left,-1);collectDeltas(right,-1);collectDeltas(nextLeft,1);collectDeltas(nextRight,1);
    let nextMissingPairs=missingPairs,nextRepeatedTriples=repeatedTriples,combinationsValid=true;
    for(const [key,delta] of pairDeltas){const before=pairCounts.get(key)??0,after=before+delta;if(after<0||after>6){combinationsValid=false;break;}if(before===0&&after>0)nextMissingPairs--;if(before>0&&after===0)nextMissingPairs++;}
    if(!combinationsValid||nextMissingPairs>missingPairs)continue;
    for(const [key,delta] of tripleDeltas){const before=tripleCounts.get(key)??0,after=before+delta;if(after<0||after>4){combinationsValid=false;break;}if(before<=1&&after>1)nextRepeatedTriples++;if(before>1&&after<=1)nextRepeatedTriples--;}
    if(!combinationsValid||nextRepeatedTriples>repeatedTriples)continue;
    let nextFivePlus=fivePlus,valid=true;
    for(let index=0;index<tickets.length;index++)if(index!==leftIndex&&index!==rightIndex){
      const previous=tickets[index]!;
      nextFivePlus-=Number(overlap(left,previous)>=5)+Number(overlap(right,previous)>=5);
      const nextLeftOverlap=overlap(nextLeft,previous),nextRightOverlap=overlap(nextRight,previous);
      if(nextLeftOverlap>=6||nextRightOverlap>=6){valid=false;break;}
      nextFivePlus+=Number(nextLeftOverlap>=5)+Number(nextRightOverlap>=5);
    }
    if(!valid||nextFivePlus>4)continue;
    let delta=0;const nextHitsLeft:number[]=[],nextHitsRight:number[]=[];
    for(let drawIndex=0;drawIndex<trainingDraws.length;drawIndex++){
      const draw=trainingDraws[drawIndex]!,oldTop=tops[drawIndex]!,base=oldTop.find(item=>item.index!==leftIndex&&item.index!==rightIndex)?.value??0;
      const leftHit=nextLeft.reduce((sum,number)=>sum+draw[number]!,0),rightHit=nextRight.reduce((sum,number)=>sum+draw[number]!,0);
      nextHitsLeft.push(leftHit);nextHitsRight.push(rightHit);
      delta+=utility[Math.max(base,leftHit,rightHit)]!-utility[oldTop[0]!.value]!;
    }
    if(delta<=0)continue;
    keySet.delete(left.join(","));keySet.delete(right.join(","));keySet.add(leftKey);keySet.add(rightKey);
    tickets[leftIndex]=nextLeft;tickets[rightIndex]=nextRight;fivePlus=nextFivePlus;missingPairs=nextMissingPairs;repeatedTriples=nextRepeatedTriples;score+=delta;
    for(const [key,change] of pairDeltas)pairCounts.set(key,(pairCounts.get(key)??0)+change);
    for(const [key,change] of tripleDeltas)tripleCounts.set(key,(tripleCounts.get(key)??0)+change);
    for(let drawIndex=0;drawIndex<trainingDraws.length;drawIndex++){
      hits[drawIndex]![leftIndex]=nextHitsLeft[drawIndex]!;hits[drawIndex]![rightIndex]=nextHitsRight[drawIndex]!;tops[drawIndex]=topThree(hits[drawIndex]!);
    }
  }
  return tickets;
}

const hybridBaseCache=new Map<string,Ticket[]>();
function hybridV133Portfolio(seed:string,directedCount=50) {
  const sharedSeed=seed.replace(/^v133_(?:180|170|160)-/,"v133_shared-");
  let base=hybridBaseCache.get(sharedSeed);if(!base){base=optimizedV132Portfolio(`${sharedSeed}-diversified`);hybridBaseCache.set(sharedSeed,base);}
  const tickets=base.map(ticket=>[...ticket]);
  const random=randomFor(`${seed}-families-${directedCount}`),familySize=5,familyCount=directedCount/familySize,clusterStart=playCount-directedCount;
  const remaining=new Set(Array.from({length:familySize*familyCount},(_,index)=>clusterStart+index)),families:number[][]=[];
  while(families.length<familyCount){
    const seedIndex=[...remaining][Math.floor(random()*remaining.size)]!;remaining.delete(seedIndex);const family=[seedIndex];
    while(family.length<familySize){const next=[...remaining].map(index=>({index,similarity:Math.max(...family.map(member=>overlap(tickets[index]!,tickets[member]!)))})).sort((a,b)=>b.similarity-a.similarity||random()-.5)[0]!.index;remaining.delete(next);family.push(next);}
    families.push(family);
  }
  const membership=new Map(families.flatMap((family,familyIndex)=>family.map(index=>[index,familyIndex] as const)));
  const keySet=new Set(tickets.map(ticket=>ticket.join(",")));
  const familyScore=(familyIndex:number,replacements?:Map<number,Ticket>)=>{const family=families[familyIndex]!;let score=0;for(let left=0;left<family.length;left++)for(let right=left+1;right<family.length;right++){const shared=overlap(replacements?.get(family[left]!)??tickets[family[left]!]!,replacements?.get(family[right]!)??tickets[family[right]!]!);score+=shared>=7?-5000:shared===6?900:shared===5?260:shared===4?55:shared*shared;}return score;};
  for(let iteration=0;iteration<6000;iteration++){
    const leftIndex=clusterStart+Math.floor(random()*(playCount-clusterStart));let rightIndex=clusterStart+Math.floor(random()*(playCount-clusterStart));if(leftIndex===rightIndex)rightIndex=clusterStart+(rightIndex-clusterStart+1)%(playCount-clusterStart);
    const left=tickets[leftIndex]!,right=tickets[rightIndex]!,leftPosition=Math.floor(random()*10),rightPosition=Math.floor(random()*10),leftNumber=left[leftPosition]!,rightNumber=right[rightPosition]!;
    if(leftNumber===rightNumber||left.includes(rightNumber)||right.includes(leftNumber))continue;
    const nextLeft=left.map((number,index)=>index===leftPosition?rightNumber:number).sort((a,b)=>a-b),nextRight=right.map((number,index)=>index===rightPosition?leftNumber:number).sort((a,b)=>a-b);
    const leftKey=nextLeft.join(","),rightKey=nextRight.join(",");if(keySet.has(leftKey)||keySet.has(rightKey))continue;
    let valid=true;for(let index=0;index<clusterStart;index++)if(overlap(nextLeft,tickets[index]!)>=6||overlap(nextRight,tickets[index]!)>=6){valid=false;break;}if(!valid)continue;
    const affected=[...new Set([membership.get(leftIndex)!,membership.get(rightIndex)!])];
    const before=affected.reduce((sum,family)=>sum+familyScore(family),0),replacements=new Map<number,Ticket>([[leftIndex,nextLeft],[rightIndex,nextRight]]),after=affected.reduce((sum,family)=>sum+familyScore(family,replacements),0);
    if(after<=before)continue;
    keySet.delete(left.join(","));keySet.delete(right.join(","));keySet.add(leftKey);keySet.add(rightKey);tickets[leftIndex]=nextLeft;tickets[rightIndex]=nextRight;
  }
  return tickets;
}

function portfolioFor(mode:Mode,seed:string){if(mode==="random")return randomPortfolio(seed);if(mode==="v132")return optimizedV132Portfolio(seed);if(mode==="v133")return hybridV133Portfolio(seed);if(mode==="v133_180")return hybridV133Portfolio(seed,20);if(mode==="v133_170")return hybridV133Portfolio(seed,30);if(mode==="v133_160")return hybridV133Portfolio(seed,40);return structuredPortfolio(mode,seed);}

function evaluate(tickets:readonly Ticket[],winningNumbers:readonly number[]){const winning=new Set(winningNumbers),hits=tickets.map(ticket=>ticket.filter(number=>winning.has(number)).length);return{prize:hits.reduce((sum,value)=>sum+kinoPrize(value),0),maximum:Math.max(...hits),sevenPlus:hits.filter(value=>value>=7).length,eightPlus:hits.filter(value=>value>=8).length,ninePlus:hits.filter(value=>value>=9).length,ten:hits.filter(value=>value===10).length};}
function quality(tickets:readonly Ticket[]){const exposure=universe.map(number=>tickets.filter(ticket=>ticket.includes(number)).length),pairCounts=new Map<string,number>(),tripleCounts=new Map<string,number>(),quadCounts=new Map<string,number>();let maximumOverlap=0,overlapFivePlus=0;for(const ticket of tickets){for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){const pair=pairKey(ticket[a]!,ticket[b]!);pairCounts.set(pair,(pairCounts.get(pair)??0)+1);for(let c=b+1;c<10;c++){const triple=tripleKey(ticket[a]!,ticket[b]!,ticket[c]!);tripleCounts.set(triple,(tripleCounts.get(triple)??0)+1);for(let d=c+1;d<10;d++){const quad=quadKey(ticket[a]!,ticket[b]!,ticket[c]!,ticket[d]!);quadCounts.set(quad,(quadCounts.get(quad)??0)+1);}}}}for(let a=0;a<tickets.length;a++)for(let b=a+1;b<tickets.length;b++){const shared=overlap(tickets[a]!,tickets[b]!);maximumOverlap=Math.max(maximumOverlap,shared);overlapFivePlus+=Number(shared>=5);}return{exposure:[Math.min(...exposure),Math.max(...exposure)],pairExposure:[pairCounts.size===3486?Math.min(...pairCounts.values()):0,Math.max(...pairCounts.values())],uniquePairs:pairCounts.size,missingPairs:3486-pairCounts.size,uniqueTriples:tripleCounts.size,repeatedTriples:[...tripleCounts.values()].filter(value=>value>1).length,uniqueQuads:quadCounts.size,repeatedQuads:[...quadCounts.values()].filter(value=>value>1).length,maximumOverlap,overlapFivePlus};}

const modes:Mode[]=comparison==="final"?["v13","v133_160"]:comparison==="hybrid"?["v13","v133_180","v133_170","v133_160"]:["random","global","v13","v131","v132","v133"];
const historicalPortfolioCount=7;
const historicalPortfolios=Object.fromEntries(modes.map(mode=>[mode,Array.from({length:historicalPortfolioCount},(_,index)=>portfolioFor(mode,`${mode}-historical-rotation-${index}`))])) as Record<Mode,Ticket[][]>;
const historicalRows=historical.map((draw,index)=>Object.fromEntries(modes.map(mode=>[mode,evaluate(historicalPortfolios[mode][index%historicalPortfolioCount]!,draw.numbers)])) as Record<Mode,ReturnType<typeof evaluate>>);
const synthetic=Object.fromEntries(modes.map(mode=>[mode,[] as ReturnType<typeof evaluate>[]])) as Record<Mode,ReturnType<typeof evaluate>[]>;
const syntheticBySeed=Object.fromEntries(modes.map(mode=>[mode,[] as ReturnType<typeof evaluate>[][]])) as Record<Mode,ReturnType<typeof evaluate>[][]>;
const qualityByMode=Object.fromEntries(modes.map(mode=>[mode,[] as ReturnType<typeof quality>[]])) as Record<Mode,ReturnType<typeof quality>[]>;
for(let seedIndex=0;seedIndex<simulationSeeds;seedIndex++){
  const portfolios=Object.fromEntries(modes.map(mode=>{const seed=`${mode}-simulation-${seedIndex}`;const portfolio=portfolioFor(mode,seed);qualityByMode[mode].push(quality(portfolio));return[mode,portfolio];})) as Record<Mode,Ticket[]>;
  const random=randomFor(`draws-${seedIndex}`);
  const seedRows=Object.fromEntries(modes.map(mode=>[mode,[] as ReturnType<typeof evaluate>[]])) as Record<Mode,ReturnType<typeof evaluate>[]>;
  for(let trial=0;trial<simulationsPerSeed;trial++){const winning=shuffle(universe,random).slice(0,20);for(const mode of modes){const result=evaluate(portfolios[mode],winning);synthetic[mode].push(result);seedRows[mode].push(result);}}
  for(const mode of modes)syntheticBySeed[mode].push(seedRows[mode]);
}
function summarize(rows:ReturnType<typeof evaluate>[]){const prizes=rows.map(row=>row.prize).sort((a,b)=>a-b),cost=rows.length*playCount*25,prize=prizes.reduce((sum,value)=>sum+value,0);return{draws:rows.length,prize,cost,roi:Number((prize/cost*100).toFixed(2)),medianPrize:prizes[Math.floor(prizes.length/2)],p10Prize:prizes[Math.floor(prizes.length*.1)],p90Prize:prizes[Math.floor(prizes.length*.9)],maximum:Math.max(...rows.map(row=>row.maximum)),probabilitySevenPlus:Number((rows.filter(row=>row.maximum>=7).length/rows.length*100).toFixed(3)),probabilityEightPlus:Number((rows.filter(row=>row.maximum>=8).length/rows.length*100).toFixed(3)),probabilityNinePlus:Number((rows.filter(row=>row.maximum>=9).length/rows.length*100).toFixed(4)),probabilityTen:Number((rows.filter(row=>row.maximum>=10).length/rows.length*100).toFixed(6)),playsSevenPlus:rows.reduce((sum,row)=>sum+row.sevenPlus,0),playsEightPlus:rows.reduce((sum,row)=>sum+row.eightPlus,0)};}
console.log(JSON.stringify({
  protocol:{historicalStart:historical[0]?.date,historicalEnd:historical.at(-1)?.date,historicalDraws:historical.length,historicalPortfolioCount,simulationSeeds,simulationsPerSeed,syntheticDraws:simulationSeeds*simulationsPerSeed,historyUsedForConstruction:false},
  historical:Object.fromEntries(modes.map(mode=>[mode,summarize(historicalRows.map(row=>row[mode]))])),
  ...(targetNumbers?.length===20?{target:{numbers:targetNumbers,rotationIndex:historical.length%historicalPortfolioCount,results:Object.fromEntries(modes.map(mode=>[mode,evaluate(historicalPortfolios[mode][historical.length%historicalPortfolioCount]!,targetNumbers)]))}}:{}),
  synthetic:Object.fromEntries(modes.map(mode=>[mode,summarize(synthetic[mode])])),
  syntheticBySeed:Object.fromEntries(modes.map(mode=>[mode,syntheticBySeed[mode].map(summarize)])),
  quality:Object.fromEntries(modes.map(mode=>[mode,qualityByMode[mode]]))
},null,2));
