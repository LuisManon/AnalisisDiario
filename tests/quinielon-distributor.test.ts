import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAssignment, resolveInvestorWinner, rotateBlocks, distribute, selectedAssignmentSlot, followingSlot, nextAssignmentSlot, previousSlot, subtractMonths, type Assignment, type AssignmentNumber } from "../lib/quinielon-distributor.ts";
const pool: AssignmentNumber[] = Array.from({length:80},(_,number)=>({number,source:number<40?"casa":"respaldo",badge:"",winner:false}));
function snapshot(investors: AssignmentNumber[][]): Assignment {return {date:"2026-09-29",session:"dia",smart:false,investors,excluded:0,priorCount:0,mixed:false,createdAt:"2026-09-29T10:00:00Z"};}
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

test("calendar winners use saved assignments from September 29 and Seibo's stable index",()=>{
  const assignment = snapshot([pool.slice(0,20),pool.slice(20,40),pool.slice(40,60),pool.slice(60,80)]);
  const draw = {date:"2026-09-29",session:"dia" as const,number:23};
  assert.deepEqual(resolveInvestorWinner(draw,assignment),{number:23,name:"Seibo",recorded:true,group:"nosotros"});
  assert.equal(resolveInvestorWinner({...draw,date:"2026-09-28"},assignment),null);
  assert.deepEqual(resolveInvestorWinner(draw,null),{number:23,name:null,recorded:false,group:null});
  assert.deepEqual(resolveInvestorWinner({...draw,session:"noche"},assignment),{number:23,name:null,recorded:false,group:null});
  assert.deepEqual(resolveInvestorWinner({...draw,number:99},assignment),{number:99,name:null,recorded:true,group:"banca"});
});

test("a number moved from Banca to Jose Luis's reserve is scored for Inversionistas",()=>{
  const assignment = snapshot([pool.slice(0,20),pool.slice(20,40),pool.slice(40,60),pool.slice(60,80).map(item=>item.number===60 ? {...item,number:80} : item)]);
  assert.deepEqual(resolveInvestorWinner({date:"2026-09-29",session:"dia",number:80},assignment),{number:80,name:"Jose Luis",recorded:true,group:"inversionistas"});
  const smart={...assignment,smart:true};
  assert.equal(resolveInvestorWinner({date:"2026-09-29",session:"dia",number:99},smart)?.group,null);
});

test("double validation blocks duplicate owners and contradictory source groups",()=>{
  const assignment=snapshot([pool.slice(0,20),pool.slice(20,40),pool.slice(40,60),pool.slice(60,80)]);
  assignment.roster=Array.from({length:100},(_,number)=>({number,group:number<40?"nosotros":number<80?"inversionistas":"banca"}));
  assert.equal(validateAssignment(assignment),null);
  const duplicate=structuredClone(assignment);
  duplicate.investors[3][0]={...duplicate.investors[0][0]};
  assert.ok(validateAssignment(duplicate));
  assert.ok(resolveInvestorWinner({date:"2026-09-29",session:"dia",number:0},duplicate)?.validationError);
  const wrongGroup=structuredClone(assignment); wrongGroup.investors[3][0].source="casa";
  assert.ok(validateAssignment(wrongGroup));
  assert.equal(resolveInvestorWinner({date:"2026-09-29",session:"dia",number:60},wrongGroup)?.name,null);
});
test("later rotation cannot change a closed session's owner or group",()=>{
  const first={...snapshot(rotateBlocks(pool,{date:"2026-09-29",session:"dia"}).investors),blockStarts:[1,21,41,61]};
  const later={...snapshot(rotateBlocks(pool,{date:"2026-09-29",session:"noche"}).investors),session:"noche" as const};
  const draw={date:"2026-09-29",session:"dia" as const,number:61};
  assert.equal(resolveInvestorWinner(draw,first)?.name,"Jose Luis");
  assert.equal(resolveInvestorWinner({...draw,session:"noche"},later)?.name,"Seibo");
  assert.equal(resolveInvestorWinner(draw,first)?.name,"Jose Luis");
  assert.equal(validateAssignment({...first,createdAt:"2026-09-29T16:00:00Z"}),"Reparto fuera de la tanda");
});
test("smart-filtered numbers keep their saved group even without an investor",()=>{
  const assignment={...snapshot([[],[],[],[]]),smart:true,roster:Array.from({length:100},(_,number)=>({number,group:(number<40?"nosotros":number<80?"inversionistas":"banca") as "nosotros"|"inversionistas"|"banca"}))};
  assert.deepEqual(resolveInvestorWinner({date:"2026-09-29",session:"dia",number:61},assignment),{number:61,name:null,recorded:true,group:"inversionistas"});
});
