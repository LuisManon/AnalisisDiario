import assert from "node:assert/strict";
import {test} from "node:test";
import {spawnSync} from "node:child_process";
import {mkdtempSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

const runner=path.resolve("scripts/run-kino-triples.ts");
function rejectedWithoutWrites(args:string[],message:RegExp) {
  const directory=mkdtempSync(path.join(tmpdir(),"kino-triples-invalid-"));
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

test("triples requires cutoff before data reads or writes",()=>{
  rejectedWithoutWrites([],/Explicit cutoff required/);
});
test("triples cannot unlock or consume holdout",()=>{
  rejectedWithoutWrites(["--cutoff=2026-11-08","--phase=holdout"],/validation only/);
  rejectedWithoutWrites(["--cutoff=2026-11-08","--unlock-holdout=true"],/validation only/);
});
test("triples requires a safe output identifier",()=>{
  for(const value of [undefined,"../../data/results","/tmp/escaped","UPPER","","x".repeat(81)]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08",...(value===undefined?[]:[`--run-id=${value}`])],/Safe run-id required/);
  }
});
test("triples validates replicate counts before writes",()=>{
  for(const value of ["1","51","2.5","NaN"]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08","--run-id=invalid",`--replicates=${value}`],/replicates must be integer2\.\.50/);
  }
});
test("triples validates scenario counts before writes",()=>{
  for(const value of ["99","100001","100.5","NaN"]) {
    rejectedWithoutWrites(["--cutoff=2026-11-08","--run-id=invalid",`--draws=${value}`],/draws must be integer100\.\.100000/);
  }
});
