import assert from "node:assert/strict";
import {test} from "node:test";
import {quinielonOutcomeTone,summarizeQuinielonOutcomes} from "../lib/quinielon-outcome-tone.ts";
import type {InvestorWinner} from "../lib/quinielon-distributor.ts";

const draw={number:14,verification:"confirmed" as const};
const winner:InvestorWinner={number:14,name:"Ganador",recorded:true,group:"nosotros"};
test("win-loss summary uses validated outcomes and excludes pending instead of counting losses",()=>{
  assert.deepEqual(summarizeQuinielonOutcomes(["success","warning","danger","neutral"]),{won:2,lost:1,evaluated:3,pending:1,wonPercentage:67,lostPercentage:33});
  assert.deepEqual(summarizeQuinielonOutcomes(["neutral"]),{won:0,lost:0,evaluated:0,pending:1,wonPercentage:null,lostPercentage:null});
  assert.equal(summarizeQuinielonOutcomes(["danger"]).lostPercentage,100);
  assert.equal(summarizeQuinielonOutcomes(["success"]).wonPercentage,100);
});
test("saved Casa winners are green and investor winners yellow, regardless of current tier",()=>{
  assert.equal(quinielonOutcomeTone(draw,winner),"success");
  assert.equal(quinielonOutcomeTone(draw,{...winner,tier:"remaining"}),"success");
  assert.equal(quinielonOutcomeTone(draw,{...winner,group:"inversionistas",tier:"hot"}),"warning");
});
test("Banca and validated draws without winners are red",()=>{
  assert.equal(quinielonOutcomeTone(draw,{...winner,group:"banca"}),"danger");
  for(const group of ["nosotros","inversionistas","banca"] as const) assert.equal(quinielonOutcomeTone(draw,{...winner,group,name:null}),"danger");
});
test("missing, provisional, wrong or unvalidated records stay neutral, not no-winner red",()=>{
  assert.equal(quinielonOutcomeTone(undefined,winner),"neutral");
  assert.equal(quinielonOutcomeTone(draw,undefined),"neutral");
  for(const change of [{recorded:false},{simulated:true},{number:15},{validationError:"Reparto inválido"},{group:null}]) assert.equal(quinielonOutcomeTone(draw,{...winner,...change}),"neutral");
  assert.equal(quinielonOutcomeTone({...draw,verification:"provisional"},winner),"neutral");
});
