import {z} from "zod";
import {kinoDrawSchema,kinoSnapshotSchema,type KinoDraw,type KinoSnapshot} from "./super-kino.ts";
import {kinoDates,kinoDrawMinutes,isKinoNoDraw} from "./super-kino-clock.ts";
import {drawTimestamp} from "./draw-schedule.ts";

/** Read-only, frozen-result-first audit; never generates or rewrites a portfolio. */
export function auditKinoWeek({from,to,draws,snapshots,unitCost=25}:{from:string;to:string;draws:KinoDraw[];snapshots:KinoSnapshot[];unitCost?:number}){
  z.iso.date().parse(from);z.iso.date().parse(to);
  if(from>to||(new Date(`${to}T12:00:00Z`).getTime()-new Date(`${from}T12:00:00Z`).getTime())/86400000>6)throw new Error("Audit requires an ordered range of at most seven dates");
  if(!Number.isFinite(unitCost)||unitCost<0)throw new Error("Invalid hypothetical unit cost");
  kinoDrawSchema.array().parse(draws);kinoSnapshotSchema.array().parse(snapshots);
  if(new Set(draws.map(draw=>draw.date)).size!==draws.length||new Set(snapshots.map(snapshot=>snapshot.targetDate)).size!==snapshots.length)throw new Error("Duplicate date in audit inputs");
  const rows=kinoDates(from,to).map(date=>{
    const snapshot=snapshots.find(item=>item.targetDate===date),current=draws.find(item=>item.date===date);
    const frozen=snapshot?.prizeDrawNumbers;
    const numbers=frozen??current?.numbers;
    const retrospective=Boolean(snapshot?.simulation);
    const issues:string[]=[];
    if(snapshot&&new Date(snapshot.generatedAt).getTime()>=drawTimestamp({date,minutes:kinoDrawMinutes(date)-5}))issues.push("declared-generation-after-cutoff");
    if(snapshot&&snapshot.analysisTo>=date)issues.push("analysis-includes-target-or-future");
    if(frozen&&current&&frozen.some(number=>!current.numbers.includes(number)))issues.push("current-result-differs-from-frozen");
    if(frozen&&!current)issues.push("current-result-missing-frozen-retained");
    if(snapshot&&numbers&&!frozen)issues.push("not-frozen-current-result-only");
    const metrics=snapshot&&numbers?(()=>{
      const histogram=Array<number>(11).fill(0),prizeGroups:Record<number,{count:number;total:number}>={};
      for(const play of snapshot.plays){const hits=play.numbers.filter(number=>numbers.includes(number)).length;histogram[hits]++;}
      let totalPrize=0,awardedPlays=0;
      for(let hits=0;hits<=10;hits++){const amount=snapshot.prizes.find(prize=>prize.hits===hits)?.amount??0;prizeGroups[hits]={count:histogram[hits],total:histogram[hits]*amount};totalPrize+=prizeGroups[hits].total;if(amount>0)awardedPlays+=histogram[hits];}
      if(snapshot.prizeSummary&&snapshot.prizeSummary.total!==totalPrize)issues.push("frozen-summary-disagrees-with-recorded-result");
      const theoreticalCost=snapshot.plays.length*unitCost;
      return {plays:snapshot.plays.length,histogram,maximumHits:histogram.reduce((maximum,count,hits)=>count>0?hits:maximum,-1),meanHits:histogram.reduce((sum,count,hits)=>sum+count*hits,0)/snapshot.plays.length,prizeGroups,totalPrize,awardedPlays,theoreticalCost,theoreticalNet:totalPrize-theoreticalCost};
    })():null;
    const state=!snapshot?(isKinoNoDraw(date)?"no-draw":"missing-portfolio"):!numbers?"pending-result":!frozen||!snapshot.prizeSummary?"unfrozen":"recorded";
    return {date,state,algorithm:snapshot?.algorithm,generatedAt:snapshot?.generatedAt,analysisTo:snapshot?.analysisTo,retrospective,resultBasis:frozen?"frozen":current?"current":"none",source:current?.source,issues,metrics};
  });
  const criticalIssues=["declared-generation-after-cutoff","analysis-includes-target-or-future","frozen-summary-disagrees-with-recorded-result"];
  const included=rows.filter(row=>row.state==="recorded"&&!row.retrospective&&row.metrics&&!row.issues.some(issue=>criticalIssues.includes(issue)));
  const histogram=Array.from({length:11},(_,hits)=>included.reduce((sum,row)=>sum+row.metrics!.histogram[hits],0));
  const totalPrize=included.reduce((sum,row)=>sum+row.metrics!.totalPrize,0),theoreticalCost=included.reduce((sum,row)=>sum+row.metrics!.theoreticalCost,0);
  return {from,to,costAssumption:{unitCost,hypothetical:true,note:"Saved tickets are not proof of purchases; cost is assumed, prizes use each snapshot scale."},rows,summary:{includedDraws:included.length,excludedDraws:rows.length-included.length,plays:histogram.reduce((a,b)=>a+b,0),histogram,totalPrize,theoreticalCost,theoreticalNet:totalPrize-theoreticalCost,sevenPlusDates:included.filter(row=>row.metrics!.maximumHits>=7).length},caveat:"Frozen/current discrepancies and temporal issues require review. Timestamp fields alone do not prove historical availability; retrospective records are excluded."};
}
