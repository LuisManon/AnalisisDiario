import fs from "node:fs";
import { buildKinoV10RetrospectiveSnapshot, kinoPrize, type KinoDraw, type KinoPlay } from "../lib/super-kino.ts";

const draws=JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")) as KinoDraw[];
const start=process.argv[2]??"2026-10-26";
const end=process.argv[3]??"2026-10-31";
const dates=draws.filter(draw=>draw.date>=start&&draw.date<=end).map(draw=>draw.date).sort();
const ticketCost=25;

function randomFor(seed:string) {
  let state=2166136261;
  for(const character of seed) state=Math.imul(state^character.charCodeAt(0),16777619);
  return ()=>{ state+=0x6d2b79f5; let value=state; value=Math.imul(value^(value>>>15),value|1); value^=value+Math.imul(value^(value>>>7),value|61); return ((value^(value>>>14))>>>0)/4294967296; };
}

function exposure(plays:readonly KinoPlay[]) {
  const values=Array(85).fill(0) as number[];
  plays.forEach(play=>play.numbers.forEach(number=>values[number]++));
  return values;
}

function overlap(left:readonly number[],right:readonly number[]) {
  return left.filter(number=>right.includes(number)).length;
}

function buildCandidate(v10:readonly KinoPlay[],date:string,version:"v102"|"v103"|"v104"|"v105"|"v1055") {
  const sourceExposure=exposure(v10);
  const desiredCore=sourceExposure.map(value=>Math.min(45,value*.7));
  const remaining=[...v10];
  const selected:KinoPlay[]=[];
  const coreExposure=Array(85).fill(0) as number[];
  const coreCount=version==="v103"?120:140;
  for(let index=0;index<coreCount;index++) {
    const best=remaining.map((play,position)=>({play,position,score:play.numbers.reduce((sum,number)=>{
      const target=Math.max(1,desiredCore[number]!);
      return sum+(coreExposure[number]!+1)/target;
    },0)+selected.slice(-30).reduce((sum,other)=>sum+Math.max(0,overlap(play.numbers,other.numbers)-6)**2*8,0)}))
      .sort((left,right)=>left.score-right.score||left.position-right.position)[0]!;
    selected.push({...best.play,id:selected.length+1});
    best.play.numbers.forEach(number=>coreExposure[number]++);
    remaining.splice(best.position,1);
  }

  const versionLabel=version==="v102"||version==="v105"||version==="v1055"?"v10.2":version==="v103"?"v10.3":"v10.4";
  const randomSources=Array.from({length:5},(_,index)=>randomFor(`kino-${versionLabel}-${date}-ensemble-${index}`));
  const seen=new Set(selected.map(play=>play.numbers.join(",")));
  const pairUsage=new Map<string,number>();
  const totalExposure=exposure(selected);
  const pairKey=(a:number,b:number)=>a<b?`${a}-${b}`:`${b}-${a}`;
  selected.forEach(play=>{ for(let a=0;a<10;a++) for(let b=a+1;b<10;b++) { const key=pairKey(play.numbers[a]!,play.numbers[b]!); pairUsage.set(key,(pairUsage.get(key)??0)+1); } });
  const ranked=Array.from({length:84},(_,index)=>index+1).sort((a,b)=>sourceExposure[b]!-sourceExposure[a]!||a-b);

  let scenarioIndex=0;
  const priorDraws=draws.filter(draw=>draw.date<date).sort((a,b)=>b.date.localeCompare(a.date));
  const previousNumbers=new Set(priorDraws[0]?.numbers??[]);
  const scaleRanges=(numbers:readonly number[])=>{
    const desired=Array.from({length:9},(_,range)=>numbers.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length/2);
    const quotas=desired.map(Math.floor);
    let missing=10-quotas.reduce((sum,value)=>sum+value,0);
    desired.map((value,index)=>({index,remainder:value-Math.floor(value)})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index).slice(0,missing).forEach(item=>quotas[item.index]++);
    return quotas;
  };
  const historicalPatterns=priorDraws.slice(0,12).map(draw=>({ranges:scaleRanges(draw.numbers),even:Math.max(2,Math.min(8,Math.round(draw.numbers.filter(number=>number%2===0).length/2)))}))
    .filter((pattern,index,patterns)=>patterns.findIndex(other=>other.even===pattern.even&&other.ranges.join(",")===pattern.ranges.join(","))===index).slice(0,6);
  const addTicket=(mode:"recombination"|"contrast"|"scenario"|"residual"|"historicalPattern")=>{
    let best:number[]|undefined;
    let bestScore=Number.POSITIVE_INFINITY;
    for(let attempt=0;attempt<500;attempt++) {
      const random=randomSources[attempt%randomSources.length]!;
      const candidate:number[]=[];
      const addFromPool=(source:readonly number[],count:number)=>{
        const pool=source.filter(number=>!candidate.includes(number));
        while(count>0&&pool.length) {
        const weights=pool.map(number=>mode==="recombination"||mode==="historicalPattern"
          ? Math.max(1,sourceExposure[number]!)**1.15/Math.max(1,totalExposure[number]!/35)
          : 1/Math.max(1,sourceExposure[number]!)**.8/Math.max(1,totalExposure[number]!/20));
        let point=random()*weights.reduce((sum,value)=>sum+value,0);
        let position=0;
        for(;position<pool.length-1;position++) { point-=weights[position]!; if(point<=0) break; }
        candidate.push(pool[position]!); pool.splice(position,1);
          count--;
        }
      };
      if(mode==="recombination") addFromPool(ranked.slice(0,32),10);
      else if(mode==="contrast") addFromPool(ranked.slice(20),10);
      else if(mode==="residual") addFromPool(ranked.slice(35),10);
      else if(mode==="historicalPattern") {
        const pattern=historicalPatterns[scenarioIndex%historicalPatterns.length]!;
        pattern.ranges.forEach((count,range)=>addFromPool(Array.from({length:range===8?4:10},(_,offset)=>range*10+offset+1),count));
        if(candidate.filter(number=>number%2===0).length!==pattern.even) continue;
      }
      else {
        const scenario=scenarioIndex%5;
        if(scenario===0) { addFromPool(ranked.slice(0,25),7); addFromPool(ranked.slice(25),3); }
        if(scenario===1) { addFromPool(ranked.slice(0,25),5); addFromPool(ranked.slice(25,55),3); addFromPool(ranked.slice(55),2); }
        if(scenario===2) { addFromPool(ranked.slice(0,25),4); addFromPool(ranked.slice(25,55),3); addFromPool(ranked.slice(55),3); }
        if(scenario===3) { addFromPool([...previousNumbers],4); addFromPool(ranked,6); }
        if(scenario===4) addFromPool(ranked.filter(number=>!previousNumbers.has(number)),10);
      }
      candidate.sort((a,b)=>a-b);
      if(candidate.length!==10||seen.has(candidate.join(","))) continue;
      let score=0;
      for(let a=0;a<10;a++) for(let b=a+1;b<10;b++) score+=(pairUsage.get(pairKey(candidate[a]!,candidate[b]!))??0)**2*5;
      score+=selected.reduce((sum,play)=>sum+Math.max(0,overlap(candidate,play.numbers)-6)**2*250,0);
      const exposureCap=mode==="recombination"?50:mode==="contrast"?35:40;
      score+=candidate.reduce((sum,number)=>sum+Math.max(0,totalExposure[number]!-exposureCap)**2*12,0);
      if(score<bestScore) { bestScore=score; best=candidate; }
    }
    if(!best) throw new Error(`No se pudo crear una jugada ${mode} de V10.2.`);
    const groups=[...best].sort((a,b)=>sourceExposure[b]!-sourceExposure[a]!||a-b);
    const play:KinoPlay={id:selected.length+1,profile:"exploratoria",numbers:best,hot:groups.slice(0,4).length,middle:3,cold:3};
    selected.push(play); seen.add(best.join(",")); best.forEach(number=>totalExposure[number]++);
    for(let a=0;a<10;a++) for(let b=a+1;b<10;b++) { const key=pairKey(best[a]!,best[b]!); pairUsage.set(key,(pairUsage.get(key)??0)+1); }
  };
  for(let index=0;index<40;index++) addTicket("recombination");
  if(version==="v102") for(let index=0;index<20;index++) addTicket("contrast");
  else if(version==="v103") {
    for(scenarioIndex=0;scenarioIndex<25;scenarioIndex++) addTicket("scenario");
    for(let index=0;index<15;index++) addTicket("residual");
  } else if(version==="v104") {
    for(scenarioIndex=0;scenarioIndex<20;scenarioIndex++) addTicket("historicalPattern");
  } else if(version==="v105") {
    for(let index=0;index<10;index++) addTicket("contrast");
    for(scenarioIndex=0;scenarioIndex<10;scenarioIndex++) addTicket("historicalPattern");
  } else {
    for(let index=0;index<15;index++) addTicket("contrast");
    for(scenarioIndex=0;scenarioIndex<5;scenarioIndex++) addTicket("historicalPattern");
  }
  return selected;
}

