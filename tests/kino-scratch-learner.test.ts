import assert from "node:assert/strict";
import { test } from "node:test";
import { scratchRandom, scratchSample, newScratchModel, newScratchContext, scratchWeights, scratchLearn, scratchObserve, evaluateScratch, scratchExactTicket } from "../lib/kino-scratch-learner.ts";

test("standalone generator reproduces unique10 selections and20 draws in1..84", () => {
  const a = scratchRandom("A"), b = scratchRandom("A");
  for (let i = 0; i < 100; i++) {
    assert.equal(a(), b());
    const numbers = scratchSample(a, 20); scratchSample(b, 20);
    assert.equal(new Set(numbers).size, 20); assert.ok(numbers.every(n => n >= 1 && n <= 84));
  }
  assert.throws(() => scratchSample(a, 85)); assert.throws(() => scratchSample(a, 10, Array(84).fill(0)));
});
test("initial model is uniform and observes only preceding outcomes", () => {
  const model = newScratchModel(0.01), ctx = newScratchContext(), before = scratchWeights(model, ctx);
  assert.deepEqual(before, Array(84).fill(1));
  const winner = Array.from({ length: 20 }, (_, i) => i + 1);
  const forecast = scratchSample(scratchRandom("before"), 10, before);
  scratchLearn(model, ctx, winner); scratchObserve(ctx, winner);
  assert.equal(model.steps, 1); assert.equal(ctx.draws, 1); assert.equal(ctx.gap[0], 0); assert.equal(ctx.gap[50], 1);
  assert.deepEqual(forecast, scratchSample(scratchRandom("before"), 10, before));
  assert.throws(() => scratchLearn(model, ctx, Array(20).fill(1)));
});
test("evaluation freezes weights, reproduces results and matches the uniform exact mean", () => {
  const model = newScratchModel(0.01), before = JSON.stringify(model);
  const result = evaluateScratch([model], 10000, "heldout");
  assert.equal(JSON.stringify(model), before); assert.deepEqual(result, evaluateScratch([model], 10000, "heldout"));
  assert.ok(Math.abs(result.models[0].meanHits - 200 / 84) < 0.08);
  const exact = scratchExactTicket();
  assert.ok(Math.abs(exact.reduce((s, p) => s + p, 0) - 1) < 1e-12);
  assert.ok(Math.abs(exact.reduce((s, p, k) => s + p * k, 0) - 200 / 84) < 1e-12);
});
test("full-outcome feedback can learn a deliberately injected stable bias", () => {
  const model = newScratchModel(0.01), ctx = newScratchContext(), random = scratchRandom("positive-training");
  const weights = Array.from({ length: 84 }, (_, i) => i < 10 ? 2 : 1);
  for (let t = 0; t < 10000; t++) { const draw = scratchSample(random, 20, weights); scratchLearn(model, ctx, draw); scratchObserve(ctx, draw); }
  const mean = (values: number[]) => values.reduce((s, n) => s + n, 0) / values.length;
  assert.ok(mean(model.bias.slice(0, 10)) > mean(model.bias.slice(10)) + 0.2);
  const evaluated = evaluateScratch([model], 10000, "positive-evaluation", weights);
  assert.ok(evaluated.versusUniform[0].difference > 0.05);
});
