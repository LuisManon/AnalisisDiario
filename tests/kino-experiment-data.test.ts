import assert from "node:assert/strict";
import test from "node:test";
import { prepareKinoExperimentData, priorDraws } from "../lib/kino-experiment-data.ts";

const fixture = (count = 50) => Array.from({ length: count }, (_, index) => ({
  date: new Date(Date.UTC(2026, 8, 15 + index)).toISOString().slice(0, 10),
  numbers: Array.from({ length: 20 }, (_, n) => n + 1),
  source: "https://example.com/kino",
}));
const cutoff = "2026-11-03";

test("84-number snapshot partitions chronologically without changing input", () => {
  const input = fixture().reverse();
  const before = JSON.stringify(input);
  const data = prepareKinoExperimentData(input, { cutoff });
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual([data.warmup.length, data.validation.length, data.holdout.length], [30, 10, 10]);
  assert.equal(data.dates.warmup[0], "2026-09-15");
  assert.ok(data.dates.warmup.at(-1)! < data.dates.validation[0]);
  assert.ok(data.dates.validation.at(-1)! < data.dates.holdout[0]);
  assert.equal(data.metadata.lastDate, cutoff);
});

test("cutoff and era filtering exclude old and future records", () => {
  const input = fixture(55);
  input.push({ ...input[0], date: "2026-09-14" });
  const data = prepareKinoExperimentData(input, { cutoff });
  assert.equal(data.draws.length, 50);
  assert.ok(data.draws.every(draw => draw.date >= "2026-09-15" && draw.date <= cutoff));
});

test("canonical snapshot hash is independent of input and number ordering", () => {
  const original = prepareKinoExperimentData(fixture(), { cutoff });
  const reordered = fixture().reverse().map(draw => ({ ...draw, numbers: draw.numbers.reverse() }));
  assert.equal(prepareKinoExperimentData(reordered, { cutoff }).sha256, original.sha256);
  const changed = fixture();
  changed[0].numbers[19] = 84;
  assert.notEqual(prepareKinoExperimentData(changed, { cutoff }).sha256, original.sha256);
});

test("walk-forward excludes same-date and future results and returns detached draws", () => {
  const data = prepareKinoExperimentData(fixture(), { cutoff });
  const target = data.validation[0].date;
  const prior = priorDraws(data, target);
  assert.equal(prior.length, 30);
  assert.ok(prior.every(draw => draw.date < target));
  prior[0].numbers[0] = 84;
  assert.equal(data.draws[0].numbers[0], 1);
  assert.equal(priorDraws(data, "2026-09-15").length, 0);
  assert.throws(() => priorDraws(data, "2026-02-30"));
  assert.throws(() => priorDraws(data, "2026-11-04"), /cutoff/);
});

test("rejects duplicate dates, invalid results, invalid cutoff and insufficient holdout", () => {
  const input = fixture();
  assert.throws(() => prepareKinoExperimentData([...input, input[0]], { cutoff }), /duplicada/);
  assert.throws(() => prepareKinoExperimentData([{ ...input[0], date: "2026-02-30" }, ...input], { cutoff }));
  assert.throws(() => prepareKinoExperimentData([{ ...input[0], numbers: Array(20).fill(1) }, ...input.slice(1)], { cutoff }));
  assert.throws(() => prepareKinoExperimentData(input, { cutoff: "" }));
  assert.throws(() => prepareKinoExperimentData(input, { cutoff: "2026-09-14" }));
  assert.throws(() => prepareKinoExperimentData(input, { cutoff: "2999-01-01" }), /futuro/);
  assert.throws(() => prepareKinoExperimentData(fixture(44), { cutoff }), /5 sorteos/);
  assert.throws(() => prepareKinoExperimentData(input, { cutoff, warmup: 0 }));
  assert.throws(() => prepareKinoExperimentData(input, { cutoff, validationCount: 1.5 }));
});