type V106Group={name:string;numbers:number[];plays:KinoPlay[]};
function buildV106(date:string):{plays:KinoPlay[];groups:V106Group[]} {
  const prior=draws.filter(draw=>draw.date<date).sort((a,b)=>b.date.localeCompare(a.date));
  const recent10=prior.slice(0,10);
  const recent30=prior.slice(0,30);
  const universe=Array.from({length:84},(_,index)=>index+1);
  const previous=new Set(prior[0]?.numbers??[]);
  const count=(sample:readonly KinoDraw[],number:number)=>sample.filter(draw=>draw.numbers.includes(number)).length;
  const gap=(number:number)=>{const index=prior.findIndex(draw=>draw.numbers.includes(number));return index<0?prior.length:index;};
  const pairAffinity=(number:number)=>recent30.reduce((sum,draw)=>sum+(draw.numbers.includes(number)?draw.numbers.filter(other=>other!==number&&previous.has(other)).length:0),0);
  const memberships=new Map<number,number>();
  const rank=(score:(number:number)=>number,limit=28)=>universe.map(number=>({number,score:score(number)-3*(memberships.get(number)??0)})).sort((a,b)=>b.score-a.score||a.number-b.number).slice(0,limit).map(item=>item.number);
  const register=(numbers:number[])=>{numbers.forEach(number=>memberships.set(number,(memberships.get(number)??0)+1));return [...numbers].sort((a,b)=>a-b);};
  const definitions:{name:string;numbers:number[];weight:(number:number)=>number}[]=[];

  const frequency=register(rank(number=>count(recent10,number)*5+count(recent30,number)));
  definitions.push({name:"frecuencia reciente",numbers:frequency,weight:number=>count(recent10,number)*5+count(recent30,number)+1});

  const continuityBase=[...previous];
  const continuityExtra=rank(number=>(previous.has(number)?-1_000:0)+count(recent10,number)*4+pairAffinity(number),8);
  const continuity=register([...new Set([...continuityBase,...continuityExtra])].slice(0,28));
  definitions.push({name:"continuidad",numbers:continuity,weight:number=>(previous.has(number)?12:1)+pairAffinity(number)+count(recent10,number)});

  const recovery=register(rank(number=>{const delay=gap(number);return (delay>=2&&delay<=9?35-Math.abs(delay-5)*3:0)+count(recent30,number)*2-count(recent10,number);}));
  definitions.push({name:"atraso recuperable",numbers:recovery,weight:number=>Math.max(1,12-Math.abs(gap(number)-5))+count(recent30,number)});

  const pairs=register(rank(number=>pairAffinity(number)*6+count(recent10,number)*2+count(recent30,number)));
  definitions.push({name:"parejas",numbers:pairs,weight:number=>pairAffinity(number)*3+count(recent10,number)+1});

  const rangeDesired=Array.from({length:9},(_,range)=>recent10.reduce((sum,draw)=>sum+draw.numbers.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).length,0)/Math.max(1,recent10.length)*1.4);
  const rangeQuotas=rangeDesired.map(Math.floor);
  let rangeMissing=28-rangeQuotas.reduce((sum,value)=>sum+value,0);
  rangeDesired.map((value,index)=>({index,remainder:value-Math.floor(value)})).sort((a,b)=>b.remainder-a.remainder||a.index-b.index).slice(0,rangeMissing).forEach(item=>rangeQuotas[item.index]++);
  const rangeNumbers=rangeQuotas.flatMap((quota,range)=>universe.filter(number=>Math.min(8,Math.floor((number-1)/10))===range).map(number=>({number,score:count(recent10,number)*3+count(recent30,number)-(memberships.get(number)??0)*2})).sort((a,b)=>b.score-a.score||a.number-b.number).slice(0,quota).map(item=>item.number));
  const ranges=register(rangeNumbers);
  definitions.push({name:"distribución por rangos",numbers:ranges,weight:number=>count(recent10,number)*3+count(recent30,number)+1});

  const globalPairUsage=new Map<string,number>();
  const globalExposure=Array(85).fill(0) as number[];
  const pairKey=(a:number,b:number)=>a<b?`${a}-${b}`:`${b}-${a}`;
  const groups:V106Group[]=[];
  const allPlays:KinoPlay[]=[];
  definitions.forEach((definition,groupIndex)=>{
    const randomSources=Array.from({length:5},(_,index)=>randomFor(`kino-v10.6-${date}-${groupIndex}-${index}`));
    const groupPlays:KinoPlay[]=[];
    const seen=new Set<string>();
    for(let playIndex=0;playIndex<40;playIndex++) {
      let best:number[]|undefined;
      let bestScore=Number.POSITIVE_INFINITY;
      for(let attempt=0;attempt<400;attempt++) {
        const random=randomSources[attempt%5]!;
        const pool=[...definition.numbers];
        const candidate:number[]=[];
        while(candidate.length<10) {
          const weights=pool.map(number=>Math.max(1,definition.weight(number))/Math.max(1,globalExposure[number]/20));
          let point=random()*weights.reduce((sum,value)=>sum+value,0);
          let position=0;
          for(;position<pool.length-1;position++){point-=weights[position]!;if(point<=0)break;}
          candidate.push(pool[position]!);pool.splice(position,1);
        }
        candidate.sort((a,b)=>a-b);
        if(seen.has(candidate.join(","))) continue;
        let score=0;
        for(let a=0;a<10;a++) for(let b=a+1;b<10;b++) score+=(globalPairUsage.get(pairKey(candidate[a]!,candidate[b]!))??0)**2*5;
        score+=groupPlays.reduce((sum,play)=>sum+Math.max(0,overlap(candidate,play.numbers)-6)**2*300,0);
        score+=candidate.reduce((sum,number)=>sum+globalExposure[number]**2*.3-definition.weight(number)*.15,0);
        if(score<bestScore){bestScore=score;best=candidate;}
      }
      if(!best) throw new Error(`V10.6 no pudo completar ${definition.name} #${playIndex+1}.`);
      seen.add(best.join(","));best.forEach(number=>globalExposure[number]++);
      for(let a=0;a<10;a++) for(let b=a+1;b<10;b++){const key=pairKey(best[a]!,best[b]!);globalPairUsage.set(key,(globalPairUsage.get(key)??0)+1);}
      const play:KinoPlay={id:allPlays.length+1,profile:"exploratoria",numbers:best,hot:4,middle:3,cold:3};
      groupPlays.push(play);allPlays.push(play);
    }
    groups.push({name:definition.name,numbers:definition.numbers,plays:groupPlays});
  });
  return {plays:allPlays,groups};
}

