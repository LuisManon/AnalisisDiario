import assert from "node:assert/strict";
import { test } from "node:test";
import { distribute, selectedAssignmentSlot, followingSlot, nextAssignmentSlot, previousSlot, subtractMonths, type Assignment, type AssignmentNumber } from "../lib/quinielon-distributor.ts";
const pool: AssignmentNumber[] = Array.from({length:80},(_,number)=>({number,source:number<40?"casa":"respaldo",badge:"",winner:false}));
function snapshot(investors: AssignmentNumber[][]): Assignment {return {date:"2026-09-29",session:"dia",smart:false,investors,excluded:0,priorCount:0,mixed:false,createdAt:""};}
function verify(investors: AssignmentNumber[][], selected: AssignmentNumber[], previous: Assignment[]) {
  assert.deepEqual(investors.flat().map(n=>n.number).sort((a,b)=>a-b),selected.map(n=>n.number).sort((a,b)=>a-b));
  assert.ok(Math.max(...investors.map(i=>i.length))-Math.min(...investors.map(i=>i.length))<=1);
  investors.forEach((items,i)=>assert.ok(items.every(n=>previous.every(p=>!p.investors[i].some(old=>old.number===n.number)))));
}
test("normal blocks retain top 20 and never repeat either of two prior draws",()=>{
  let history:Assignment[]=[];
  for(let turn=0;turn<24;turn++) {const result=distribute(pool,history,false,String(turn));verify(result.investors,pool,history);result.investors.forEach(items=>assert.equal(new Set(items.map(n=>Math.floor(n.number/20))).size,1));history=[snapshot(result.investors),...history].slice(0,2);}
});
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
test("preparing an earlier session protects an already saved later assignment",()=>{
  const later = snapshot(distribute(pool,[],false,"later").investors);
  const earlier = distribute(pool,[later],false,"earlier");
  verify(earlier.investors,pool,[later]);
});

test("normal mode rebuilds changing blocks without excluding any of the 80 numbers",()=>{
  const prior:AssignmentNumber[][]=[[],[],[],[]];
  pool.forEach(n=>prior[n.number%4].push(n));
  const history=[snapshot(prior)];
  const result=distribute(pool,history,false,"changed-day-night-ranking");
  verify(result.investors,pool,history);
  assert.deepEqual(result.investors.map(items=>items.length),[20,20,20,20]);
  assert.equal(result.mixed,false);
});
test("normal mode can mix sources when source-only matching is impossible",()=>{
  // Across two saved draws, every pair of investors has held some Casa numbers.
  const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const first:AssignmentNumber[][]=[[],[],[],[]],second:AssignmentNumber[][]=[[],[],[],[]];
  pool.forEach((n,i)=>{ const [a,b]=pairs[i%pairs.length];first[a].push(n);second[b].push(n); });
  const history=[snapshot(first),snapshot(second)];
  const result=distribute(pool,history,false,"mixed-needed");
  verify(result.investors,pool,history);
  assert.equal(result.mixed,true);
});
