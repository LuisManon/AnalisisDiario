import fs from "node:fs";
import { buildKinoV10RetrospectiveSnapshot, kinoPrize, KINO_ANALYSIS_START, type KinoDraw, type KinoPlay } from "../lib/super-kino.ts";

type Ticket=number[];

const draws=JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")) as KinoDraw[];
const formatDraws=draws.filter(draw=>draw.date>=KINO_ANALYSIS_START).sort((a,b)=>a.date.localeCompare(b.date));
const evaluationDraws=formatDraws.filter(draw=>formatDraws.filter(previous=>previous.date<draw.date).length>=30);
const playCount=200;
const ticketCost=25;
const v10Weights=[.1,.2,.3,.4,.5] as const;
const constructionSeed=process.argv[2]??"0";

function randomFor(seed:string) {
  let state=2166136261;
  for(const character of seed) state=Math.imul(state^character.charCodeAt(0),16777619);
  return ()=>{
    state+=0x6d2b79f5;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

function integerQuotas(desired:number[]) {
  const quotas=desired.map(Math.floor);
  let missing=playCount*10-quotas.reduce((sum,value)=>sum+value,0);
  desired.map((value,index)=>({index,remainder:value-Math.floor(value)}))
    .sort((left,right)=>right.remainder-left.remainder||left.index-right.index)
    .slice(0,missing)
    .forEach(item=>quotas[item.index]++);
  return quotas;
}

function buildCoveragePortfolioAttempt(quotas:number[],seed:string) {
  if(quotas.length!==84||quotas.reduce((sum,value)=>sum+value,0)!==playCount*10) throw new Error("Cuotas de cobertura inválidas.");
  const random=randomFor(seed);
  const universe=Array.from({length:84},(_,index)=>index+1);
  const remaining=[0,...quotas];
  const pairUsage=new Map<string,number>();
  const tickets:Ticket[]=[];
  const seen=new Set<string>();
  const pairKey=(a:number,b:number)=>a<b?`${a}-${b}`:`${b}-${a}`;

  const select=(available:number[],count:number)=>{
    const pool=[...available];
    const result:number[]=[];
    while(result.length<count) {
      const total=pool.reduce((sum,number)=>sum+remaining[number]!,0);
      let point=random()*total;
      let index=0;
      for(;index<pool.length-1;index++) {
        point-=remaining[pool[index]!]!;
        if(point<=0) break;
      }
      result.push(pool[index]!);
      pool.splice(index,1);
    }
    return result;
  };

  for(let round=0;round<playCount;round++) {
    const roundsLeft=playCount-round;
    const mandatory=universe.filter(number=>remaining[number]===roundsLeft);
    if(mandatory.length>10) throw new Error(`No se pueden satisfacer las cuotas en la jugada ${round+1}.`);
    let best:Ticket|undefined;
    let bestScore=Number.POSITIVE_INFINITY;
    const attempts=roundsLeft<=3?1:140;
    for(let attempt=0;attempt<attempts;attempt++) {
      const optional=universe.filter(number=>remaining[number]!>0&&!mandatory.includes(number));
      const candidate=[...mandatory,...select(optional,10-mandatory.length)].sort((a,b)=>a-b);
      const candidateKey=candidate.join(",");
      if(seen.has(candidateKey)) continue;
      let score=0;
      for(let first=0;first<candidate.length;first++) for(let second=first+1;second<candidate.length;second++) {
        const next=(pairUsage.get(pairKey(candidate[first]!,candidate[second]!))??0)+1;
        score+=next*next*8;
      }
      for(const previous of tickets) {
        const overlap=candidate.filter(number=>previous.includes(number)).length;
        if(overlap>=6) score+=(overlap-5)**2*600;
      }
      if(score<bestScore) { bestScore=score; best=candidate; }
    }
    if(!best) throw new Error(`No se pudo generar la jugada ${round+1}.`);
    tickets.push(best);
    seen.add(best.join(","));
    best.forEach(number=>remaining[number]!--);
    for(let first=0;first<best.length;first++) for(let second=first+1;second<best.length;second++) {
      const key=pairKey(best[first]!,best[second]!);
      pairUsage.set(key,(pairUsage.get(key)??0)+1);
    }
  }
  return tickets;
}

function buildCoveragePortfolio(quotas:number[],seed:string) {
  let lastError:unknown;
  for(let retry=0;retry<8;retry++) {
    try { return buildCoveragePortfolioAttempt(quotas,`${seed}-retry-${retry}`); }
    catch(error) { lastError=error; }
  }
  throw lastError;
}

function exposure(tickets:Ticket[]) {
  return Array.from({length:84},(_,index)=>tickets.filter(ticket=>ticket.includes(index+1)).length);
}

function evaluate(tickets:Ticket[],draw:KinoDraw) {
  const winning=new Set(draw.numbers);
  const hits=tickets.map(ticket=>ticket.filter(number=>winning.has(number)).length);
  return {
    prize:hits.reduce((sum,count)=>sum+kinoPrize(count),0),
    maximum:Math.max(...hits),
    sevenPlus:hits.filter(count=>count>=7).length,
    eightPlus:hits.filter(count=>count>=8).length,
    ninePlus:hits.filter(count=>count>=9).length
  };
}

const uniformDesired=Array(84).fill(playCount*10/84) as number[];
const globalQuotas=integerQuotas(uniformDesired);
const globalTemplate=buildCoveragePortfolio(globalQuotas,`kino-global-pure-v12-comparison-${constructionSeed}`);

const rows=evaluationDraws.map(draw=>{
  const v10=buildKinoV10RetrospectiveSnapshot(draws,draw.date).plays;
  const v10Exposure=exposure(v10.map(play=>play.numbers));
  const variants=Object.fromEntries(v10Weights.map(v10Weight=>{
    const uniformWeight=1-v10Weight;
    const desired=v10Exposure.map(value=>uniformWeight*(playCount*10/84)+v10Weight*value);
    const quotas=integerQuotas(desired);
    const tickets=buildCoveragePortfolio(quotas,`kino-v12-weighted-${v10Weight}-${draw.date}-${constructionSeed}`);
    return [`${Math.round(uniformWeight*100)}/${Math.round(v10Weight*100)}`,{result:evaluate(tickets,draw),exposure:[Math.min(...quotas),Math.max(...quotas)]}];
  }));
  const permutation=Array.from({length:84},(_,index)=>index+1).sort((left,right)=>randomFor(`kino-global-${draw.date}-${left}-${constructionSeed}`)()-randomFor(`kino-global-${draw.date}-${right}-${constructionSeed}`)());
  const global=globalTemplate.map(ticket=>ticket.map(number=>permutation[number-1]!).sort((a,b)=>a-b));
  return {
    date:draw.date,
    v10:evaluate(v10.map(play=>play.numbers),draw),
    global:evaluate(global,draw),
    variants,
    exposure:{v10:[Math.min(...v10Exposure),Math.max(...v10Exposure)],global:[Math.min(...exposure(global)),Math.max(...exposure(global))]}
  };
});

type Evaluation=ReturnType<typeof evaluate>;

function summarize(get:(row:typeof rows[number])=>Evaluation) {
  const cost=rows.length*playCount*ticketCost;
  const prize=rows.reduce((sum,row)=>sum+get(row).prize,0);
  return {
    draws:rows.length,cost,prize,net:prize-cost,roi:Number((prize/cost*100).toFixed(2)),
    medianDailyPrize:[...rows.map(row=>get(row).prize)].sort((a,b)=>a-b)[Math.floor(rows.length/2)],
    minimumDailyPrize:Math.min(...rows.map(row=>get(row).prize)),
    maximumDailyPrize:Math.max(...rows.map(row=>get(row).prize)),
    maximum:Math.max(...rows.map(row=>get(row).maximum)),
    daysSevenPlus:rows.filter(row=>get(row).maximum>=7).length,
    daysEightPlus:rows.filter(row=>get(row).maximum>=8).length,
    daysNinePlus:rows.filter(row=>get(row).maximum>=9).length,
    playsSevenPlus:rows.reduce((sum,row)=>sum+get(row).sevenPlus,0),
    playsEightPlus:rows.reduce((sum,row)=>sum+get(row).eightPlus,0),
    playsNinePlus:rows.reduce((sum,row)=>sum+get(row).ninePlus,0)
  };
}

const variantKeys=v10Weights.map(v10Weight=>`${Math.round((1-v10Weight)*100)}/${Math.round(v10Weight*100)}`);

console.log(JSON.stringify({
  protocol:{start:evaluationDraws[0]?.date,end:evaluationDraws.at(-1)?.date,draws:evaluationDraws.length,playsPerDraw:playCount,costPerDraw:playCount*ticketCost,constructionSeed,blendLabels:"cobertura uniforme / exposición V10"},
  summary:{
    v10:summarize(row=>row.v10),
    global:summarize(row=>row.global),
    variants:Object.fromEntries(variantKeys.map(key=>[key,summarize(row=>(row.variants[key] as {result:Evaluation}).result)]))
  },
  exposureByVariant:Object.fromEntries(variantKeys.map(key=>[key,{
    minimum:Math.min(...rows.map(row=>(row.variants[key] as {exposure:number[]}).exposure[0]!)),
    maximum:Math.max(...rows.map(row=>(row.variants[key] as {exposure:number[]}).exposure[1]!))
  }])),
  rows
},null,2));
