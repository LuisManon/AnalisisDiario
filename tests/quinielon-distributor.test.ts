import assert from "node:assert/strict";
import { test } from "node:test";
import { rotateBlocks, distribute, selectedAssignmentSlot, followingSlot, nextAssignmentSlot, previousSlot, subtractMonths, type Assignment, type AssignmentNumber } from "../lib/quinielon-distributor.ts";
const pool: AssignmentNumber[] = Array.from({length:80},(_,number)=>({number,source:number<40?"casa":"respaldo",badge:"",winner:false}));
function snapshot(investors: AssignmentNumber[][]): Assignment {return {date:"2026-09-29",session:"dia",smart:false,investors,excluded:0,priorCount:0,mixed:false,createdAt:""};}
function verify(investors: AssignmentNumber[][], selected: AssignmentNumber[], previous: Assignment[]) {
  assert.deepEqual(investors.flat().map(n=>n.number).sort((a,b)=>a-b),selected.map(n=>n.number).sort((a,b)=>a-b));
  assert.ok(Math.max(...investors.map(i=>i.length))-Math.min(...investors.map(i=>i.length))<=1);
  investors.forEach((items,i)=>assert.ok(items.every(n=>previous.every(p=>!p.investors[i].some(old=>old.number===n.number)))));
}
test("smart mode balances filtered numbers with no repeats, including odd totals",()=>{
  for(const size of [0,1,3,17,53,79,80]) {let history:Assignment[]=[];const selected=pool.slice(0,size);for(let turn=0;turn<8;turn++){const r=distribute(selected,history,true,`${size}-${turn}`);verify(r.investors,selected,history);history=[snapshot(r.investors),...history].slice(0,2);}}
});
test("impossible assignment is rejected rather than repeating",()=>{
  const previous=[snapshot([pool,[],[],[]]),snapshot([[],pool,[],[]])];assert.throws(()=>distribute(pool,previous,true,"blocked"));
});
test("stable seed and Dominican cutoff dates",()=>{
  assert.deepEqual(distribute(pool,[],true,"seed"),distribute(pool,[],true,"seed"));
  assert.deepEqual(nextAssignmentSlot(new Date("2026-09-29T15:59:00Z")),{date:"2026-09-29",session:"dia"});
  assert.deepEqual(nextAssignmentSlot(new Date("2026-09-29T16:00:00Z")),{date:"2026-09-29",session:"noche"});
  assert.deepEqual(nextAssignmentSlot(new Date("2026-09-29T23:00:00Z")),{date:"2026-09-30",session:"dia"});
  assert.deepEqual(previousSlot({date:"2026-10-01",session:"dia"}),{date:"2026-09-30",session:"noche"});
  assert.equal(subtractMonths("2026-03-31",4),"2025-11-30");
});

test("manual selection chooses the next requested session across cutoffs",()=>{
  const before = new Date("2026-09-29T15:59:00Z"), afterDay = new Date("2026-09-29T16:00:00Z"), afterNight = new Date("2026-09-29T23:00:00Z");
  assert.deepEqual(selectedAssignmentSlot("noche",before),{date:"2026-09-29",session:"noche"});
  assert.deepEqual(selectedAssignmentSlot("dia",afterDay),{date:"2026-09-30",session:"dia"});
  assert.deepEqual(selectedAssignmentSlot("noche",afterDay),{date:"2026-09-29",session:"noche"});
  assert.deepEqual(selectedAssignmentSlot("noche",afterNight),{date:"2026-09-30",session:"noche"});
  assert.deepEqual(selectedAssignmentSlot("auto",afterDay),nextAssignmentSlot(afterDay));
  assert.deepEqual(followingSlot({date:"2026-09-30",session:"noche"}),{date:"2026-10-01",session:"dia"});
});
test("normal mode rotates exact blocks in the requested order every session",()=>{
  let slot: {date:string;session:"dia"|"noche"}={date:"2026-09-29",session:"dia"};
  const expected=[[1,21,41,61],[41,61,21,1],[21,1,61,41],[61,41,1,21],[1,21,41,61]];
  for(const starts of expected) {
    const result=rotateBlocks(pool,slot);
    assert.deepEqual(result.blockStarts,starts);
    verify(result.investors,pool,[]);
    result.investors.forEach((items,i)=>assert.deepEqual(items,pool.slice(starts[i]-1,starts[i]+19)));
    slot=followingSlot(slot);
  }
});
test("block rotation does not depend on viewing order or changing number identities",()=>{
  const changed=[...pool].reverse();
  assert.deepEqual(rotateBlocks(changed,{date:"2026-09-30",session:"dia"}).investors[0],changed.slice(20,40));
  const future=rotateBlocks(pool,{date:"2026-10-02",session:"noche"});
  rotateBlocks(pool,{date:"2026-09-29",session:"dia"});
  assert.deepEqual(rotateBlocks(pool,{date:"2026-10-02",session:"noche"}),future);
  assert.throws(()=>rotateBlocks(pool.slice(0,79),{date:"2026-09-29",session:"dia"}));
});
