type Ticket = number[];

const universe=Array.from({length:84},(_,index)=>index+1);
const playCount=200;
const pairKey=(a:number,b:number)=>a<b?`${a}-${b}`:`${b}-${a}`;
const tripleKey=(a:number,b:number,c:number)=>`${a},${b},${c}`;
const quadKey=(a:number,b:number,c:number,d:number)=>`${a},${b},${c},${d}`;
const overlap=(left:readonly number[],right:readonly number[])=>left.filter(number=>right.includes(number)).length;

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

function balancedQuotas(random:()=>number) {
  const quotas=Array(84).fill(Math.floor(playCount*10/84)) as number[];
  shuffle(Array.from({length:84},(_,index)=>index),random).slice(0,playCount*10-quotas.reduce((sum,value)=>sum+value,0)).forEach(index=>quotas[index]++);
  return quotas;
}

function parityTargets() {
  const choose=(n:number,k:number)=>{if(k<0||k>n)return 0;let value=1;for(let index=1;index<=k;index++)value=value*(n-k+index)/index;return value;};
  const desired=Array.from({length:11},(_,even)=>playCount*choose(42,even)*choose(42,10-even)/choose(84,10));
  const targets=desired.map(Math.floor),missing=playCount-targets.reduce((sum,value)=>sum+value,0);
  desired.map((value,index)=>({index,remainder:value-Math.floor(value)})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index).slice(0,missing).forEach(item=>targets[item.index]++);
  return targets;
}

function buildDiversifiedAttempt(seed:string) {
  const random=randomFor(seed),quotas=balancedQuotas(random),remaining=[0,...quotas];
  const tickets:Ticket[]=[],seen=new Set<string>(),pairs=new Map<string,number>(),triples=new Map<string,number>(),quads=new Map<string,number>();
  const parityUsage=Array(11).fill(0) as number[],parityGoal=parityTargets(),rangeShapes=new Map<string,number>();
  const weightedPick=(available:number[],count:number)=>{const pool=[...available],picked:number[]=[];while(picked.length<count){const total=pool.reduce((sum,number)=>sum+remaining[number]!,0);let point=random()*total,position=0;for(;position<pool.length-1;position++){point-=remaining[pool[position]!]!;if(point<=0)break;}picked.push(pool[position]!);pool.splice(position,1);}return picked;};
  for(let round=0;round<playCount;round++) {
    const roundsLeft=playCount-round,mandatory=universe.filter(number=>remaining[number]===roundsLeft);
    if(mandatory.length>10) throw new Error("Las cuotas V13.3 no pueden completarse.");
    let best:Ticket|undefined,bestScore=Number.POSITIVE_INFINITY;
    for(let attempt=0;attempt<(roundsLeft<=3?1:180);attempt++) {
      const optional=universe.filter(number=>remaining[number]!>0&&!mandatory.includes(number));
      const candidate=[...mandatory,...weightedPick(optional,10-mandatory.length)].sort((a,b)=>a-b),key=candidate.join(",");
      if(seen.has(key))continue;
      let score=0;
      for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){
        const pairNext=(pairs.get(pairKey(candidate[a]!,candidate[b]!))??0)+1;score+=pairNext*pairNext*8;
        for(let c=b+1;c<10;c++){
          const tripleNext=(triples.get(tripleKey(candidate[a]!,candidate[b]!,candidate[c]!))??0)+1;score+=tripleNext*tripleNext*1.6;
          for(let d=c+1;d<10;d++){const quadNext=(quads.get(quadKey(candidate[a]!,candidate[b]!,candidate[c]!,candidate[d]!))??0)+1;score+=quadNext*quadNext*.35;}
        }
      }
      for(const previous of tickets){const shared=overlap(candidate,previous);if(shared>=5)score+=(shared-4)**2*900;}
      const evens=candidate.filter(number=>number%2===0).length;score+=Math.max(0,parityUsage[evens]!+1-parityGoal[evens]!)**2*350;
      const shape=Array.from({length:9},(_,range)=>candidate.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length).join("");score+=(rangeShapes.get(shape)??0)**2*35;
      if(score<bestScore){bestScore=score;best=candidate;}
    }
    if(!best)throw new Error(`V13.3 no pudo generar la jugada ${round+1}.`);
    tickets.push(best);seen.add(best.join(","));best.forEach(number=>remaining[number]!--);parityUsage[best.filter(number=>number%2===0).length]++;
    const shape=Array.from({length:9},(_,range)=>best!.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length).join("");rangeShapes.set(shape,(rangeShapes.get(shape)??0)+1);
    for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){const pair=pairKey(best[a]!,best[b]!);pairs.set(pair,(pairs.get(pair)??0)+1);for(let c=b+1;c<10;c++){const triple=tripleKey(best[a]!,best[b]!,best[c]!);triples.set(triple,(triples.get(triple)??0)+1);for(let d=c+1;d<10;d++){const quad=quadKey(best[a]!,best[b]!,best[c]!,best[d]!);quads.set(quad,(quads.get(quad)??0)+1);}}}
  }
  return tickets;
}

