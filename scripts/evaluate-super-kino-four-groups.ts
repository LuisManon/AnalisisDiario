import fs from "node:fs";
import { kinoPrize, type KinoDraw } from "../lib/super-kino.ts";

type Ticket = number[];

const draws=JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")) as KinoDraw[];
const eraStart=process.argv[2]??"2026-09-25";
const eraEnd=process.argv[3]??"2026-10-31";
const era=draws.filter(draw=>draw.date>=eraStart&&draw.date<=eraEnd).sort((a,b)=>a.date.localeCompare(b.date));
const ticketCost=25;
const trials=500;

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

function shuffle<T>(values:readonly T[],random:()=>number) {
  const result=[...values];
  for(let index=result.length-1;index>0;index--) {
    const other=Math.floor(random()*(index+1));
    [result[index],result[other]]=[result[other]!,result[index]!];
  }
  return result;
}

function choose(values:readonly number[],size:number,random:()=>number) {
  return shuffle(values,random).slice(0,size).sort((a,b)=>a-b);
}

function key(ticket:Ticket) { return ticket.join(","); }
function pairKey(a:number,b:number) { return a*20+b; }
function tripleKey(a:number,b:number,c:number) { return (a*20+b)*20+c; }

// Build 25 ticket/complement pairs. Complements make every number appear exactly
// 25 times; the greedy score then flattens pair and triple repetition.
function buildCoverageTemplate() {
  const random=randomFor("kino-four-groups-balanced-v1");
  const universe=Array.from({length:20},(_,index)=>index);
  const tickets:Ticket[]=[];
  const seen=new Set<string>();
  const pairs=new Map<number,number>();
  const triples=new Map<number,number>();

  const add=(ticket:Ticket)=>{
    tickets.push(ticket);
    seen.add(key(ticket));
    for(let i=0;i<ticket.length;i++) for(let j=i+1;j<ticket.length;j++) {
      const pair=pairKey(ticket[i]!,ticket[j]!);
      pairs.set(pair,(pairs.get(pair)??0)+1);
      for(let k=j+1;k<ticket.length;k++) {
        const triple=tripleKey(ticket[i]!,ticket[j]!,ticket[k]!);
        triples.set(triple,(triples.get(triple)??0)+1);
      }
    }
  };

  for(let round=0;round<25;round++) {
    let best:Ticket|undefined;
    let bestComplement:Ticket|undefined;
    let bestScore=Number.POSITIVE_INFINITY;
    for(let attempt=0;attempt<2500;attempt++) {
      const candidate=choose(universe,10,random);
      const complement=universe.filter(number=>!candidate.includes(number));
      if(seen.has(key(candidate))||seen.has(key(complement))) continue;
      let score=0;
      for(const ticket of [candidate,complement]) {
        for(let i=0;i<ticket.length;i++) for(let j=i+1;j<ticket.length;j++) {
          const nextPair=(pairs.get(pairKey(ticket[i]!,ticket[j]!))??0)+1;
          score+=nextPair*nextPair*8;
          for(let k=j+1;k<ticket.length;k++) {
            const nextTriple=(triples.get(tripleKey(ticket[i]!,ticket[j]!,ticket[k]!))??0)+1;
            score+=nextTriple*nextTriple;
          }
        }
        for(const previous of tickets) {
          const overlap=ticket.filter(number=>previous.includes(number)).length;
          if(overlap>=8) score+=(overlap===10?100000:overlap===9?10000:1000);
        }
      }
      if(score<bestScore) {
        bestScore=score;
        best=candidate;
        bestComplement=complement;
      }
    }
    if(!best||!bestComplement) throw new Error("No se pudo completar el diseño equilibrado.");
    add(best);
    add(bestComplement);
  }
  return tickets;
}

const coverageTemplate=buildCoverageTemplate();