function evaluate(plays:readonly KinoPlay[],draw:KinoDraw) {
  const winning=new Set(draw.numbers);
  const hits=plays.map(play=>play.numbers.filter(number=>winning.has(number)).length);
  const playExposure=exposure(plays);
  const rankedNumbers=Array.from({length:84},(_,index)=>index+1).sort((a,b)=>playExposure[b]!-playExposure[a]!||a-b);
  const poolHits=(size:number)=>rankedNumbers.slice(0,size).filter(number=>winning.has(number)).length;
  const candidate20Hits=poolHits(20);
  const maximum=Math.max(...hits);
  return {
    prize:hits.reduce((sum,count)=>sum+kinoPrize(count),0),maximum,sevenPlus:hits.filter(count=>count>=7).length,eightPlus:hits.filter(count=>count>=8).length,
    candidate20Hits,candidate30Hits:poolHits(30),candidate40Hits:poolHits(40),coveredWinningNumbers:draw.numbers.filter(number=>playExposure[number]!>0).length,
    candidate20Ceiling:Math.min(10,candidate20Hits),candidate20CombinationGap:Math.max(0,Math.min(10,candidate20Hits)-maximum)
  };
}

const rows=dates.map(date=>{
  const draw=draws.find(item=>item.date===date)!;
  const v10=buildKinoV10RetrospectiveSnapshot(draws,date).plays;
  const v102=buildCandidate(v10,date,"v102");
  const v103=buildCandidate(v10,date,"v103");
  const v104=buildCandidate(v10,date,"v104");
  const v105=buildCandidate(v10,date,"v105");
  const v1055=buildCandidate(v10,date,"v1055");
  const v106=buildV106(date);
  const v10Exposure=exposure(v10).slice(1);
  const v102Exposure=exposure(v102).slice(1);
  const v103Exposure=exposure(v103).slice(1);
  const v104Exposure=exposure(v104).slice(1);
  const v105Exposure=exposure(v105).slice(1);
  const v1055Exposure=exposure(v1055).slice(1);
  const v106Exposure=exposure(v106.plays).slice(1);
  const winning=new Set(draw.numbers);
  const v106Groups=v106.groups.map(group=>({name:group.name,candidateHits:group.numbers.filter(number=>winning.has(number)).length,maximum:evaluate(group.plays,draw).maximum}));
  return {date,v10:evaluate(v10,draw),v102:evaluate(v102,draw),v103:evaluate(v103,draw),v104:evaluate(v104,draw),v105:evaluate(v105,draw),v1055:evaluate(v1055,draw),v106:evaluate(v106.plays,draw),v106Groups,v10Exposure:[Math.min(...v10Exposure),Math.max(...v10Exposure)],v102Exposure:[Math.min(...v102Exposure),Math.max(...v102Exposure)],v103Exposure:[Math.min(...v103Exposure),Math.max(...v103Exposure)],v104Exposure:[Math.min(...v104Exposure),Math.max(...v104Exposure)],v105Exposure:[Math.min(...v105Exposure),Math.max(...v105Exposure)],v1055Exposure:[Math.min(...v1055Exposure),Math.max(...v1055Exposure)],v106Exposure:[Math.min(...v106Exposure),Math.max(...v106Exposure)]};
});

