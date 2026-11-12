import assert from "node:assert/strict";
import { test } from "node:test";
import { lotoPortfolioDisplayDate } from "../lib/loto-portfolio-date.ts";
import { canGenerateLotoPortfolio } from "../lib/draw-schedule.ts";

const prior = [{ date: "2026-11-07" }];
test("Wednesday's saved portfolio stays selected after generation closes and while results are pending", () => {
  for (const time of ["16:59", "17:00", "19:52", "21:30", "23:59"]) {
    const now = new Date(`2026-11-11T${time}:00-04:00`);
    assert.equal(lotoPortfolioDisplayDate(prior, now), "2026-11-11");
    if (time >= "17:00") assert.equal(canGenerateLotoPortfolio("2026-11-11", now), false);
  }
});
test("the published outcome advances the display to Saturday without changing the saved portfolio", () => {
  const results = [{ date: "2026-11-11" }, ...prior];
  const before = JSON.stringify(results);
  assert.equal(lotoPortfolioDisplayDate(results, new Date("2026-11-11T21:30:00-04:00")), "2026-11-14");
  assert.equal(JSON.stringify(results), before);
});
test("Saturday stays selected after cutoff; non-draw days select the next draw", () => {
  assert.equal(lotoPortfolioDisplayDate(prior, new Date("2026-11-14T20:00:00-04:00")), "2026-11-14");
  assert.equal(lotoPortfolioDisplayDate(prior, new Date("2026-11-12T10:00:00-04:00")), "2026-11-14");
  assert.equal(lotoPortfolioDisplayDate(prior, new Date("2026-11-15T10:00:00-04:00")), "2026-11-18");
});
test("display selection uses Dominican dates even after UTC midnight", () => {
  assert.equal(lotoPortfolioDisplayDate(prior, new Date("2026-11-12T02:30:00Z")), "2026-11-11");
});
