/** Offline construction validation, no holdout or operational writes. */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {prepareKinoExperimentData,priorDraws} from "../lib/kino-experiment-data.ts";
import {compilePortfolio,summarizeEvaluations} from "../lib/kino-experiment-metrics.ts";
import {buildV2Portfolio,diversityPenalty} from "../lib/kino-experiment-v2.ts";
import {buildTriplePortfolio,triplePenalty} from "../lib/kino-experiment-triples.ts";

const args=new Map(process.argv.slice(2).map(arg=>{const [key,...parts]=arg.replace(/^--/,"").split("=");return [key,parts.join("=")];}));
for(const key of args.keys())if(!["cutoff","draws","replicates","run-id"].includes(key))throw new Error(`Unknown option ${key}; validation only`);
const cutoff=args.get("cutoff"),runId=args.get("run-id");
if(!cutoff)throw new Error("Explicit cutoff required");
if(!runId||!/^[a-z0-9-]{1,80}$/.test(runId))throw new Error("Safe run-id required");
const drawsPerReplicate=Number(args.get("draws")??5000),replicates=Number(args.get("replicates")??12);
if(!Number.isInteger(drawsPerReplicate)||drawsPerReplicate<100||drawsPerReplicate>100000)throw new Error("draws must be integer100..100000");
if(!Number.isInteger(replicates)||replicates<2||replicates>50)throw new Error("replicates must be integer2..50");
const output=path.resolve("experiments/super-kino",`${runId}.json`);
if(fs.existsSync(output))throw new Error("Run exists; do not overwrite");
const data=prepareKinoExperimentData(JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")),{cutoff,warmup:30,validationCount:10});
const sources=["scripts/run-kino-triples.ts","lib/kino-experiment-triples.ts","lib/kino-experiment-v2.ts","lib/kino-experiment-strategies.ts","lib/kino-experiment-data.ts","lib/kino-experiment-metrics.ts","lib/super-kino-v133.ts","lib/super-kino.ts"];
const sha=(text:string)=>createHash("sha256").update(text).digest("hex");
const codeSha256=sha(sources.map(file=>`${file}\n${fs.readFileSync(file,"utf8")}`).join("\n"));
const modes=["uniform","diverse","triples"] as const;
function rng(seed:string){let state=2166136261;for(const char of seed)state=Math.imul(state^char.charCodeAt(0),16777619);return()=>{state=(state+0x6d2b79f5)>>>0;let v=Math.imul(state^(state>>>15),state|1);v^=v+Math.imul(v^(v>>>7),v|61);return((v^(v>>>14))>>>0)/4294967296;};}
function draw(random:()=>number){const pool=Array.from({length:84},(_,i)=>i+1);for(let i=83;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,20);}
function portfolio(mode:typeof modes[number],seed:string){return mode==="triples"?buildTriplePortfolio(seed):buildV2Portfolio(mode==="diverse"?"balanced-diverse":"uniform",seed);}
const historical=[];
for(const target of data.validation){
  const prior=priorDraws(data,target.date),seed=`kino-lab-triples-v1/validation/historical/${target.date}`;
  const methods:Record<string,unknown>={};
  for(const mode of modes){const tickets=portfolio(mode,seed);methods[mode]={seed,diversity:diversityPenalty(tickets),triplePenalty:triplePenalty(tickets),evaluation:compilePortfolio(tickets)(target.numbers)};}
  historical.push({date:target.date,priorCount:prior.length,priorLastDate:prior.at(-1)?.date,methods});
}
type Summary=ReturnType<typeof summarizeEvaluations>;
type Result={replicate:number;seed:string;drawSeed:string;methods:Record<string,{summary:Summary;diversity:number;triplePenalty:number;portfolioSha256:string}>};
const synthetic:Result[]=[];
for(let replicate=0;replicate<replicates;replicate++){
  const seed=`kino-lab-triples-v1/validation/portfolio/${replicate}`,drawSeed=`kino-lab-triples-v1/validation/draws/${replicate}`;
  const random=rng(drawSeed),scenarios=Array.from({length:drawsPerReplicate},()=>draw(random));
  const methods:Result["methods"]={};
  for(const mode of modes){
    process.stderr.write(`Triples replicate${replicate+1}/${replicates} ${mode}\n`);
    const tickets=portfolio(mode,seed),evaluate=compilePortfolio(tickets);
    methods[mode]={summary:summarizeEvaluations(scenarios.map(winning=>evaluate(winning))),diversity:diversityPenalty(tickets),triplePenalty:triplePenalty(tickets),portfolioSha256:sha(JSON.stringify(tickets))};
  }
  synthetic.push({replicate,seed,drawSeed,methods});
}
const mean=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
const summaries=Object.fromEntries(modes.map(mode=>[mode,Object.fromEntries((["meanHits","meanMax","atLeast6Rate","atLeast7Rate","atLeast8Rate"] as const).map(key=>[key,mean(synthetic.map(row=>row.methods[mode].summary[key]))]))]));
const references=["diverse","uniform"];
const comparisons=Object.fromEntries(references.map(reference=>{
  const differences=synthetic.map(row=>row.methods.triples.summary.atLeast7Rate-row.methods[reference].summary.atLeast7Rate),random=rng(`kino-lab-triples-v1/bootstrap/${reference}`);
  const bootstrap=Array.from({length:10000},()=>mean(Array.from({length:replicates},()=>differences[Math.floor(random()*replicates)]))).sort((a,b)=>a-b);
  const quantile=(p:number)=>bootstrap[Math.floor(p*(bootstrap.length-1))];
  return [reference,{replicateDifferences:differences,meanDifference:mean(differences),interval:[quantile(.05/(2*references.length)),quantile(1-.05/(2*references.length))],leaveOneOutMinimum:Math.min(...differences.map((_,i)=>mean(differences.filter((__,j)=>i!==j))))}];
}));
const qualifies=references.every(reference=>comparisons[reference].meanDifference>=.01&&comparisons[reference].interval[0]>0&&comparisons[reference].leaveOneOutMinimum>0)
  &&mean(synthetic.map(row=>row.methods.triples.summary.atLeast8Rate-row.methods.diverse.summary.atLeast8Rate))>=-.002;
const report={protocol:{version:"kino-lab-triples-v1",phase:"validation-only",cutoff,node:process.version,datasetSha256:data.sha256,codeSha256,lockfileSha256:sha(fs.readFileSync("package-lock.json","utf8")),sources,metadata:data.metadata,partitions:data.dates,modes,drawsPerReplicate,replicates,construction:"Same diverse base seed, 10,000 reciprocal swaps minimizing repeated triples; exact exposures preserved, diversity penalty cap1.05x base; no outcomes or ranges",primary:"atLeast7Rate per200-ticket portfolio",criterion:"Mean advantage>=1percentage point versus diverse and uniform, Bonferroni2-comparison bootstrap lower bounds>0, positive leave-one-out means, mean8+ deterioration versus diverse<=0.2percentage point",uncertainty:"10,000 bootstrap resamples of whole seed replicates; approximate with12seeds, exploratory",historical:"Reconstructed previously inspected validation dates; builders consume only seed, no outcomes",activation:"None; no historical or synthetic holdout evaluated"},historical,synthetic,summaries,comparisons,qualifiesForFurtherTesting:qualifies};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n",{flag:"wx"});console.log(`Saved ${output}`);
