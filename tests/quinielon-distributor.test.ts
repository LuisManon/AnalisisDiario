import assert from "node:assert/strict";
import { test } from "node:test";
import { numberDelayBadge, smartDistributionVersion, historicalWager, assignmentInvestment, validateAssignment, resolveInvestorWinner, rotateBlocks, distribute, selectedAssignmentSlot, followingSlot, nextAssignmentSlot, previousSlot, subtractMonths, type Assignment, type AssignmentNumber } from "../lib/quinielon-distributor.ts";
const pool: AssignmentNumber[] = Array.from({length:80},(_,number)=>({number,source:number<40?"casa":"respaldo",badge:"",winner:false}));
function snapshot(investors: AssignmentNumber[][]): Assignment {return {date:"2026-09-29",session:"dia",smart:false,investors,excluded:0,priorCount:0,mixed:false,createdAt:"2026-09-29T10:00:00Z"};}
function verify(investors: AssignmentNumber[][], selected: AssignmentNumber[], previous: Assignment[]) {
  assert.deepEqual(investors.flat().map(n=>n.number).sort((a,b)=>a-b),selected.map(n=>n.number).sort((a,b)=>a-b));
  assert.ok(Math.max(...investors.map(i=>i.length))-Math.min(...investors.map(i=>i.length))<=1);
  investors.forEach((items,i)=>assert.ok(items.every(n=>previous.every(p=>!p.investors[i].some(old=>old.number===n.number)))));
}
test("generic matching balances numbers with no repeats, including odd totals",()=>{
  for(const size of [0,1,3,17,53,79,80]) {let history:Assignment[]=[];const selected=pool.slice(0,size);for(let turn=0;turn<8;turn++){const r=distribute(selected,history,false,`${size}-${turn}`);verify(r.investors,selected,history);history=[snapshot(r.investors),...history].slice(0,2);}}
});
test("impossible assignment is rejected rather than repeating",()=>{
  const selected=pool.slice(0,64); const previous=[snapshot([selected,[],[],[]]),snapshot([[],selected,[],[]])];assert.throws(()=>distribute(selected,previous,true,"blocked"),/tandas protegidas/);
});
test("stable seed and Dominican cutoff dates",()=>{
  assert.deepEqual(distribute(pool.slice(0,64),[],true,"seed"),distribute(pool.slice(0,64),[],true,"seed"));
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

test("64–68 eligible numbers retain exact tiers, wagers and full coverage across draws", () => {
  for (const size of [64,65,66,67,68]) {
    // Reverse numeric order to prove categories follow ranking, not number identity.
    const selected = pool.slice(0,size).reverse();
    let history: Assignment[] = [];
    for (let turn=0; turn<6; turn++) {
      const result = distribute(selected,history,true,`pricing-${size}-${turn}`);
      verify(result.investors,selected,history);
      assert.equal(result.allocationWarning,undefined);
      assert.equal(result.investors.filter(items=>items.length===17).length,size-64);
      result.investors.forEach(items => {
        assert.equal(items.filter(item=>item.tier==="hot").length,4);
        assert.equal(items.filter(item=>item.tier==="intermediate").length,5);
        assert.equal(items.filter(item=>item.tier==="remaining").length,items.length-9);
        assert.equal(assignmentInvestment(items),items.length===16?10250:10150);
        items.forEach(item => {
          const hot = selected.filter(n=>n.source === "casa").slice(0,16);
          const intermediate = selected.filter(n=>!hot.includes(n)).slice(0,20);
          assert.equal(item.tier,hot.some(n=>n.number===item.number)?"hot":intermediate.some(n=>n.number===item.number)?"intermediate":"remaining");
          if (item.tier === "hot") assert.equal(item.source,"casa");
          assert.equal(item.betAmount,item.tier==="hot"?(items.length===16?1000:850):item.tier==="intermediate"?550:500);
          assert.equal(historicalWager(item,result)?.potentialPrize,item.betAmount!*80);
        });
      });
      assert.equal(assignmentInvestment(result.investors.flat()),(68-size)*10250+(size-64)*10150);
      const saved = {...snapshot(result.investors),...result,smart:true};
      assert.equal(validateAssignment(saved),null);
      history=[saved,...history].slice(0,2);
    }
  }
});

test("blocked top 16 expand within Casa while retaining all quotas and investment", () => {
  const selected = pool.slice(0,64);
  const previous=[snapshot([selected.slice(0,16),[],[],[]])];
  const result=distribute(selected,previous,true,"tier-conflict");
  verify(result.investors,selected,previous);
  assert.equal(result.allocationWarning,undefined);
  result.investors.forEach(items => {
    assert.equal(items.filter(item=>item.tier === "hot").length,4);
    assert.ok(items.filter(item=>item.tier === "hot").every(item=>item.source === "casa"));
    assert.equal(items.filter(item=>item.tier === "intermediate").length,5);
    assert.equal(assignmentInvestment(items),10250);
  });
  assert.deepEqual(result,distribute(selected,previous,true,"tier-conflict"));
  assert.throws(()=>distribute([selected[0],selected[0]],[],true,"duplicate"),/duplicados/);
});

test("future assignments passed by the API remain hard exclusions", () => {
  const selected=pool.slice(0,68);
  const earlier=distribute(selected,[],true,"earlier");
  const later=distribute(selected,[snapshot(earlier.investors)],true,"later");
  const protectedDraws=[snapshot(earlier.investors),snapshot(later.investors)];
  verify(distribute(selected,protectedDraws,true,"middle").investors,selected,protectedDraws);
});

test("calendar prizes survive serialization and use historical amounts and multiplier", () => {
  const allocation=distribute(pool.slice(0,64),[],true,"historical");
  const saved: Assignment=JSON.parse(JSON.stringify({...snapshot(allocation.investors),...allocation,smart:true,date:"2026-10-02",createdAt:"2026-10-02T10:00:00Z"}));
  for (const tier of ["hot","intermediate","remaining"]) {
    const item=saved.investors[0].find(n=>n.tier===tier)!;
    const winner=resolveInvestorWinner({date:saved.date,session:saved.session,number:item.number},saved)!;
    assert.equal(winner.tier,tier);
    assert.equal(winner.betAmount,item.betAmount);
    assert.equal(winner.potentialPrize,item.betAmount!*80);
    saved.algorithmVersion="tiers-v1"; // A separately versioned historical tariff.
    item.betAmount=123; // Simulate a different historical tariff; never infer from tier.
    saved.prizeMultiplier=90;
    assert.equal(resolveInvestorWinner({date:saved.date,session:saved.session,number:item.number},saved)?.potentialPrize,11070);
    saved.prizeMultiplier=80;
  }
  const broken=structuredClone(saved); delete broken.investors[0][0].betAmount;
  assert.ok(validateAssignment(broken));
  const legacy=snapshot(rotateBlocks(pool,{date:saved.date,session:saved.session}).investors);
  assert.equal(resolveInvestorWinner({date:saved.date,session:saved.session,number:0},legacy)?.betAmount,undefined);
  assert.equal(assignmentInvestment(legacy.investors[0]),null);
});

test("unsupported quantities are rejected instead of changing quotas or inventing wagers", () => {
  for (const size of [0,17,53,63,69,80]) assert.throws(()=>distribute(pool.slice(0,size),[],true,"unpriced"),/64 y 68/);
});


test("calendar prizes start on October 2 without changing earlier winners", () => {
  const allocation = distribute(pool.slice(0,64),[],true,"rollout");
  for (const date of ["2026-10-01", "2026-10-02", "2026-10-03"]) {
    for (const session of ["dia", "noche"] as const) {
      const assignment: Assignment = {...snapshot(allocation.investors), ...allocation, smart:true, date, session, createdAt:`${date}T10:00:00Z`};
      const item = assignment.investors[0][0];
      const winner = resolveInvestorWinner({date,session,number:item.number},assignment)!;
      assert.equal(winner.name,"Lenin");
      assert.equal(winner.recorded,true);
      assert.equal(winner.group,item.source === "casa" ? "nosotros" : "inversionistas");
      if (date < "2026-10-02") {
        assert.equal(winner.betAmount,undefined);
        assert.equal(winner.potentialPrize,undefined);
        assert.equal(winner.tier,undefined);
      } else {
        assert.equal(winner.betAmount,item.betAmount);
        assert.equal(winner.potentialPrize,item.betAmount!*80);
        assert.equal(winner.tier,item.tier);
      }
    }
  }
});


test("hot candidates always come from Casa even when Respaldo ranks higher", () => {
  const selected=[...pool.slice(40,68),...pool.slice(0,40)];
  const result=distribute(selected,[],true,"source-ranked");
  assert.equal(result.algorithmVersion,smartDistributionVersion);
  result.investors.forEach(items => {
    assert.equal(items.filter(n=>n.tier==="hot").length,4);
    assert.ok(items.filter(n=>n.tier==="hot").every(n=>n.source==="casa"));
    assert.ok(items.filter(n=>n.tier==="remaining").every(n=>n.betAmount===500));
    assert.equal(assignmentInvestment(items),10150);
  });
});

test("impossible Casa quotas fail without assigning Respaldo as hot", () => {
  const selected=pool.slice(0,64);
  assert.throws(()=>distribute(selected,[snapshot([pool.slice(0,40),[],[],[]])],true,"all-house-blocked"),/4 calientes de Casa/);
  const insufficient=selected.map((n,i)=>({...n,source:(i<15?"casa":"respaldo") as AssignmentNumber["source"]}));
  assert.throws(()=>distribute(insufficient,[],true,"too-few-house"),/16 números elegibles de Casa/);
});

test("v2 saved assignments reject incorrect quotas, source or investment", () => {
  const allocation=distribute(pool.slice(0,64),[],true,"validate-v2");
  const saved:Assignment={...snapshot(allocation.investors),...allocation,smart:true};
  assert.equal(validateAssignment(saved),null);
  for (const change of ["tier","source","amount"] as const) {
    const broken=structuredClone(saved);
    const hot=broken.investors[0].find(n=>n.tier==="hot")!;
    if(change==="tier") hot.tier="remaining";
    if(change==="source") hot.source="respaldo";
    if(change==="amount") hot.betAmount=500;
    assert.ok(validateAssignment(broken));
  }
});


test("historical ice badges use only earlier results from the same session", () => {
  const target={date:"2026-10-02",session:"dia" as const,number:25};
  const irrelevant=[target,{...target,date:"2026-10-03"},{...target,date:"2026-10-01",session:"noche" as const}];
  assert.equal(numberDelayBadge(irrelevant,25,target),"🧊");
  for (const [date,badge] of [["2026-04-02","🧊"],["2026-04-03","❄️"],["2026-06-02","❄️"],["2026-06-03",""]]) {
    assert.equal(numberDelayBadge([{...target,date},...irrelevant],25,target),badge);
  }
  // The first win ends the delay for a later draw, never for itself.
  assert.equal(numberDelayBadge([{...target,date:"2026-04-02"},target],25,{...target,date:"2026-10-03"}),"");
});

test("calendar reconstructs legacy excluded and bank winners without modifying history", () => {
  const assignment:Assignment={...snapshot([[],[],[],[]]),smart:true,date:"2026-10-02",createdAt:"2026-10-02T10:00:00Z",roster:Array.from({length:100},(_,number)=>({number,group:number<40?"nosotros":number<80?"inversionistas":"banca"}))};
  const original=JSON.stringify(assignment);
  for (const number of [61,99]) {
    const draw={date:assignment.date,session:assignment.session,number};
    const results=[draw,{...draw,date:"2026-05-01"}];
    const winner=resolveInvestorWinner(draw,assignment,results)!;
    assert.equal(winner.delayBadge,"❄️");
    assert.equal(winner.name,null);
    assert.equal(winner.group,number===61?"inversionistas":"banca");
    assert.equal(winner.betAmount,undefined);
  }
  assert.equal(JSON.stringify(assignment),original);
});

test("saved ice classification survives later result corrections, including excluded winners", () => {
  const assignment:Assignment={...snapshot([[],[],[],[]]),smart:true,date:"2026-10-02",createdAt:"2026-10-02T10:00:00Z",roster:Array.from({length:100},(_,number)=>({number,group:number<40?"nosotros":number<80?"inversionistas":"banca",badge:number===61?"🧊":""}))};
  const saved:Assignment=JSON.parse(JSON.stringify(assignment));
  const draw={date:saved.date,session:saved.session,number:61};
  assert.equal(resolveInvestorWinner(draw,saved,[{...draw,date:"2026-10-01"}])?.delayBadge,"🧊");
  assert.equal(resolveInvestorWinner({...draw,number:62},saved,[])?.delayBadge,"");
});

test("assigned winners keep saved badges and missing snapshots can still report delay", () => {
  const assignment=snapshot(rotateBlocks(pool,{date:"2026-09-29",session:"dia"}).investors);
  assignment.investors[0][0]={...assignment.investors[0][0],badge:"❄️"};
  const draw={date:assignment.date,session:assignment.session,number:0};
  const winner=resolveInvestorWinner(draw,assignment,[{...draw,date:"2026-09-28"}])!;
  assert.equal(winner.delayBadge,"❄️");
  assert.equal(winner.name,"Lenin");
  assert.equal(winner.betAmount,undefined);
  assert.equal(resolveInvestorWinner(draw,null,[draw,{...draw,date:"2026-01-01"}])?.delayBadge,"🧊");
});

function rotationFixture(session: "dia" | "noche", tier: "hot" | "intermediate" | "remaining") {
  const eligible=pool.slice(0,68);
  const allocation=distribute(eligible,[],true,'rotation-source');
  const source:Assignment={...snapshot(allocation.investors),...allocation,smart:true,date:'2026-10-05',session,createdAt:'2026-10-05T10:00:00Z'};
  const winner=source.investors.flat().find(n=>n.tier===tier)!;
  return {eligible,source,winner,target:{date:'2026-10-06',session},draw:{date:'2026-10-05',session,number:winner.number}};
}
test('hot winner rotates down only in the next same session with two promotions',async()=>{
  const {winnerRotationContext}=await import('../lib/quinielon-distributor.ts');
  for(const session of ['dia','noche'] as const) {
    const f=rotationFixture(session,'hot');const before=JSON.stringify(f.source);
    const context=winnerRotationContext(f.target,f.source,f.draw);
    const result=distribute(f.eligible,[f.source],true,'rotation-next',context);
    const numbers=result.investors.flat();
    assert.equal(numbers.find(n=>n.number===f.winner.number)?.tier,'remaining');
    assert.equal(numbers.find(n=>n.number===f.winner.number)?.betAmount,500);
    assert.equal(result.winnerRotation?.changes.length,3);
    for(const change of result.winnerRotation!.changes) {
      assert.equal(f.source.investors.flat().find(n=>n.number===change.number)?.tier,change.from);
      assert.equal(numbers.find(n=>n.number===change.number)?.tier,change.to);
    }
    assert.equal(new Set(numbers.map(n=>n.number)).size,68);
    for(let i=0;i<4;i++) {
      assert.equal(result.investors[i].filter(n=>n.tier==='hot').length,4);
      assert.equal(result.investors[i].filter(n=>n.tier==='intermediate').length,5);
      assert.equal(assignmentInvestment(result.investors[i]),10150);
      assert.ok(result.investors[i].every(n=>!f.source.investors[i].some(p=>p.number===n.number)));
    }
    const saved:Assignment={...f.source,...f.target,...result,createdAt:'2026-10-06T10:00:00Z'};
    assert.equal(validateAssignment(saved),null);
    assert.equal(JSON.stringify(f.source),before);
    assert.deepEqual(result,distribute(f.eligible,[f.source],true,'rotation-next',context));
  }
});
test('intermediate winner swaps with a remaining number and keeps minimum stake',async()=>{
  const {winnerRotationContext}=await import('../lib/quinielon-distributor.ts');
  const f=rotationFixture('dia','intermediate');
  const result=distribute(f.eligible,[f.source],true,'rotation-intermediate',winnerRotationContext(f.target,f.source,f.draw));
  assert.equal(result.winnerRotation?.changes.length,2);
  assert.equal(result.investors.flat().find(n=>n.number===f.winner.number)?.betAmount,500);
  assert.equal(result.winnerRotation?.changes[1].from,'remaining');
  assert.equal(result.winnerRotation?.changes[1].to,'intermediate');
});
test('other sessions, older results, remaining winners and absent snapshots do not trigger rotation',async()=>{
  const {winnerRotationContext}=await import('../lib/quinielon-distributor.ts');
  const f=rotationFixture('dia','hot');
  assert.equal(winnerRotationContext({...f.target,session:'noche'},f.source,f.draw),undefined);
  assert.equal(winnerRotationContext(f.target,f.source,{...f.draw,date:'2026-10-04'}),undefined);
  assert.equal(winnerRotationContext(f.target,null,f.draw),undefined);
  const remaining=rotationFixture('dia','remaining');
  assert.equal(winnerRotationContext(remaining.target,remaining.source,remaining.draw),undefined);
});
test('rotation fails closed if winner is removed and validates saved demotion metadata',async()=>{
  const {winnerRotationContext}=await import('../lib/quinielon-distributor.ts');
  const f=rotationFixture('dia','hot');const context=winnerRotationContext(f.target,f.source,f.draw);
  assert.throws(()=>distribute(f.eligible.filter(n=>n.number!==f.winner.number),[f.source],true,'missing-winner',context),/permanecer/);
  const result=distribute(f.eligible,[f.source],true,'rotation-validation',context);
  const saved:Assignment={...f.source,...f.target,...result,createdAt:'2026-10-06T10:00:00Z'};
  saved.winnerRotation!.session='noche';assert.match(validateAssignment(saved)!,/fuera de la tanda/);
  saved.winnerRotation!.session='dia';saved.winnerRotation!.changes[0].to='intermediate';assert.match(validateAssignment(saved)!,/inválida/);
});
test('winner demotion and promotions survive the relaxed allocation fallback',async()=>{
  const {winnerRotationContext}=await import('../lib/quinielon-distributor.ts');
  const f=rotationFixture('dia','hot');
  const context=winnerRotationContext(f.target,f.source,f.draw);
  // Block every previously hot number plus the promoted candidate for one investor.
  const blocked=snapshot([f.source.investors.flat().filter(n=>n.tier==='hot'||n.number===16),[],[],[]]);
  const result=distribute(f.eligible,[blocked],true,'rotation-fallback',context);
  for(const change of result.winnerRotation!.changes) assert.equal(result.investors.flat().find(n=>n.number===change.number)?.tier,change.to);
  for(const items of result.investors) {
    assert.equal(items.filter(n=>n.tier==='hot').length,4);
    assert.ok(items.filter(n=>n.tier==='hot').every(n=>n.source==='casa'));
    assert.equal(assignmentInvestment(items),10150);
  }
});
