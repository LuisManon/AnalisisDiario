import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { buildKinoPlays, kinoDrawSchema, kinoStats, kinoGroups, kinoPrize, parseKinoArchive, KINO_ANALYSIS_START } from "../lib/super-kino.ts";
const draws=kinoDrawSchema.array().parse(JSON.parse(fs.readFileSync(new URL('../data/super-kino-results.json',import.meta.url),'utf8')));
const sample=draws.filter(d=>d.date>=KINO_ANALYSIS_START);
test('archive dates and twenty distinct numbers are valid',()=>{assert.equal(new Set(draws.map(d=>d.date)).size,draws.length);assert.ok(draws.some(d=>d.date==='2026-10-05'));assert.ok(sample.length>=21);assert.equal(kinoDrawSchema.safeParse({...draws[0],numbers:Array(20).fill(1)}).success,false);});
test('frequency accounts for every ball and absent numbers',()=>{const stats=kinoStats([draws[0]]);assert.equal(stats.reduce((sum,s)=>sum+s.count,0),20);assert.equal(stats.find(s=>s.number===draws[0].numbers[0])?.gap,0);assert.equal(stats.filter(s=>s.lastDate===null).length,64);assert.equal(kinoStats([]).length,84);});
test('ten distinct reproducible exploratory plays respect group quotas',()=>{const plays=buildKinoPlays(sample);const groups=kinoGroups(sample);assert.equal(plays.length,10);assert.equal(new Set(plays.map(p=>p.numbers.join(','))).size,10);assert.deepEqual(plays,buildKinoPlays([...sample].reverse()));for(const p of plays){assert.equal(new Set(p.numbers).size,10);assert.ok(p.numbers.every(n=>n>=1&&n<=84));assert.equal(p.numbers.filter(n=>groups.hot.some(s=>s.number===n)).length,p.hot);assert.equal(p.numbers.filter(n=>groups.cold.some(s=>s.number===n)).length,p.cold);}assert.deepEqual(buildKinoPlays([]),[]);});
test('parser rejects missing and duplicate balls',()=>{const row=(nums:number[])=>`<tr><td><a href="/resultados/2026-10-05/">Date</a></td><td class="lad-t-kino">${nums.map(n=>`<span class="b">${n}</span>`).join('')}</td></tr>`;assert.equal(parseKinoArchive(row(draws[0].numbers),draws[0].source)[0].date,'2026-10-05');assert.throws(()=>parseKinoArchive(row(Array(20).fill(1)),draws[0].source));assert.throws(()=>parseKinoArchive('<html>Error</html>',draws[0].source));});
test('official prizes include zero hits and revised nine-hit prize',()=>{assert.equal(kinoPrize(0),80);assert.equal(kinoPrize(9),200000);assert.equal(kinoPrize(10),25000000);assert.equal(kinoPrize(4),0);});

test('full year includes every published date and documents no-draw days',async()=>{
  const {kinoDates,isKinoNoDraw,kinoYearStart}=await import('../lib/super-kino-clock.ts');
  const known=new Set(draws.map(d=>d.date));
  assert.deepEqual(kinoDates('2025-10-06','2026-10-05').filter(date=>!known.has(date)&&!isKinoNoDraw(date)),[]);
  assert.equal(draws.filter(d=>d.date>='2025-10-06'&&d.date<='2026-10-05').length,355);
  assert.equal(kinoYearStart('2024-02-29'),'2023-02-28');
});
test('three profiles have unique plays and different compositions',async()=>{
  const {buildKinoSnapshot,kinoProfiles}=await import('../lib/super-kino.ts');
  const snapshot=buildKinoSnapshot(draws,'2026-10-06',new Date('2026-10-06T16:00:00Z'));
  assert.equal(snapshot.plays.length,30);
  assert.equal(new Set(snapshot.plays.map(p=>p.numbers.join(','))).size,30);
  for(const profile of kinoProfiles) {
    const plays=snapshot.plays.filter(p=>p.profile===profile);
    assert.equal(plays.length,10);
    const mix=profile==='fuerte'?[7,2,1]:profile==='equilibrada'?[4,4,2]:[3,3,4];
    for(const p of plays) assert.deepEqual([p.hot,p.middle,p.cold],mix);
  }
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
  assert.equal(result[0].net,result[0].total-250);
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