function buildGlobalTemplate(playCount:number,seed:string) {
  const random=randomFor(seed);
  const universe=Array.from({length:84},(_,index)=>index);
  const totalSlots=playCount*10;
  const base=Math.floor(totalSlots/84);
  const extra=totalSlots%84;
  const extraNumbers=new Set(shuffle(universe,random).slice(0,extra));
  const remaining=new Map(universe.map(number=>[number,base+Number(extraNumbers.has(number))]));
  const tickets:Ticket[]=[];
  const pairs=new Map<number,number>();
  const triples=new Map<number,number>();

  const weightedPick=(available:number[],count:number)=>{
    const picked:number[]=[];
    const pool=[...available];
    while(picked.length<count) {
      const total=pool.reduce((sum,number)=>sum+(remaining.get(number)??0),0);
      let point=random()*total;
      let index=0;
      for(;index<pool.length-1;index++) {
        point-=remaining.get(pool[index]!)??0;
        if(point<=0) break;
      }
      picked.push(pool[index]!);
      pool.splice(index,1);
    }
    return picked;
  };

  for(let round=0;round<playCount;round++) {
    const roundsLeft=playCount-round;
    const mandatory=universe.filter(number=>(remaining.get(number)??0)===roundsLeft);
    if(mandatory.length>10) throw new Error("Cuotas globales incompatibles.");
    let best:Ticket|undefined;
    let bestScore=Number.POSITIVE_INFINITY;
    const attempts=roundsLeft<=3?1:700;
    for(let attempt=0;attempt<attempts;attempt++) {
      const optional=universe.filter(number=>(remaining.get(number)??0)>0&&!mandatory.includes(number));
      const candidate=[...mandatory,...weightedPick(optional,10-mandatory.length)].sort((a,b)=>a-b);
      let score=0;
      for(let i=0;i<candidate.length;i++) for(let j=i+1;j<candidate.length;j++) {
        const nextPair=(pairs.get(pairKey(candidate[i]!,candidate[j]!))??0)+1;
        score+=nextPair*nextPair*7;
        for(let k=j+1;k<candidate.length;k++) {
          const nextTriple=(triples.get(tripleKey(candidate[i]!,candidate[j]!,candidate[k]!))??0)+1;
          score+=nextTriple*nextTriple*.35;
        }
      }
      for(const previous of tickets) {
        const overlap=candidate.filter(number=>previous.includes(number)).length;
        if(overlap>=6) score+=(overlap-5)**2*500;
      }
      if(score<bestScore) { bestScore=score; best=candidate; }
    }
    if(!best) throw new Error("No se pudo completar el diseño global.");
    tickets.push(best);
    for(const number of best) remaining.set(number,remaining.get(number)!-1);
    for(let i=0;i<best.length;i++) for(let j=i+1;j<best.length;j++) {
      const pair=pairKey(best[i]!,best[j]!);
      pairs.set(pair,(pairs.get(pair)??0)+1);
      for(let k=j+1;k<best.length;k++) {
        const triple=tripleKey(best[i]!,best[j]!,best[k]!);
        triples.set(triple,(triples.get(triple)??0)+1);
      }
    }
  }
  return tickets;
}

const global200Template=buildGlobalTemplate(200,"kino-global-200-v1");
const global150Template=buildGlobalTemplate(150,"kino-global-150-v1");

function groupsFor(date:string,trial:number) {
  const random=randomFor(`${date}:groups:${trial}`);
  const shuffled=shuffle(Array.from({length:84},(_,index)=>index+1),random);
  return Array.from({length:4},(_,index)=>shuffled.slice(index*20,index*20+20));
}

function balancedTickets(groups:number[][]) {
  return groups.flatMap(group=>coverageTemplate.map(template=>template.map(index=>group[index]!).sort((a,b)=>a-b)));
}

function mapGlobalTickets(template:Ticket[],permutation:number[]) {
  return template.map(ticket=>ticket.map(index=>permutation[index]!).sort((a,b)=>a-b));
}

