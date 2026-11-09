/** Fixed-budget exploratory comparison. No holdout or operational writes. */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {performance} from "node:perf_hooks";
import {prepareKinoExperimentData} from "../lib/kino-experiment-data.ts";
import {buildV2Portfolio} from "../lib/kino-experiment-v2.ts";
import {validateExperimentPortfolio} from "../lib/kino-experiment-strategies.ts";
import {compilePortfolio,summarizeEvaluations} from "../lib/kino-experiment-metrics.ts";
import {buildJointPortfolio,jointObjective} from "../lib/kino-experiment-joint.ts";
import {optimizeDirectCoverage} from "../lib/kino-experiment-direct.ts";

const args=new Map(process.argv.slice(2).map(arg=>{const [key,...parts]=arg.replace(/^--/,"").split("=");return [key,parts.join("=")];}));
for(const key of args.keys())if(!["cutoff","run-id","pilot-only"].includes(key))throw new Error(`Unknown option ${key}; fixed validation protocol only`);
const cutoff=args.get("cutoff"),runId=args.get("run-id");
if(!cutoff)throw new Error("Explicit cutoff required");
if(!runId||!/^[a-z0-9-]{1,80}$/.test(runId))throw new Error("Safe run-id required");
if(args.has("pilot-only")&&!['true','false'].includes(args.get("pilot-only")!))throw new Error("pilot-only must be true or false");
const pilotOnly=args.get("pilot-only")==="true",output=path.resolve("experiments/super-kino",`${runId}.json`);
if(fs.existsSync(output))throw new Error("Run exists; do not overwrite");
const data=prepareKinoExperimentData(JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")),{cutoff,warmup:30,validationCount:10});
const sources=["scripts/run-kino-objectives.ts","lib/kino-experiment-joint.ts","lib/kino-experiment-direct.ts","lib/kino-math.ts","lib/kino-experiment-v2.ts","lib/kino-experiment-strategies.ts","lib/kino-experiment-data.ts","lib/kino-experiment-metrics.ts","lib/super-kino-v133.ts","lib/super-kino.ts"];
const sha=(text:string)=>createHash("sha256").update(text).digest("hex");
const codeSha256=sha(sources.map(file=>`${file}\n${fs.readFileSync(file,"utf8")}`).join("\n"));
const attempts=2000,trainingDraws=4096,evaluationDraws=10000,replicates=32,pilotReplicates=4;
const modes=["diverse","joint","direct"] as const;
function rng(seed:string){let state=2166136261;for(const char of seed)state=Math.imul(state^char.charCodeAt(0),16777619);return()=>{state=(state+0x6d2b79f5)>>>0;let v=Math.imul(state^(state>>>15),state|1);v^=v+Math.imul(v^(v>>>7),v|61);return((v^(v>>>14))>>>0)/4294967296;};}
function draws(seed:string,count:number){const random=rng(seed);return Array.from({length:count},()=>{const pool=Array.from({length:84},(_,i)=>i+1);for(let i=83;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,20);});}
function exposure(tickets:number[][]){const counts=Array<number>(85).fill(0);for(const ticket of tickets)for(const number of ticket)counts[number]++;return counts;}
function construct(phase:"pilot"|"validation",replicate:number){
  const seed=`kino-lab-objectives-v1/${phase}/portfolio/${replicate}`,trainSeed=`kino-lab-objectives-v1/${phase}/training/${replicate}`;
  const train=draws(trainSeed,trainingDraws),start=performance.now(),base=buildV2Portfolio("balanced-diverse",seed);
  const jointStart=performance.now(),joint=buildJointPortfolio(seed,attempts),directStart=performance.now();
  const result=optimizeDirectCoverage(base,train,`${seed}/direct-search`,attempts),finish=performance.now();
  const portfolios={diverse:base,joint,direct:result.tickets};
  const baseExposure=JSON.stringify(exposure(base));
  for(const mode of modes){validateExperimentPortfolio(portfolios[mode]);if(JSON.stringify(exposure(portfolios[mode]))!==baseExposure)throw new Error("Exposure changed");}
  if(result.afterCovered<result.beforeCovered||jointObjective(joint)>jointObjective(base)+1e-14)throw new Error("Construction objective regressed");
  return {portfolios,train,metadata:{seed,trainSeed,trainingSha256:sha(JSON.stringify(train)),timesMs:{base:jointStart-start,joint:directStart-jointStart,direct:finish-directStart},directTraining:{beforeCovered:result.beforeCovered,afterCovered:result.afterCovered,accepted:result.accepted},jointBefore:jointObjective(base),jointAfter:jointObjective(joint)}};
}
const pilot=[];
for(let replicate=0;replicate<pilotReplicates;replicate++){
  process.stderr.write(`Pilot QA/cost ${replicate+1}/${pilotReplicates}\n`);
  const result=construct("pilot",replicate);
  // Pilot never generates evaluation outcomes or evaluates any candidate on them.
  pilot.push({replicate,...result.metadata});
}
if(pilot.reduce((sum,row)=>sum+row.timesMs.base+row.timesMs.joint+row.timesMs.direct,0)>120000)throw new Error("Pilot cost exceeds fixed budget; stop before evaluation, do not silently reduce protocol");
type Summary=ReturnType<typeof summarizeEvaluations>;
type Row={replicate:number;construction:ReturnType<typeof construct>["metadata"];evaluationSeed:string;evaluationSha256:string;methods:Record<string,{portfolioSha256:string;training:Summary;evaluation:Summary}>};
const validation:Row[]=[];
if(!pilotOnly)for(let replicate=0;replicate<replicates;replicate++){
  process.stderr.write(`Independent evaluation ${replicate+1}/${replicates}\n`);
  const built=construct("validation",replicate),evaluationSeed=`kino-lab-objectives-v1/validation/evaluation/${replicate}`;
  if(evaluationSeed===built.metadata.trainSeed)throw new Error("Training and evaluation seed collision");
  const evaluation=draws(evaluationSeed,evaluationDraws),methods:Row["methods"]={};
  if(JSON.stringify(built.train)===JSON.stringify(evaluation.slice(0,trainingDraws)))throw new Error("Training/evaluation streams coincide");
  for(const mode of modes){const evaluate=compilePortfolio(built.portfolios[mode]);methods[mode]={portfolioSha256:sha(JSON.stringify(built.portfolios[mode])),training:summarizeEvaluations(built.train.map(winning=>evaluate(winning))),evaluation:summarizeEvaluations(evaluation.map(winning=>evaluate(winning)))};}
  if(Math.round(methods.direct.training.atLeast7Rate*trainingDraws)!==built.metadata.directTraining.afterCovered||Math.round(methods.diverse.training.atLeast7Rate*trainingDraws)!==built.metadata.directTraining.beforeCovered)throw new Error("Training cache disagrees with independent evaluation");
  validation.push({replicate,construction:built.metadata,evaluationSeed,evaluationSha256:sha(JSON.stringify(evaluation)),methods});
}
const mean=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
const summaries=validation.length?Object.fromEntries(modes.map(mode=>[mode,Object.fromEntries((["meanHits","meanMax","atLeast6Rate","atLeast7Rate","atLeast8Rate"] as const).map(key=>[key,mean(validation.map(row=>row.methods[mode].evaluation[key]))]))])):{};
const comparisons=validation.length?Object.fromEntries((["joint","direct"] as const).map(mode=>{
  const differences=validation.map(row=>row.methods[mode].evaluation.atLeast7Rate-row.methods.diverse.evaluation.atLeast7Rate),random=rng(`kino-lab-objectives-v1/bootstrap/${mode}`);
  const bootstrap=Array.from({length:10000},()=>mean(Array.from({length:replicates},()=>differences[Math.floor(random()*replicates)]))).sort((a,b)=>a-b);
  const interval=[bootstrap[Math.floor(.0125*(bootstrap.length-1))],bootstrap[Math.floor(.9875*(bootstrap.length-1))]];
  const leaveOneOutMinimum=Math.min(...differences.map((_,i)=>mean(differences.filter((__,j)=>i!==j))));
  const eightPlusDifference=mean(validation.map(row=>row.methods[mode].evaluation.atLeast8Rate-row.methods.diverse.evaluation.atLeast8Rate));
  return [mode,{replicateDifferences:differences,meanDifference:mean(differences),interval,leaveOneOutMinimum,eightPlusDifference,trainingGain:mean(validation.map(row=>row.methods[mode].training.atLeast7Rate-row.methods.diverse.training.atLeast7Rate)),qualifiesForConfirmation:mean(differences)>=.01&&interval[0]>0&&leaveOneOutMinimum>0&&eightPlusDifference>=-.002}];
})):{};
const report={protocol:{version:"kino-lab-objectives-v1",phase:pilotOnly?"pilot-only":"validation-only",cutoff,node:process.version,datasetSha256:data.sha256,codeSha256,lockfileSha256:sha(fs.readFileSync("package-lock.json","utf8")),sources,metadata:data.metadata,partitions:data.dates,modes,attempts,trainingDraws,evaluationDraws,replicates,pilotReplicates,primary:"atLeast7Rate per200-ticket portfolio",criterion:"Each candidate versus diverse: mean>=1percentage point; Bonferroni2 percentile bootstrap lower>0; positive leave-one-out means;8+ deterioration<=0.2percentage point",uncertainty:"10,000 bootstrap resamples of whole32seed replicates; approximate exploratory intervals; prior adaptive search is not erased",historical:"Dataset is provenance context only. No historical outcomes or current reserved scenarios evaluated; uniform84/20/10 assumed",stoppingRule:"No extending budget, retuning parameters or changing metric after results. If neither qualifies, stop these configurations; if one qualifies, preregister independent confirmation",activation:"None. Qualifying is not deployment or permission to consume existing holdout"},pilot,validation,summaries,comparisons};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n",{flag:"wx"});console.log(`Saved ${output}`);
