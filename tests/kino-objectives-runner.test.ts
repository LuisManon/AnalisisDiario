import assert from "node:assert/strict";
import {test} from "node:test";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

const runner=path.resolve("scripts/run-kino-objectives.ts");
function rejectedWithoutWrites(args:string[],message:RegExp) {
  const directory=mkdtempSync(path.join(tmpdir(),"kino-objectives-invalid-"));
  try {
    const result=spawnSync(process.execPath,["--experimental-strip-types",runner,...args],{
      encoding:"utf8",timeout:10000,cwd:directory,
    });
    assert.equal(result.error,undefined);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,message);
    assert.deepEqual(readdirSync(directory,{recursive:true}),[],"Rejected requests must not create outputs or operational files");
  } finally {
    rmSync(directory,{recursive:true,force:true});
  }
}

test("objectives requires explicit cutoff before data reads or writes",()=>{
  rejectedWithoutWrites([],/Explicit cutoff required/);
});
test("objectives cannot unlock holdout or tune preregistered budgets via CLI",()=>{
  for(const option of ["--phase=holdout","--unlock-holdout=true","--replicates=2","--draws=100","--attempts=100","--training-draws=100","--strategy=other"]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08","--run-id=invalid",option],/fixed validation protocol only/);
  }
});
test("objectives requires a safe output identifier",()=>{
  for(const value of [undefined,"../../data/results","/tmp/escaped","UPPER","","x".repeat(81)]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08",...(value===undefined?[]:[`--run-id=${value}`])],/Safe run-id required/);
  }
});
test("objectives rejects ambiguous pilot switches before reads or writes",()=>{
  for(const value of ["","1","yes","FALSE"]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08","--run-id=invalid",`--pilot-only=${value}`],/pilot-only must be true or false/);
  }
});
