import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {auditKinoWeek} from "../lib/kino-week-audit.ts";
import {kinoSnapshotSchema,type KinoDraw} from "../lib/super-kino.ts";
const snapshot=kinoSnapshotSchema.parse(JSON.parse(fs.readFileSync(new URL("../data/super-kino-portfolios/2026-11-02.json",import.meta.url),"utf8")));
const draw:KinoDraw={date:snapshot.targetDate,numbers:snapshot.prizeDrawNumbers!,source:"https://example.com/source"};
const run=(snapshots=[snapshot],draws=[draw])=>auditKinoWeek({from:draw.date,to:draw.date,snapshots,draws});
test("weekly audit reconciles frozen prizes, zero-hit awards and hypothetical cost",()=>{
  const result=run(),row=result.rows[0];
  assert.equal(result.summary.totalPrize,1440);
  assert.equal(result.summary.theoreticalCost,5000);
  assert.equal(row.metrics!.prizeGroups[0].total,row.metrics!.histogram[0]*80);
  assert.equal(row.metrics!.histogram.reduce((a,b)=>a+b,0),200);
  assert.equal(result.summary.includedDraws,1);
});
test("corrections flag a discrepancy without rewriting frozen performance",()=>{
  const corrected={...draw,numbers:Array.from({length:20},(_,i)=>i+1)};
  const before=JSON.stringify({snapshot,corrected});
  const result=run([snapshot],[corrected]);
  assert.equal(result.summary.totalPrize,1440);
  assert.ok(result.rows[0].issues.includes("current-result-differs-from-frozen"));
  assert.equal(JSON.stringify({snapshot,corrected}),before);
});
test("missing and pending are not recorded as zero-prize performances",()=>{
  assert.equal(run([]).rows[0].state,"missing-portfolio");
  const pending={...snapshot,prizeDrawNumbers:undefined,prizeSummary:undefined};
  const result=run([pending],[]);
  assert.equal(result.rows[0].state,"pending-result");
  assert.equal(result.rows[0].metrics,null);
  assert.equal(result.summary.includedDraws,0);
});
test("retrospectives and unfrozen results cannot enter recorded-performance totals",()=>{
  // Use the schema's real simulation shape in a fixture derived from an existing retrospective.
  const original=kinoSnapshotSchema.parse(JSON.parse(fs.readFileSync(new URL("../data/super-kino-portfolios/2026-10-27.json",import.meta.url),"utf8")));
  const result=run([{...snapshot,simulation:original.simulation}]);
  assert.equal(result.summary.includedDraws,0);
  assert.equal(result.rows[0].retrospective,true);
  assert.equal(run([{...snapshot,prizeDrawNumbers:undefined,prizeSummary:undefined}]).rows[0].state,"unfrozen");
  assert.throws(()=>auditKinoWeek({from:"2026-11-09",to:"2026-11-01",draws:[],snapshots:[]}));
  assert.throws(()=>run([snapshot,snapshot]));
});
test("late nonretrospective generation is rejected instead of counted",()=>{
  assert.throws(()=>run([{...snapshot,generatedAt:"2026-11-03T02:00:00Z"}]));
});
