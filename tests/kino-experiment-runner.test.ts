import assert from "node:assert/strict";
import {test} from "node:test";
import {spawnSync} from "node:child_process";

function attempt(args:string[]) {
  return spawnSync(process.execPath,["--experimental-strip-types","scripts/run-kino-experiment.ts",...args],{encoding:"utf8",timeout:10000});
}
test("experiment requires an explicit data cutoff",()=>{
  const result=attempt([]);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/explicit --cutoff/);
});
test("historical and synthetic holdout cannot be consumed accidentally",()=>{
  const result=attempt(["--cutoff=2026-11-08","--phase=holdout"]);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Holdout is reserved/);
});
test("experiment rejects output paths escaping its dedicated directory",()=>{
  const result=attempt(["--cutoff=2026-11-08","--run-id=..\/data\/results"]);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/run-id must/);
});