function randomTickets(groups:number[][],date:string,trial:number) {
  return groups.flatMap((group,groupIndex)=>{
    const random=randomFor(`${date}:tickets:${trial}:${groupIndex}`);
    const tickets:Ticket[]=[];
    const seen=new Set<string>();
    while(tickets.length<50) {
      const ticket=choose(group,10,random);
      if(!seen.has(key(ticket))) { seen.add(key(ticket)); tickets.push(ticket); }
    }
    return tickets;
  });
}

function isolatedTenPatternTickets(date:string,trial:number) {
  const random=randomFor(`${date}:isolated-ten-pattern:${trial}`);
  const counts=[1,1,0,1,4,0,1,1,1];
  const ranges=Array.from({length:9},(_,range)=>Array.from({length:range===8?4:10},(_,offset)=>range*10+offset+1));
  const tickets:Ticket[]=[];
  const seen=new Set<string>();
  while(tickets.length<200) {
    const ticket=counts.flatMap((count,range)=>choose(ranges[range]!,count,random)).sort((a,b)=>a-b);
    const keyValue=key(ticket);
    if(ticket.filter(number=>number%2===0).length===3&&!seen.has(keyValue)) { seen.add(keyValue); tickets.push(ticket); }
  }
  return tickets;
}

function evaluate(tickets:Ticket[],draw:KinoDraw) {
  const winning=new Set(draw.numbers);
  const hits=tickets.map(ticket=>ticket.filter(number=>winning.has(number)).length);
  return {prize:hits.reduce((sum,hit)=>sum+kinoPrize(hit),0),maximum:Math.max(...hits),tenTickets:tickets.flatMap((ticket,index)=>hits[index]===10?[{id:index+1,numbers:ticket}]:[])};
}

const tenHitEvents:{trial:number;date:string;kind:string;winningNumbers:number[];tickets:{id:number;numbers:number[]}[]}[]=[];
function runTrial(trial:number) {
  const totals={fourGroups:{prize:0,sevenDays:0,eightDays:0,nineDays:0,tenDays:0,maximum:0},global:{prize:0,sevenDays:0,eightDays:0,nineDays:0,tenDays:0,maximum:0},hybrid:{prize:0,sevenDays:0,eightDays:0,nineDays:0,tenDays:0,maximum:0},isolatedPattern:{prize:0,sevenDays:0,eightDays:0,nineDays:0,tenDays:0,maximum:0}};
  for(const draw of era) {
    const groups=groupsFor(draw.date,trial);
    const permutation=[...groups.flat(),...Array.from({length:84},(_,index)=>index+1).filter(number=>!groups.flat().includes(number))];
    const portfolios={
      fourGroups:balancedTickets(groups),
      global:mapGlobalTickets(global200Template,permutation),
      hybrid:[...mapGlobalTickets(global150Template,permutation),...coverageTemplate.map(ticket=>ticket.map(index=>groups[0]![index]!).sort((a,b)=>a-b))],
      isolatedPattern:isolatedTenPatternTickets(draw.date,trial)
    };
    for(const kind of Object.keys(portfolios) as Array<keyof typeof portfolios>) {
      const result=evaluate(portfolios[kind],draw);
      totals[kind].prize+=result.prize;
      totals[kind].sevenDays+=Number(result.maximum>=7);
      totals[kind].eightDays+=Number(result.maximum>=8);
      totals[kind].nineDays+=Number(result.maximum>=9);
      totals[kind].tenDays+=Number(result.maximum>=10);
      totals[kind].maximum=Math.max(totals[kind].maximum,result.maximum);
      if(result.tenTickets.length) tenHitEvents.push({trial,date:draw.date,kind,winningNumbers:draw.numbers,tickets:result.tenTickets});
    }
  }
  const cost=era.length*200*ticketCost;
  return Object.fromEntries(Object.entries(totals).map(([kind,total])=>[kind,{...total,roi:total.prize/cost*100}])) as Record<keyof typeof totals,(typeof totals)[keyof typeof totals]&{roi:number}>;
}

function percentile(values:number[],fraction:number) {
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor((sorted.length-1)*fraction)]!;
}

