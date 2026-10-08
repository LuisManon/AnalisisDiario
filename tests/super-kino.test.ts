import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { buildKinoPlays, kinoDrawSchema, kinoStats, kinoGroups, kinoPrize, kinoQuickHotStats, parseKinoArchive, KINO_ANALYSIS_START } from "../lib/super-kino.ts";
const draws=kinoDrawSchema.array().parse(JSON.parse(fs.readFileSync(new URL('../data/super-kino-results.json',import.meta.url),'utf8')));
const sample=draws.filter(d=>d.date>=KINO_ANALYSIS_START);
test('archive dates and twenty distinct numbers are valid',()=>{assert.equal(new Set(draws.map(d=>d.date)).size,draws.length);assert.ok(draws.some(d=>d.date==='2026-10-05'));assert.ok(sample.length>=21);assert.equal(kinoDrawSchema.safeParse({...draws[0],numbers:Array(20).fill(1)}).success,false);});
test('frequency accounts for every ball and absent numbers',()=>{const stats=kinoStats([draws[0]]);assert.equal(stats.reduce((sum,s)=>sum+s.count,0),20);assert.equal(stats.find(s=>s.number===draws[0].numbers[0])?.gap,0);assert.equal(stats.filter(s=>s.lastDate===null).length,64);assert.equal(kinoStats([]).length,84);});
test('ten distinct reproducible exploratory plays respect group quotas',()=>{const plays=buildKinoPlays(sample);const groups=kinoGroups(sample);assert.equal(plays.length,10);assert.equal(new Set(plays.map(p=>p.numbers.join(','))).size,10);assert.deepEqual(plays,buildKinoPlays([...sample].reverse()));for(const p of plays){assert.equal(new Set(p.numbers).size,10);assert.ok(p.numbers.every(n=>n>=1&&n<=84));assert.equal(p.numbers.filter(n=>groups.hot.some(s=>s.number===n)).length,p.hot);assert.equal(p.numbers.filter(n=>groups.cold.some(s=>s.number===n)).length,p.cold);}assert.deepEqual(buildKinoPlays([]),[]);});
test('one hundred twenty exploratory plays remain distinct with thirty quick-hot reinforcements',()=>{const quick=kinoQuickHotStats(sample);const plays=buildKinoPlays(sample,'exploratoria',undefined,120,quick.map(item=>item.number),30);const quickSet=new Set(quick.map(item=>item.number));assert.equal(plays.length,120);assert.equal(new Set(plays.map(p=>p.numbers.join(','))).size,120);assert.deepEqual(plays.map(p=>p.id),Array.from({length:120},(_,index)=>index+1));assert.equal(plays.filter(p=>p.quickHot).length,30);assert.ok(plays.filter(p=>p.quickHot).every(p=>p.numbers.filter(number=>quickSet.has(number)).length===3));assert.ok(plays.every(p=>p.profile==='exploratoria'&&p.hot===3&&p.middle===3&&p.cold===4));});
test('parser rejects missing and duplicate balls',()=>{const row=(nums:number[])=>`<tr><td><a href="/resultados/2026-10-05/">Date</a></td><td class="lad-t-kino">${nums.map(n=>`<span class="b">${n}</span>`).join('')}</td></tr>`;assert.equal(parseKinoArchive(row(draws[0].numbers),draws[0].source)[0].date,'2026-10-05');assert.throws(()=>parseKinoArchive(row(Array(20).fill(1)),draws[0].source));assert.throws(()=>parseKinoArchive('<html>Error</html>',draws[0].source));});
test('official prizes include zero hits and revised nine-hit prize',()=>{assert.equal(kinoPrize(0),80);assert.equal(kinoPrize(9),200000);assert.equal(kinoPrize(10),25000000);assert.equal(kinoPrize(4),0);});
test('saved portfolios accept legacy profiles and keep the current one fully exploratory',async()=>{
  const {kinoSnapshotSchema}=await import('../lib/super-kino.ts');
  const snapshots=kinoSnapshotSchema.array().parse(JSON.parse(fs.readFileSync(new URL('../data/super-kino-portfolio-history.json',import.meta.url),'utf8')));
  assert.equal(snapshots[0].algorithm,'kino-v5');
  assert.equal(snapshots[0].plays.filter(play=>play.profile==='exploratoria').length,120);
  assert.equal(snapshots[0].plays.filter(play=>play.quickHot).length,30);
  assert.ok(snapshots.some(snapshot=>snapshot.algorithm==='kino-v2'));
});
test('weekly prize summary groups winning plays by amount without exposing numbers',async()=>{
  const {kinoSnapshotSchema,summarizeKinoPrizes}=await import('../lib/super-kino.ts');
  const snapshots=kinoSnapshotSchema.array().parse(JSON.parse(fs.readFileSync(new URL('../data/super-kino-portfolio-history.json',import.meta.url),'utf8')));
  const snapshot=snapshots.find(item=>item.targetDate==='2026-10-06');
  const draw=draws.find(item=>item.date==='2026-10-06');
  assert.ok(snapshot&&draw);
  assert.deepEqual(summarizeKinoPrizes(snapshot,draw),{groups:[{amount:80,count:3,total:240}],winningPlays:3,total:240});
});

