import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { buildHundredPlayExploratoryPortfolio, buildPlusOrder, buildThirtyPlayPortfolio, hundredPlayExploratoryAlgorithmVersion, summarizeHundredPlayExploratoryPrizes, summarizeThirtyPlayPrizes, thirtyPlayAlgorithmVersion } from "../lib/game.ts";
import type { DrawResult } from "../lib/types.ts";

const results = JSON.parse(fs.readFileSync(new URL("../data/results.json", import.meta.url), "utf8")) as DrawResult[];

test("the top five Mas numbers are distributed exactly six times across thirty plays", () => {
  const targetDate = "2026-10-10";
  const prior = results.filter((draw) => draw.date < targetDate).sort((a, b) => b.date.localeCompare(a.date));
  const portfolio = buildThirtyPlayPortfolio(results, targetDate);
  const expected = buildPlusOrder(prior).slice(0, 5);
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

test("the hidden exploratory test freezes one hundred unique plays for the target draw", () => {
  const portfolio = buildHundredPlayExploratoryPortfolio(results, "2026-10-10");
  const keys = new Set(portfolio.plays.map((play) => play.numbers.join("-")));
  assert.equal(portfolio.algorithmVersion, hundredPlayExploratoryAlgorithmVersion);
  assert.equal(portfolio.targetDay, "sabado");
  assert.equal(portfolio.plays.length, 100);
  assert.equal(keys.size, 100);
  assert.deepEqual([...new Set(portfolio.plays.map((play) => play.plus))].sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));

  const first = portfolio.plays[0];
  const draw: DrawResult = { date: portfolio.targetDate, day: portfolio.targetDay, numbers: first.numbers, plus: first.plus };
  const summary = summarizeHundredPlayExploratoryPrizes(portfolio, draw);
  assert.ok(summary.winningPlays >= 1);
  assert.ok(summary.groups.some((group) => group.matches === 6 && group.plusMatched && group.amount === 150_000_000));
});
