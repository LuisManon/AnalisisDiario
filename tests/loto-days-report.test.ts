import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("corrected rolling report compares common dates with identical day-specific Mas coverage",()=>{
  const r=JSON.parse(fs.readFileSync("experiments/loto-mas/days-v2.json","utf8"));
  assert.equal(r.protocol,"loto-days-v2");assert.equal(r.totalTargets,24);assert.equal(r.commonDates,24);
  for(const row of r.rows){
    assert.equal(Object.keys(row.errors).length,0);
    assert.equal(row.variants.dayPlus.plusMatched,row.variants.independentDays.plusMatched);
    assert.deepEqual(row.variants.legacy.hist,row.variants.dayPlus.hist);
    assert.ok(row.sameDayPrior>0&&row.prior>=row.sameDayPrior);
    for(const m of [...Object.values(row.variants),...row.randomTrials] as Array<{hist:number[]}>){assert.equal(m.hist.reduce((a,b)=>a+b,0),30);}
  }
  assert.ok(Math.abs(r.summary.random.plusMatched-r.summary.independentDays.plusMatched)<1e-9);
});