function summarize(key:"v10"|"v102"|"v103"|"v104"|"v105"|"v1055"|"v106") {
  const cost=rows.length*200*ticketCost;
  const prize=rows.reduce((sum,row)=>sum+row[key].prize,0);
  return {draws:rows.length,cost,prize,net:prize-cost,roi:Number((prize/cost*100).toFixed(2)),maximum:Math.max(...rows.map(row=>row[key].maximum)),daysSevenPlus:rows.filter(row=>row[key].maximum>=7).length,playsSevenPlus:rows.reduce((sum,row)=>sum+row[key].sevenPlus,0),playsEightPlus:rows.reduce((sum,row)=>sum+row[key].eightPlus,0)};
}

console.log(JSON.stringify({protocol:{start,end,playsPerDraw:200,construction:"deterministic five-sequence ensemble",plans:{v102:{coreV10:140,recombination:40,contrast:20},v103:{coreV10:120,recombination:40,scenarios:25,residual:15},v104:{coreV10:140,recombination:40,historicalPatterns:20},v105:{coreV10:140,recombination:40,contrast:10,historicalPatterns:10},v1055:{coreV10:140,recombination:40,contrast:15,historicalPatterns:5},v106:{groups:5,numbersPerGroup:28,playsPerGroup:40,signals:["frecuencia reciente","continuidad","atraso recuperable","parejas","distribución por rangos"]}},futureLeakage:false},summary:{v10:summarize("v10"),v102:summarize("v102"),v103:summarize("v103"),v104:summarize("v104"),v105:summarize("v105"),v1055:summarize("v1055"),v106:summarize("v106")},rows},null,2));
