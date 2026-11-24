import assert from "node:assert/strict";
import { test } from "node:test";
const { onlyRuntimeData, shouldSkipDeployment } = await import(new URL("../scripts/ignore-data-deployment.mjs", import.meta.url).href);
const env = { VERCEL_ENV: "production", VERCEL_GIT_PREVIOUS_SHA: "a".repeat(40), GITHUB_TOKEN: "fixture", GITHUB_REPOSITORY: "fixture/repo" };
test("only runtime records skip a production build; compiled calendars and mixed code changes build", () => {
  assert.equal(onlyRuntimeData(["data/results.json", "data/public-portfolios/kino.json", "data/super-kino-portfolios/2026-11-23.json"]), true);
  for (const files of [[], ["data/super-kino-no-draws.json"], ["app/page.tsx", "data/results.json"], ["vercel.json"], ["data/new-unknown.json"]]) assert.equal(onlyRuntimeData(files), false);
  assert.equal(shouldSkipDeployment(env, (args: string[]) => args.includes("--diff-filter=D") ? "" : "data/results.json\0"), true);
  assert.equal(shouldSkipDeployment(env, () => "data/results.json"), false);
  for (const overrides of [{ VERCEL_ENV: "preview" }, { VERCEL_GIT_PREVIOUS_SHA: "" }, { GITHUB_TOKEN: "" }]) assert.equal(shouldSkipDeployment({ ...env, ...overrides }), false);
  assert.equal(shouldSkipDeployment(env, () => { throw new Error("shallow history"); }), false);
});
