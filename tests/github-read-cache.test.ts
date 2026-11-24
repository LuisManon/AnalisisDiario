import assert from "node:assert/strict";
import { test } from "node:test";
import { readGitHubJsonFile, writeGitHubJsonFile, writeGitHubSnapshot } from "../lib/github-data-store.ts";

test("hosted reads coalesce but writes compare fresh storage and invalidate stale reads", async () => {
  const saved = { VERCEL: process.env.VERCEL, GITHUB_TOKEN: process.env.GITHUB_TOKEN, GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY };
  const originalFetch = globalThis.fetch;
  let content = "first", gets = 0, puts = 0;
  Object.assign(process.env, { VERCEL: "1", GITHUB_TOKEN: "fixture-token", GITHUB_REPOSITORY: "fixture/cache-test" });
  globalThis.fetch = (async (_url, init) => {
    if (init?.method === "PUT") {
      puts++;
      content = Buffer.from(JSON.parse(String(init.body)).content, "base64").toString("utf8");
      return Response.json({});
    }
    gets++;
    return Response.json({ content: Buffer.from(content).toString("base64"), encoding: "base64", sha: "fixture-sha" });
  }) as typeof fetch;
  try {
    assert.deepEqual(await Promise.all([readGitHubJsonFile("file.json"), readGitHubJsonFile("file.json")]), ["first", "first"]);
    assert.equal(gets, 1);
    content = "changed-by-another-worker";
    await assert.rejects(writeGitHubSnapshot("file.json", "replacement", "first", "test"), /cambió/);
    assert.equal(puts, 0);
    await writeGitHubJsonFile("file.json", "updated", "test");
    assert.equal(await readGitHubJsonFile("file.json"), "updated");
    assert.equal(puts, 1);
    delete process.env.VERCEL;
    content = "worker-fresh";
    assert.equal(await readGitHubJsonFile("file.json"), "worker-fresh");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