function buildDiversified(seed:string) {
  let error:unknown;
  for(let retry=0;retry<8;retry++){try{return buildDiversifiedAttempt(`${seed}-${retry}`);}catch(reason){error=reason;}}
  throw error;
}

function optimizeCoverage(tickets:Ticket[],seed:string) {
  const random=randomFor(`${seed}-optimizer`);
  const trainingDraws=Array.from({length:2000},()=>{const present=new Uint8Array(85);shuffle(universe,random).slice(0,20).forEach(number=>present[number]=1);return present;});
  const hits=trainingDraws.map(draw=>tickets.map(ticket=>ticket.reduce((sum,number)=>sum+draw[number]!,0))),utility=[0,0,0,0,0,0,0,1,25,400,8000];
  const topThree=(row:readonly number[])=>row.map((value,index)=>({value,index})).sort((a,b)=>b.value-a.value).slice(0,3);
  const tops=hits.map(topThree),keySet=new Set(tickets.map(ticket=>ticket.join(","))),pairCounts=new Map<string,number>(),tripleCounts=new Map<string,number>();
  const addCombinations=(ticket:Ticket,pairDelta:number,tripleDelta:number)=>{for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){const pair=pairKey(ticket[a]!,ticket[b]!);pairCounts.set(pair,(pairCounts.get(pair)??0)+pairDelta);for(let c=b+1;c<10;c++){const triple=tripleKey(ticket[a]!,ticket[b]!,ticket[c]!);tripleCounts.set(triple,(tripleCounts.get(triple)??0)+tripleDelta);}}};
  tickets.forEach(ticket=>addCombinations(ticket,1,1));
  let missingPairs=3486-[...pairCounts.values()].filter(Boolean).length,repeatedTriples=[...tripleCounts.values()].filter(value=>value>1).length;
  const overlapFiveCount=()=>{let count=0;for(let left=0;left<tickets.length;left++)for(let right=left+1;right<tickets.length;right++)count+=Number(overlap(tickets[left]!,tickets[right]!)>=5);return count;};
  let fivePlus=overlapFiveCount();
  for(let iteration=0;iteration<2400;iteration++){
    const leftIndex=Math.floor(random()*tickets.length);let rightIndex=Math.floor(random()*tickets.length);if(leftIndex===rightIndex)rightIndex=(rightIndex+1)%tickets.length;
    const left=tickets[leftIndex]!,right=tickets[rightIndex]!,leftPosition=Math.floor(random()*10),rightPosition=Math.floor(random()*10),leftNumber=left[leftPosition]!,rightNumber=right[rightPosition]!;
    if(leftNumber===rightNumber||left.includes(rightNumber)||right.includes(leftNumber))continue;
    const nextLeft=left.map((number,index)=>index===leftPosition?rightNumber:number).sort((a,b)=>a-b),nextRight=right.map((number,index)=>index===rightPosition?leftNumber:number).sort((a,b)=>a-b),leftKey=nextLeft.join(","),rightKey=nextRight.join(",");
    if(keySet.has(leftKey)||keySet.has(rightKey))continue;
    const pairDeltas=new Map<string,number>(),tripleDeltas=new Map<string,number>();
    const collectDeltas=(ticket:Ticket,direction:number)=>{for(let a=0;a<10;a++)for(let b=a+1;b<10;b++){const pair=pairKey(ticket[a]!,ticket[b]!);pairDeltas.set(pair,(pairDeltas.get(pair)??0)+direction);for(let c=b+1;c<10;c++){const triple=tripleKey(ticket[a]!,ticket[b]!,ticket[c]!);tripleDeltas.set(triple,(tripleDeltas.get(triple)??0)+direction);}}};
    collectDeltas(left,-1);collectDeltas(right,-1);collectDeltas(nextLeft,1);collectDeltas(nextRight,1);
    let nextMissingPairs=missingPairs,nextRepeatedTriples=repeatedTriples,valid=true;
    for(const [key,delta] of pairDeltas){const before=pairCounts.get(key)??0,after=before+delta;if(after<0||after>6){valid=false;break;}if(before===0&&after>0)nextMissingPairs--;if(before>0&&after===0)nextMissingPairs++;}
    if(!valid||nextMissingPairs>missingPairs)continue;
    for(const [key,delta] of tripleDeltas){const before=tripleCounts.get(key)??0,after=before+delta;if(after<0||after>4){valid=false;break;}if(before<=1&&after>1)nextRepeatedTriples++;if(before>1&&after<=1)nextRepeatedTriples--;}
    if(!valid||nextRepeatedTriples>repeatedTriples)continue;
    let nextFivePlus=fivePlus;
    for(let index=0;index<tickets.length;index++)if(index!==leftIndex&&index!==rightIndex){const previous=tickets[index]!;nextFivePlus-=Number(overlap(left,previous)>=5)+Number(overlap(right,previous)>=5);const leftOverlap=overlap(nextLeft,previous),rightOverlap=overlap(nextRight,previous);if(leftOverlap>=6||rightOverlap>=6){valid=false;break;}nextFivePlus+=Number(leftOverlap>=5)+Number(rightOverlap>=5);}
    if(!valid||nextFivePlus>4)continue;
    let delta=0;const nextHitsLeft:number[]=[],nextHitsRight:number[]=[];
    for(let drawIndex=0;drawIndex<trainingDraws.length;drawIndex++){const draw=trainingDraws[drawIndex]!,oldTop=tops[drawIndex]!,base=oldTop.find(item=>item.index!==leftIndex&&item.index!==rightIndex)?.value??0,leftHit=nextLeft.reduce((sum,number)=>sum+draw[number]!,0),rightHit=nextRight.reduce((sum,number)=>sum+draw[number]!,0);nextHitsLeft.push(leftHit);nextHitsRight.push(rightHit);delta+=utility[Math.max(base,leftHit,rightHit)]!-utility[oldTop[0]!.value]!;}
    if(delta<=0)continue;
    keySet.delete(left.join(","));keySet.delete(right.join(","));keySet.add(leftKey);keySet.add(rightKey);tickets[leftIndex]=nextLeft;tickets[rightIndex]=nextRight;fivePlus=nextFivePlus;missingPairs=nextMissingPairs;repeatedTriples=nextRepeatedTriples;
    for(const [key,change] of pairDeltas)pairCounts.set(key,(pairCounts.get(key)??0)+change);for(const [key,change] of tripleDeltas)tripleCounts.set(key,(tripleCounts.get(key)??0)+change);
    for(let drawIndex=0;drawIndex<trainingDraws.length;drawIndex++){hits[drawIndex]![leftIndex]=nextHitsLeft[drawIndex]!;hits[drawIndex]![rightIndex]=nextHitsRight[drawIndex]!;tops[drawIndex]=topThree(hits[drawIndex]!);}
  }
  return tickets;
}