test('full year includes every published date and documents no-draw days',async()=>{
  const {kinoDates,isKinoNoDraw,kinoYearStart}=await import('../lib/super-kino-clock.ts');
  const known=new Set(draws.map(d=>d.date));
  assert.deepEqual(kinoDates('2025-10-06','2026-10-05').filter(date=>!known.has(date)&&!isKinoNoDraw(date)),[]);
  assert.equal(draws.filter(d=>d.date>='2025-10-06'&&d.date<='2026-10-05').length,355);
  assert.equal(kinoYearStart('2024-02-29'),'2023-02-28');
});
test('new portfolio contains 120 unique exploratory plays with at least 25 percent quick-hot',async()=>{
  const {buildKinoSnapshot,formatKinoPortfolioText,getKinoStaleNumbers}=await import('../lib/super-kino.ts');
  const snapshot=buildKinoSnapshot(draws,'2026-10-06',new Date('2026-10-06T16:00:00Z'));
  assert.equal(snapshot.algorithm,'kino-v5');
  assert.equal(snapshot.delayCutoff,'2026-09-06');
  assert.deepEqual(snapshot.excludedByDelay,[]);
  assert.deepEqual(getKinoStaleNumbers(draws,'2026-10-06'),[]);
  assert.equal(snapshot.plays.length,120);
  assert.equal(new Set(snapshot.plays.map(p=>p.numbers.join(','))).size,120);
  assert.deepEqual(snapshot.plays.map(play=>play.id),Array.from({length:120},(_,index)=>index+1));
  assert.ok(snapshot.plays.every(play=>play.profile==='exploratoria'));
  for(const play of snapshot.plays) assert.deepEqual([play.hot,play.middle,play.cold],[3,3,4]);
  assert.ok(snapshot.quickHotNumbers&&snapshot.quickHotNumbers.length>=3);
  assert.ok(snapshot.quickHotNumbers.every(item=>item.averageInterval>=1&&item.averageInterval<=2&&item.recentIntervals.length===3));
  const quickSet=new Set(snapshot.quickHotNumbers.map(item=>item.number));
  const reinforced=snapshot.plays.filter(play=>play.quickHot);
  assert.equal(reinforced.length,30);
  assert.ok(reinforced.every(play=>play.numbers.filter(number=>quickSet.has(number)).length===3));
  const text=formatKinoPortfolioText(snapshot);
  const playLines=text.split('\n').filter(line=>/^\d{3} \[/.test(line));
  assert.equal(playLines.length,120);
  assert.equal(playLines.filter(line=>line.includes('[RÁPIDA 1–2]')).length,30);
  assert.match(text,/120 JUGADAS EXPLORATORIAS/);
});
test('calendar-month cutoff handles short months and keeps numbers seen on the boundary',async()=>{
  const {getKinoStaleNumbers,kinoOneMonthCutoff}=await import('../lib/super-kino.ts');
  assert.equal(kinoOneMonthCutoff('2024-03-31'),'2024-02-29');
  assert.equal(kinoOneMonthCutoff('2026-03-31'),'2026-02-28');
  const boundaryDraw={...draws[0],date:'2026-09-06',numbers:Array.from({length:20},(_,index)=>index+1)};
  const stale=getKinoStaleNumbers([boundaryDraw],'2026-10-06');
  assert.equal(stale.some(item=>item.number===1),false);
  assert.deepEqual(stale.find(item=>item.number===21),{number:21,lastDate:null});
});
test('numbers older than one month are excluded from every generated play',async()=>{
  const {buildKinoSnapshot,kinoSnapshotSchema}=await import('../lib/super-kino.ts');
  const withoutRecent84=draws.map(draw=>{
    if(draw.date<'2026-09-06'||draw.date>='2026-10-06'||!draw.numbers.includes(84)) return draw;
    const replacement=Array.from({length:83},(_,index)=>index+1).find(number=>!draw.numbers.includes(number));
    assert.ok(replacement);
    return {...draw,numbers:draw.numbers.map(number=>number===84?replacement:number)};
  });
  const snapshot=buildKinoSnapshot(withoutRecent84,'2026-10-06',new Date('2026-10-06T16:00:00Z'));
  assert.deepEqual(snapshot.excludedByDelay,[{number:84,lastDate:null}]);
  assert.equal(snapshot.plays.some(play=>play.numbers.includes(84)),false);
  assert.equal(kinoSnapshotSchema.safeParse({...snapshot,plays:snapshot.plays.map((play,index)=>index?play:{...play,numbers:[...play.numbers.slice(0,9),84].sort((a,b)=>a-b)})}).success,false);
});
test('snapshot rejects late creation and excludes target and future outcomes',async()=>{
  const {buildKinoSnapshot}=await import('../lib/super-kino.ts');
  const now=new Date('2026-10-06T16:00:00Z');
  const original=buildKinoSnapshot(draws,'2026-10-06',now);
  const changed=buildKinoSnapshot([...draws,{...draws[0],date:'2026-10-06'},{...draws[0],date:'2026-10-07'}],'2026-10-06',now);
  assert.deepEqual(original,changed);
  assert.throws(()=>buildKinoSnapshot(draws,'2026-10-06',new Date('2026-10-07T00:55:00Z')));
});
test('award totals use saved plays and saved prizes, including zero hits',async()=>{
  const {buildKinoSnapshot,evaluateKinoSnapshot}=await import('../lib/super-kino.ts');
  const snapshot=buildKinoSnapshot(draws,'2026-10-06',new Date('2026-10-06T16:00:00Z'));
  const target=snapshot.plays[0];
  const other=Array.from({length:84},(_,i)=>i+1).filter(n=>!target.numbers.includes(n));
  const draw={...draws[0],date:'2026-10-06',numbers:[...target.numbers,...other.slice(0,10)]};
  const before=JSON.stringify(snapshot);
  const result=evaluateKinoSnapshot(snapshot,draw);
  assert.equal(result[0].plays[0].hits,10);assert.equal(result[0].plays[0].prize,25000000);
  assert.equal(result.length,1);assert.equal(result[0].profile,'exploratoria');assert.equal(result[0].cost,3000);
  assert.equal(result[0].net,result[0].total-3000);
  assert.equal(evaluateKinoSnapshot(snapshot,{...draw,numbers:other.slice(0,20)})[0].plays[0].prize,80);
  assert.equal(JSON.stringify(snapshot),before);
  assert.throws(()=>evaluateKinoSnapshot(snapshot,{...draw,date:'2026-10-07'}));
});
test('Dominican polling and closure boundaries work across midnight and Sundays',async()=>{
  const {kinoExpectedDate,kinoTargetDate}=await import('../lib/super-kino-clock.ts');
  assert.equal(kinoExpectedDate(new Date('2026-10-07T00:59:59Z')),'2026-10-05');
  assert.equal(kinoExpectedDate(new Date('2026-10-07T01:00:00Z')),'2026-10-06');
  assert.equal(kinoExpectedDate(new Date('2026-10-07T04:01:00Z')),'2026-10-06');
  assert.equal(kinoExpectedDate(new Date('2026-10-04T19:59:59Z')),'2026-10-03');
  assert.equal(kinoExpectedDate(new Date('2026-10-04T20:00:00Z')),'2026-10-04');
  assert.equal(kinoTargetDate(new Date('2026-10-07T00:54:00Z')),'2026-10-06');
  assert.equal(kinoTargetDate(new Date('2026-10-07T00:55:00Z')),'2026-10-07');
});
test('a malformed historical row cannot discard its valid neighbors',async()=>{
  const {parseEnloteriaKino}=await import('../lib/remote-super-kino.ts');
  const html=`Resultados de Super Kino TV del 18 de noviembre de 2025. Números ganadores: ${Array(20).fill(70).join(', ')}. Resultados de Super Kino TV del 19 de noviembre de 2025. Números ganadores: ${draws[0].numbers.join(', ')}.`;
  const parsed=parseEnloteriaKino(html,draws[0].source);assert.equal(parsed.length,1);assert.equal(parsed[0].date,'2025-11-19');
});
