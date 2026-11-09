/** Offline laboratory. No API calls, operational data writes or strategy activation. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { prepareKinoExperimentData, priorDraws } from "../lib/kino-experiment-data.ts";
import { buildExperimentPortfolio, experimentModes } from "../lib/kino-experiment-strategies.ts";
import { evaluatePortfolio, compilePortfolio, summarizeEvaluations, pairedDifference, type PortfolioEvaluation } from "../lib/kino-experiment-metrics.ts";

const args = new Map(process.argv.slice(2).map(arg => {
  const [key,...value] = arg.replace(/^--/, "").split("=");
  return [key,value.join("=") || "true"];
}));
const allowed = new Set(["cutoff","phase","draws","replicates","run-id","unlock-holdout"]);
for (const key of args.keys()) if (!allowed.has(key)) throw new Error(`Unknown option: ${key}`);
const cutoff = args.get("cutoff");
if (!cutoff) throw new Error("An explicit --cutoff=YYYY-MM-DD is required.");
const phase = args.get("phase") ?? "validation";
if (phase !== "validation" && phase !== "holdout") throw new Error("phase must be validation or holdout");
if (phase === "holdout" && args.get("unlock-holdout") !== "true") throw new Error("Holdout is reserved. Explicit --unlock-holdout is required; reviewing it consumes it.");
const syntheticDraws = Number(args.get("draws") ?? 5000), replicates = Number(args.get("replicates") ?? 3);
if (!Number.isInteger(syntheticDraws) || syntheticDraws < 100 || syntheticDraws > 100000) throw new Error("draws must be an integer100..100000");
if (!Number.isInteger(replicates) || replicates < 2 || replicates > 30) throw new Error("replicates must be an integer2..30");
const runId = args.get("run-id");
if (runId && !/^[a-z0-9-]{1,80}$/.test(runId)) throw new Error("run-id must contain only lowercase letters, numbers and hyphens");
const outputPath = runId ? path.resolve("experiments/super-kino",`${runId}.json`) : undefined;
if (outputPath && fs.existsSync(outputPath)) throw new Error("Run already exists. Choose a new run-id; never overwrite a previous experiment.");
const data = prepareKinoExperimentData(JSON.parse(fs.readFileSync("data/super-kino-results.json","utf8")), {cutoff,warmup:30,validationCount:10});
const sources = ["scripts/run-kino-experiment.ts","lib/kino-experiment-data.ts","lib/kino-experiment-strategies.ts","lib/kino-experiment-metrics.ts","lib/super-kino-v133.ts","lib/super-kino.ts"];
const codeSha256 = createHash("sha256").update(sources.map(file => `${file}\n${fs.readFileSync(file,"utf8")}`).join("\n")).digest("hex");
function randomFor(seed:string) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0),16777619);
  return () => { state += 0x6d2b79f5; let value=state; value=Math.imul(value^(value>>>15),value|1); value^=value+Math.imul(value^(value>>>7),value|61); return ((value^(value>>>14))>>>0)/4294967296; };
}
function syntheticDraw(random:()=>number) {
  const pool = Array.from({length:84},(_,index)=>index+1);
  for (let index=83;index>0;index--) { const other=Math.floor(random()*(index+1)); [pool[index],pool[other]]=[pool[other],pool[index]]; }
  return pool.slice(0,20);
}
const dates = phase === "validation" ? data.validation : data.holdout;
const historical:Record<string,{date:string;portfolioSeed:string;priorCount:number;priorLastDate:string|undefined;evaluation:PortfolioEvaluation}[]> = {};
for (const mode of experimentModes) {
  historical[mode] = [];
  for (const draw of dates) {
    process.stderr.write(`Historical ${mode} ${draw.date}\n`);
    const prior = priorDraws(data,draw.date);
    // Production uses the date exactly. Other methods use a separate namespace.
    const seed = mode === "v133-production" ? draw.date : `kino-lab-v1/historical/${mode}/${draw.date}`;
    const portfolio = buildExperimentPortfolio(mode,seed);
    historical[mode].push({date:draw.date,portfolioSeed:seed,priorCount:prior.length,priorLastDate:prior.at(-1)?.date,evaluation:evaluatePortfolio(portfolio,draw.numbers)});
  }
}
const synthetic = [];
for (let replicate=0;replicate<replicates;replicate++) {
  const random = randomFor(`kino-lab-v1/${phase}/draws/${replicate}`);
  const scenarios = Array.from({length:syntheticDraws},()=>syntheticDraw(random));
  const evaluated:Record<string,PortfolioEvaluation[]> = {};
  for (const mode of experimentModes) {
    const seed = `kino-lab-v1/${phase}/portfolio/${mode}/${replicate}`;
    process.stderr.write(`Synthetic ${mode} replicate${replicate+1}/${replicates}\n`);
    const portfolio = buildExperimentPortfolio(mode,seed);
    const evaluate = compilePortfolio(portfolio);
    evaluated[mode] = scenarios.map(draw => evaluate(draw));
  }
  synthetic.push({replicate,portfolioSeeds:Object.fromEntries(experimentModes.map(mode=>[mode,`kino-lab-v1/${phase}/portfolio/${mode}/${replicate}`])),drawSeed:`kino-lab-v1/${phase}/draws/${replicate}`,summaries:Object.fromEntries(experimentModes.map(mode=>[mode,summarizeEvaluations(evaluated[mode])])),versusUniform:Object.fromEntries(experimentModes.filter(mode=>mode!=="uniform").map(mode=>[mode,{max:pairedDifference(evaluated[mode],evaluated.uniform,"maxHits"),sevenPlus:pairedDifference(evaluated[mode],evaluated.uniform,"atLeast7"),eightPlus:pairedDifference(evaluated[mode],evaluated.uniform,"atLeast8")}]))});
}
const report = {
  protocol:{version:"kino-lab-v1",phase,cutoff,datasetSha256:data.sha256,codeSha256,metadata:data.metadata,partitions:data.dates,modes:experimentModes,ticketsPerPortfolio:200,numbersPerTicket:10,syntheticDrawsPerReplicate:syntheticDraws,portfolioReplicates:replicates,primaryMetric:"probability of at least one7+ ticket per200-ticket portfolio",secondaryMetrics:["maxHits","atLeast6Rate","atLeast8Rate","meanHits"],selection:"No automatic winner, deployment or parameter tuning",historicalExposure:"Previously inspected during audit; historical holdout is descriptive, not pristine",syntheticHoldoutReserved:phase==="validation",syntheticUncertainty:"Paired scenario bootstrap per fixed portfolio. Inspect variation across portfolio replicates; not a confidence interval across generator seeds.",prizes:"Not optimized or compared; rare jackpot events make short-run ROI unstable",model:"Uniform84/20/10; observed regime boundary, not independently verified official rules",sources},
  historical:{kind:"Reconstructed comparison, not recorded bets. V13.3 is replayed even before its activation date; prior outcomes never enter these coverage-only builders.",summaries:Object.fromEntries(experimentModes.map(mode=>[mode,summarizeEvaluations(historical[mode].map(row=>row.evaluation))])),rows:historical},
  synthetic
};
const json = JSON.stringify(report,null,2);
if (outputPath) { fs.mkdirSync(path.dirname(outputPath),{recursive:true}); fs.writeFileSync(outputPath,json+"\n",{flag:"wx"}); console.log(`Saved ${outputPath}`); }
else console.log(json);