function directFamilies(tickets:Ticket[],seed:string,directedCount=40) {
  const random=randomFor(`${seed}-families-${directedCount}`),familySize=5,familyCount=directedCount/familySize,clusterStart=playCount-directedCount;
  const remaining=new Set(Array.from({length:directedCount},(_,index)=>clusterStart+index)),families:number[][]=[];
  while(families.length<familyCount){const seedIndex=[...remaining][Math.floor(random()*remaining.size)]!;remaining.delete(seedIndex);const family=[seedIndex];while(family.length<familySize){const next=[...remaining].map(index=>({index,similarity:Math.max(...family.map(member=>overlap(tickets[index]!,tickets[member]!)))})).sort((a,b)=>b.similarity-a.similarity||random()-.5)[0]!.index;remaining.delete(next);family.push(next);}families.push(family);}
  const membership=new Map(families.flatMap((family,familyIndex)=>family.map(index=>[index,familyIndex] as const))),keySet=new Set(tickets.map(ticket=>ticket.join(",")));
  const familyScore=(familyIndex:number,replacements?:Map<number,Ticket>)=>{const family=families[familyIndex]!;let score=0;for(let left=0;left<family.length;left++)for(let right=left+1;right<family.length;right++){const shared=overlap(replacements?.get(family[left]!)??tickets[family[left]!]!,replacements?.get(family[right]!)??tickets[family[right]!]!);score+=shared>=7?-5000:shared===6?900:shared===5?260:shared===4?55:shared*shared;}return score;};
  for(let iteration=0;iteration<6000;iteration++){
    const leftIndex=clusterStart+Math.floor(random()*directedCount);let rightIndex=clusterStart+Math.floor(random()*directedCount);if(leftIndex===rightIndex)rightIndex=clusterStart+(rightIndex-clusterStart+1)%directedCount;
    const left=tickets[leftIndex]!,right=tickets[rightIndex]!,leftPosition=Math.floor(random()*10),rightPosition=Math.floor(random()*10),leftNumber=left[leftPosition]!,rightNumber=right[rightPosition]!;
    if(leftNumber===rightNumber||left.includes(rightNumber)||right.includes(leftNumber))continue;
    const nextLeft=left.map((number,index)=>index===leftPosition?rightNumber:number).sort((a,b)=>a-b),nextRight=right.map((number,index)=>index===rightPosition?leftNumber:number).sort((a,b)=>a-b),leftKey=nextLeft.join(","),rightKey=nextRight.join(",");
    if(keySet.has(leftKey)||keySet.has(rightKey))continue;
    let valid=true;for(let index=0;index<clusterStart;index++)if(overlap(nextLeft,tickets[index]!)>=6||overlap(nextRight,tickets[index]!)>=6){valid=false;break;}if(!valid)continue;
    const affected=[...new Set([membership.get(leftIndex)!,membership.get(rightIndex)!])],before=affected.reduce((sum,family)=>sum+familyScore(family),0),replacements=new Map<number,Ticket>([[leftIndex,nextLeft],[rightIndex,nextRight]]),after=affected.reduce((sum,family)=>sum+familyScore(family,replacements),0);
    if(after<=before)continue;
    keySet.delete(left.join(","));keySet.delete(right.join(","));keySet.add(leftKey);keySet.add(rightKey);tickets[leftIndex]=nextLeft;tickets[rightIndex]=nextRight;
  }
  return tickets;
}

export function buildKinoV133Numbers(targetDate:string) {
  const seed=`kino-v133-${targetDate}`;
  return directFamilies(optimizeCoverage(buildDiversified(`${seed}-base`),`${seed}-coverage`),seed,40);
}
