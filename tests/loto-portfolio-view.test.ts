import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { buildLotoPortfolioView } from "../lib/loto-portfolio-view.ts";
import { summarizeThirtyPlayPrizes } from "../lib/game.ts";
import type { ThirtyPlayPortfolio, DrawResult } from "../lib/types.ts";

const saved: ThirtyPlayPortfolio[] = JSON.parse(fs.readFileSync(new URL("../data/portfolio-history.json", import.meta.url), "utf8"));
const results: DrawResult[] = JSON.parse(fs.readFileSync(new URL("../data/results.json", import.meta.url), "utf8"));
test("one set of saved portfolios serves current, previous and both weekly prizes without mutation", () => {
  const before = JSON.stringify({ saved, results });
  const current = saved.find(p => p.targetDate === "2026-11-21")!;
  assert.ok(current);
  const view = buildLotoPortfolioView(saved, results, current.targetDate, "2026-11-21");
  assert.equal(view.current, current);
  assert.deepEqual(view.calendar.map(c => c.date), ["2026-11-18", "2026-11-21"]);
  for (const row of view.calendar) {
    const portfolio = saved.find(p => p.targetDate === row.date), draw = results.find(d => d.date === row.date);
    assert.deepEqual(row.summary, portfolio && draw ? summarizeThirtyPlayPrizes(portfolio, draw) : null);
  }
  assert.equal(JSON.stringify({ saved, results }), before);
});
test("an absent portfolio remains absent on non-draw days and pending weeks", () => {
  const view = buildLotoPortfolioView([], results, "2026-11-25", "2026-11-23");
  assert.equal(view.current, null); assert.equal(view.previous, null);
  assert.deepEqual(view.calendar.map(c => c.date), ["2026-11-25", "2026-11-28"]);
  assert.ok(view.calendar.every(c => c.summary === null && c.status === "pending"));
});
