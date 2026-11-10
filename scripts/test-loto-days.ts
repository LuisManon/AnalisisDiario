/** Offline rolling retrospective. Fixed variants, no operational writes. */
import fs from "node:fs";
import {createHash} from "node:crypto";
import {buildThirtyPlayPortfolio,buildPlusOrder,getVirtualPrize} from "../lib/game.ts";
import {drawSchema} from "../lib/validation.ts";
import type {DrawResult} from "../lib/types.ts";
const raw=fs.readFileSync("data/results.json","utf8");
if(fs.existsSync("experiments/loto-mas/days-v2.json"))throw new Error("Result already exists; preserve the recorded run.");
const draws=drawSchema.array().parse(JSON.parse(raw)).filter(d=>d.date<="2026-11-07").sort((a,b)=>a.date.localeCompare(b.date));
if(new Set(draws.map(d=>d.date)).size!==draws.length)throw new Error("Duplicate dates");
const targets=draws.slice(-24);
function metric(plays:Array<{numbers:number[];plus:number}>,draw:DrawResult){
  if(plays.length!==30||plays.some(p=>p.numbers.length!==6||new Set(p.numbers).size!==6))throw new Error("Invalid portfolio");
  const hist=Array<number>(7).fill(0);let gross=0,plusMatched=0;
  for(const p of plays){const hits=p.numbers.filter(n=>draw.numbers.includes(n)).length;hist[hits]++;gross+=getVirtualPrize(hits,p.plus===draw.plus).amount;if(p.plus===draw.plus)plusMatched++;}
  return {hist,max:Math.max(...hist.flatMap((count,i)=>count?[i]:[])),gross,plusMatched};
}
let state=20261109;function random(){state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;}
type Metric=ReturnType<typeof metric>;
type Row={date:string;day:DrawResult["day"];prior:number;sameDayPrior:number;phase:string;variants:Record<string,Metric>;errors:Record<string,string>;randomTrials:Metric[]};
const rows:Row[]=[];
for(const target of targets){
  const prior=draws.filter(d=>d.date<target.date),same=prior.filter(d=>d.day===target.day);
  const variants:Record<string,ReturnType<typeof metric>>={},errors:Record<string,string>={};
  let legacy;
  try{legacy=buildThirtyPlayPortfolio(prior,target.date,{mode:"legacy",relaxFilters:false});variants.legacy=metric(legacy.plays,target);}catch(e){errors.legacy=String(e);}
  const top=buildPlusOrder(same).slice(0,5);
  if(legacy)variants.dayPlus=metric(legacy.plays.map((p,i)=>({...p,plus:top[i%5]})),target);
  try{variants.independentDays=metric(buildThirtyPlayPortfolio(prior,target.date).plays,target);}catch(e){errors.independentDays=String(e);}
  const randomTrials=Array.from({length:20},()=>metric(Array.from({length:30},(_,i)=>{const pool=Array.from({length:40},(_,j)=>j+1);for(let j=39;j>0;j--){const n=Math.floor(random()*(j+1));[pool[n],pool[j]]=[pool[j],pool[n]];}return {numbers:pool.slice(0,6).sort((a,b)=>a-b),plus:top[i%5]};}),target));
  rows.push({date:target.date,day:target.day,prior:prior.length,sameDayPrior:same.length,phase:rows.length<16?"development":"temporal-check",variants,errors,randomTrials});
  process.stderr.write(`${target.date} ${JSON.stringify(variants)} ${JSON.stringify(errors)}\n`);
}
const common=rows.filter(r=>r.variants.legacy&&r.variants.dayPlus&&r.variants.independentDays);
function summarize(items:typeof rows){return Object.fromEntries(["legacy","dayPlus","independentDays","random"].map(name=>{
  const evaluated=items.flatMap(r=>name==="random"?r.randomTrials.map(m=>({...m,weight:1/20})):[{...r.variants[name],weight:1}]);
  return [name,{dates:items.length,plays:items.length*30,dates3Plus:evaluated.reduce((s,m)=>s+(m.max>=3?m.weight:0),0),dates4Plus:evaluated.reduce((s,m)=>s+(m.max>=4?m.weight:0),0),hist:Array.from({length:7},(_,i)=>evaluated.reduce((s,m)=>s+m.hist[i]*m.weight,0)),referenceGross:evaluated.reduce((s,m)=>s+m.gross*m.weight,0),plusMatched:evaluated.reduce((s,m)=>s+m.plusMatched*m.weight,0)}];
}));}
const report={protocol:"loto-days-v2",hash:createHash("sha256").update(raw).digest("hex"),note:"Known-history rolling diagnostic, not untouched validation. Last24 dates, first16 development, last8 temporal check. Same 30-play budget. Random20 replications/date, seed20261109, day-specific top5 Mas, canonical descending date tie-break. Supersedes v1 whose dayPlus/random top5 tie-break depended on caller ordering. Amounts use app reference table, not verified historical payouts; no ROI claim. Failed generations are excluded pairwise and separately disclosed, never counted as zero-hit outcomes.",totalTargets:rows.length,commonDates:common.length,summary:summarize(common),byDay:["miercoles","sabado"].map(day=>({day,summary:summarize(common.filter(r=>r.day===day))})),phases:["development","temporal-check"].map(phase=>({phase,summary:summarize(common.filter(r=>r.phase===phase))})),rows};
fs.mkdirSync("experiments/loto-mas",{recursive:true});fs.writeFileSync("experiments/loto-mas/days-v2.json",JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({summary:report.summary,byDay:report.byDay,phases:report.phases,commonDates:common.length,totalTargets:rows.length},null,2));
