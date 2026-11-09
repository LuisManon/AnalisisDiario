import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {buildKinoPostgame,kinoRecordedDraw,kinoSnapshotSchema,type KinoDraw} from "../lib/super-kino.ts";
const snapshot=kinoSnapshotSchema.parse(JSON.parse(fs.readFileSync(new URL("../data/super-kino-portfolios/2026-11-02.json",import.meta.url),"utf8")));
const corrected:KinoDraw={date:snapshot.targetDate,numbers:Array.from({length:20},(_,i)=>i+1),source:"https://example.com/corrected"};
test("postgame preserves frozen awards and hits after a source correction",()=>{
  const before=JSON.stringify({snapshot,corrected});
  const frozen={...corrected,numbers:[...snapshot.prizeDrawNumbers!]};
  const expected=buildKinoPostgame(snapshot,frozen),actual=buildKinoPostgame(snapshot,corrected);
  assert.equal(actual.totalPrize,snapshot.prizeSummary!.total);
  assert.deepEqual(actual,expected);
  assert.equal(JSON.stringify({snapshot,corrected}),before);
  const resolved=kinoRecordedDraw(snapshot,corrected)!;
  resolved.numbers[0]=84;
  assert.notEqual(snapshot.prizeDrawNumbers![0],84);
});
test("unfrozen results remain evaluable without inventing a recorded result",()=>{
  const unfrozen={...snapshot,prizeDrawNumbers:undefined,prizeSummary:undefined};
  assert.equal(kinoRecordedDraw(unfrozen,corrected),corrected);
  assert.equal(kinoRecordedDraw(snapshot,undefined),undefined);
  assert.notEqual(buildKinoPostgame(unfrozen,corrected).totalPrize,snapshot.prizeSummary!.total);
  assert.throws(()=>kinoRecordedDraw(snapshot,{...corrected,date:"2026-11-03"}));
});
