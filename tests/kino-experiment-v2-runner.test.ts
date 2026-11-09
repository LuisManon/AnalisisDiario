import assert from "node:assert/strict";
import {test} from "node:test";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

const runner=path.resolve("scripts/run-kino-experiment-v2.ts");
function rejectedWithoutWrites(args:string[],message:RegExp) {
  const directory=mkdtempSync(path.join(tmpdir(),"kino-v2-invalid-"));
  try {
    const result=spawnSync(process.execPath,["--experimental-strip-types",runner,...args],{
      encoding:"utf8",timeout:10000,cwd:directory,
    });
    assert.equal(result.error,undefined);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,message);
    assert.deepEqual(readdirSync(directory,{recursive:true}),[],"Rejected requests must not create output or operational files");
  } finally {
    rmSync(directory,{recursive:true,force:true});
  }
}

test("v2 requires an explicit cutoff before reading data or writing files",()=>{
  rejectedWithoutWrites([],/Explicit --cutoff is required/);
});
test("v2 has no holdout phase or unlocking option",()=>{
  rejectedWithoutWrites(["--cutoff=2026-11-08","--phase=holdout"],/only supports validation/);
  rejectedWithoutWrites(["--cutoff=2026-11-08","--unlock-holdout=true"],/only supports validation/);
});
test("v2 rejects unsafe and missing output identifiers without writes",()=>{
  for(const args of [[],["--run-id=../../data/results"],["--run-id=/tmp/escaped"],["--run-id=UPPER"]]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08",...args],/safe --run-id is required/);
  }
});
test("v2 rejects invalid portfolio replicate counts without writes",()=>{
  for(const value of ["1","51","2.5","NaN"]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08",`--replicates=${value}`,"--run-id=invalid"],/replicates must be integer2\.\.50/);
  }
});
test("v2 rejects invalid draw counts without writes",()=>{
  for(const value of ["99","100001","100.5","NaN"]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08",`--draws=${value}`,"--run-id=invalid"],/draws must be integer100\.\.100000/);
  }
});
