import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { buildPlusOrder, buildThirtyPlayPortfolio, summarizeThirtyPlayPrizes, thirtyPlayAlgorithmVersion } from "../lib/game.ts";
import type { DrawResult } from "../lib/types.ts";

const results = JSON.parse(fs.readFileSync(new URL("../data/results.json", import.meta.url), "utf8")) as DrawResult[];

test("the top five Mas numbers are distributed exactly six times across thirty plays", () => {
  const targetDate = "2026-10-10";
  const prior = results.filter((draw) => draw.date < targetDate).sort((a, b) => b.date.localeCompare(a.date));
  const portfolio = buildThirtyPlayPortfolio(results, targetDate);
  const expected = buildPlusOrder(prior.filter(draw=>draw.day===portfolio.targetDay)).slice(0, 5);
  assert.deepEqual(buildPlusOrder(prior),buildPlusOrder([...prior].reverse()));
  assert.equal(portfolio.algorithmVersion, thirtyPlayAlgorithmVersion);
  assert.deepEqual(portfolio.plusTopFive, expected);
  assert.equal(portfolio.plays.length, 30);
  assert.deepEqual([...new Set(portfolio.plays.map((play) => play.plus))].sort((a, b) => a - b), [...expected].sort((a, b) => a - b));
  for (const plus of expected) assert.equal(portfolio.plays.filter((play) => play.plus === plus).length, 6);
});

test("the Loto Mas calendar summary uses the frozen thirty plays", () => {
  const portfolio = buildThirtyPlayPortfolio(results, "2026-10-10");
  const first = portfolio.plays[0];
  const draw: DrawResult = {date:portfolio.targetDate,day:portfolio.targetDay,numbers:first.numbers,plus:first.plus};
  const summary = summarizeThirtyPlayPrizes(portfolio, draw);
  assert.ok(summary.winningPlays >= 1);
  assert.ok(summary.total >= 150_000_000);
  assert.ok(summary.groups.some(group => group.matches === 6 && group.plusMatched && group.amount === 150_000_000));
  assert.throws(() => summarizeThirtyPlayPrizes(portfolio, {...draw,date:"2026-10-11"}));
});

test("independent-day portfolios ignore opposite-day and target/future outcomes",()=>{
  const target="2026-10-10",input=results.filter(d=>d.date<target),before=JSON.stringify(input);
  const a=buildThirtyPlayPortfolio(input,target);
  const b=buildThirtyPlayPortfolio(input.filter(d=>d.day==="sabado"),target);
  const c=buildThirtyPlayPortfolio(results,target);
  assert.deepEqual(a.plays,b.plays);assert.deepEqual(a.plays,c.plays);
  assert.deepEqual(a.plusTopFive,b.plusTopFive);
  assert.ok(a.plays.every(p=>p.scope==="mismo-dia"));
  assert.equal(new Set(a.plays.map(p=>p.numbers.join(","))).size,30);
  assert.ok(a.exposure.every(item=>item.count<=9));
  for(let position=0;position<6;position++)for(let number=1;number<=40;number++)assert.ok(a.plays.filter(p=>p.numbers[position]===number).length<=6);
  for(const profile of ["fuerte","equilibrada","exploratoria"])assert.equal(a.plays.filter(p=>p.profile===profile).length,10);
  assert.equal(JSON.stringify(input),before);
});