function summarize(results:ReturnType<typeof runTrial>[],kind:"fourGroups"|"global"|"hybrid"|"isolatedPattern") {
  const roi=results.map(result=>result[kind].roi);
  const eight=results.map(result=>result[kind].eightDays);
  const nine=results.map(result=>result[kind].nineDays);
  const ten=results.map(result=>result[kind].tenDays);
  return {
    meanRoi:Number((roi.reduce((sum,value)=>sum+value,0)/roi.length).toFixed(2)),
    medianRoi:Number(percentile(roi,.5).toFixed(2)),
    p10Roi:Number(percentile(roi,.1).toFixed(2)),
    p90Roi:Number(percentile(roi,.9).toFixed(2)),
    trialsWithEightPlus:eight.filter(value=>value>0).length,
    probabilityEightPlus:Number((eight.filter(value=>value>0).length/results.length*100).toFixed(1)),
    averageSevenPlusDays:Number((results.reduce((sum,result)=>sum+result[kind].sevenDays,0)/results.length).toFixed(3)),
    averageEightPlusDays:Number((eight.reduce((sum,value)=>sum+value,0)/eight.length).toFixed(3)),
    trialsWithNinePlus:nine.filter(value=>value>0).length,
    probabilityNinePlus:Number((nine.filter(value=>value>0).length/results.length*100).toFixed(1)),
    averageNinePlusDays:Number((nine.reduce((sum,value)=>sum+value,0)/nine.length).toFixed(3)),
    trialsWithTen:ten.filter(value=>value>0).length,
    maximumRoi:Number(Math.max(...roi).toFixed(2))
  };
}

const templateNumberExposure=Array.from({length:20},(_,number)=>coverageTemplate.filter(ticket=>ticket.includes(number)).length);
const templatePairExposure=Array.from({length:20},(_,a)=>Array.from({length:20-a-1},(_,offset)=>{
  const b=a+offset+1;
  return coverageTemplate.filter(ticket=>ticket.includes(a)&&ticket.includes(b)).length;
})).flat();
const templateTripleExposure=Array.from({length:20},(_,a)=>Array.from({length:20-a-1},(_,offset)=>a+offset+1).flatMap(b=>Array.from({length:20-b-1},(_,offset)=>{
  const c=b+offset+1;
  return coverageTemplate.filter(ticket=>ticket.includes(a)&&ticket.includes(b)&&ticket.includes(c)).length;
}))).flat();

const results=Array.from({length:trials},(_,trial)=>runTrial(trial));
const primary=results[0]!;
const nextDate="2026-11-01";
const nextGroups=groupsFor(nextDate,0);
const nextTickets=balancedTickets(nextGroups);

console.log(JSON.stringify({
  protocol:{draws:era.length,start:era[0]?.date,end:era.at(-1)?.date,trials,playsPerDay:200,costPerDay:200*ticketCost},
  design:{groups:4,numbersPerGroup:20,playsPerGroup:50,excludedPerDay:4,numberExposure:[Math.min(...templateNumberExposure),Math.max(...templateNumberExposure)],pairExposure:[Math.min(...templatePairExposure),Math.max(...templatePairExposure)],tripleExposure:[Math.min(...templateTripleExposure),Math.max(...templateTripleExposure)]},
  primary,
  simulation:{
    fourGroups:summarize(results,"fourGroups"),
    global:summarize(results,"global"),
    hybrid:summarize(results,"hybrid")
    ,isolatedPattern:summarize(results,"isolatedPattern")
  },
  tenHitEvents,
  generatedPortfolio:{targetDate:nextDate,groups:nextGroups.map(group=>[...group].sort((a,b)=>a-b)),excluded:Array.from({length:84},(_,index)=>index+1).filter(number=>!nextGroups.flat().includes(number)),tickets:nextTickets.map((numbers,index)=>({id:index+1,group:Math.floor(index/50)+1,numbers}))}
},null,2));
