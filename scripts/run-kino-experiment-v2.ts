/** Offline validation v2. No holdout phase, operational writes or activation. */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {prepareKinoExperimentData,priorDraws} from "../lib/kino-experiment-data.ts";
import {compilePortfolio,summarizeEvaluations} from "../lib/kino-experiment-metrics.ts";
import {buildV2Portfolio,v2Modes,diversityPenalty} from "../lib/kino-experiment-v2.ts";

const args=new Map(process.argv.slice(2).map(arg=>{const [key,...rest]=arg.replace(/^--/,"").split("=");return [key,rest.join("=")];}));
for(const key of args.keys())if(!["cutoff","draws","replicates","run-id"].includes(key))throw new Error(`Unknown option: ${key}; v2 only supports validation`);
const cutoff=args.get("cutoff");
if(!cutoff)throw new Error("Explicit --cutoff is required");
const drawsPerReplicate=Number(args.get("draws")??5000),replicates=Number(args.get("replicates")??12);
if(!Number.isInteger(drawsPerReplicate)||drawsPerReplicate<100||drawsPerReplicate>100000)throw new Error("draws must be integer100..100000");
if(!Number.isInteger(replicates)||replicates<2||replicates>50)throw new Error("replicates must be integer2..50");
const runId=args.get("run-id");
if(!runId||!/^[a-z0-9-]{1,80}$/.test(runId))throw new Error("A safe --run-id is required");
const output=path.resolve("experiments/super-kino",`${runId}.json`);
if(fs.existsSync(output))throw new Error("Run exists; choose a new run-id");
const data=prepareKinoExperimentData(JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")),{cutoff,warmup:30,validationCount:10});
const sources=["scripts/run-kino-experiment-v2.ts","lib/kino-experiment-v2.ts","lib/kino-experiment-strategies.ts","lib/kino-experiment-data.ts","lib/kino-experiment-metrics.ts","lib/super-kino-v133.ts","lib/super-kino.ts"];
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
const codeSha256=sha(sources.map(file=>`${file}\n${fs.readFileSync(file,"utf8")}`).join("\n"));
function rng(seed:string){let state=2166136261;for(const char of seed)state=Math.imul(state^char.charCodeAt(0),16777619);return()=>{state=(state+0x6d2b79f5)>>>0;let x=Math.imul(state^(state>>>15),state|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;};}
function draw(random:()=>number){const pool=Array.from({length:84},(_,i)=>i+1);for(let i=83;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,20);}
function portfolioSeed(mode:string,replicate:string|number){return `kino-lab-v2/validation/portfolio/${mode==="balanced-diverse"?"balanced":mode}/${replicate}`;}
const historical=[];
for(const target of data.validation){
  const prior=priorDraws(data,target.date);
  const methods:Record<string,unknown>={};
  for(const mode of v2Modes){
    process.stderr.write(`Historical ${target.date} ${mode}\n`);
    const seed=mode==="v133-production"?target.date:portfolioSeed(mode,target.date);
    const tickets=buildV2Portfolio(mode,seed);
    methods[mode]={seed,penalty:diversityPenalty(tickets),evaluation:compilePortfolio(tickets)(target.numbers)};
  }
  historical.push({date:target.date,priorCount:prior.length,priorLastDate:prior.at(-1)?.date,methods});
}
type MethodResult={seed:string;penalty:number;portfolioSha256:string;summary:ReturnType<typeof summarizeEvaluations>};
const synthetic:{replicate:number;drawSeed:string;methods:Record<string,MethodResult>}[]=[];
for(let replicate=0;replicate<replicates;replicate++){
  const drawSeed=`kino-lab-v2/validation/draws/${replicate}`;
  const random=rng(drawSeed),scenarios=Array.from({length:drawsPerReplicate},()=>draw(random));
  const methods:Record<string,MethodResult>={};
  for(const mode of v2Modes){
    process.stderr.write(`Synthetic ${replicate+1}/${replicates} ${mode}\n`);
    const seed=portfolioSeed(mode,replicate),tickets=buildV2Portfolio(mode,seed),evaluate=compilePortfolio(tickets);
    methods[mode]={seed,penalty:diversityPenalty(tickets),portfolioSha256:sha(JSON.stringify(tickets)),summary:summarizeEvaluations(scenarios.map(winning=>evaluate(winning)))};
  }
  synthetic.push({replicate,drawSeed,methods});
}
const mean=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
const summaries=Object.fromEntries(v2Modes.map(mode=>[mode,Object.fromEntries((["meanHits","meanMax","atLeast6Rate","atLeast7Rate","atLeast8Rate"] as const).map(key=>[key,mean(synthetic.map(row=>row.methods[mode].summary[key]))]))]));
// Resample whole portfolio/scenario-seed replicates, not 60,000 individual rows.
const references=["uniform","balanced","v133-production"];
const comparisons=Object.fromEntries(references.map(reference=>{
  const differences=synthetic.map(row=>row.methods["balanced-diverse"].summary.atLeast7Rate-row.methods[reference].summary.atLeast7Rate);
  const random=rng(`kino-lab-v2/bootstrap/${reference}`),bootstrap=Array.from({length:10000},()=>mean(Array.from({length:replicates},()=>differences[Math.floor(random()*replicates)]))).sort((a,b)=>a-b);
  const quantile=(p:number)=>bootstrap[Math.min(bootstrap.length-1,Math.floor(p*(bootstrap.length-1)))];
  const lower=quantile(.05/(2*references.length)),upper=quantile(1-.05/(2*references.length));
  return [reference,{replicateDifferences:differences,meanDifference:mean(differences),range:[Math.min(...differences),Math.max(...differences)],simultaneousBootstrapInterval:[lower,upper],leaveOneOutMinimum:Math.min(...differences.map((_,i)=>mean(differences.filter((__,j)=>i!==j))))}];
}));
const qualifies=references.every(reference=>comparisons[reference].simultaneousBootstrapInterval[0]>0&&comparisons[reference].leaveOneOutMinimum>0)
  &&["balanced","v133-production"].every(reference=>comparisons[reference].meanDifference>=.01)
  &&mean(synthetic.map(row=>row.methods["balanced-diverse"].summary.atLeast8Rate-row.methods["v133-production"].summary.atLeast8Rate))>=-.002;
const report={protocol:{version:"kino-lab-v2",phase:"validation-only",cutoff,datasetSha256:data.sha256,codeSha256,node:process.version,lockfileSha256:sha(fs.readFileSync("package-lock.json","utf8")),sources,metadata:data.metadata,partitions:data.dates,modes:v2Modes,drawsPerReplicate,replicates,construction:"balanced-diverse starts from the same balanced seed, fixed10,000 quota-preserving swaps; no winning results",primary:"atLeast7Rate per200-ticket portfolio",historical:"Reconstructed validation only, not recorded bets; no historical or synthetic holdout evaluated",criterion:"Exploratory advancement only: mean7+ advantage>=1percentage point versus balanced AND V13.3; Bonferroni3-comparison bootstrap lower bounds>0 versus all3 references; all leave-one-out means>0; mean8+ deterioration versus V13.3 no worse than0.2percentage point",uncertainty:"10,000 bootstrap resamples of whole independent seed replicates; 3 Bonferroni-adjusted percentile intervals, approximate with few replicates; not confirmatory proof",activation:"None. No automatic deployment or holdout consumption"},historical,synthetic,summaries,comparisons,qualifiesForFurtherTesting:qualifies};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n",{flag:"wx"});console.log(`Saved ${output}`);
