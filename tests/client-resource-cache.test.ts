import assert from "node:assert/strict";
import { test } from "node:test";
import { createClientResourceCache } from "../lib/client-resource-cache.ts";
test("concurrent consumers share reads; 304 preserves the same object without downloading history", async () => {
  let now = 0, calls = 0;
  const request = (async (_url, init) => {
    calls++;
    if (calls === 1) return Response.json({ results: [1], version: "one" }, { headers: { ETag: '"one"' } });
    assert.equal((init?.headers as Record<string,string>)["If-None-Match"], '"one"');
    return new Response(null, { status: 304 });
  }) as typeof fetch;
  const cache = createClientResourceCache(request, () => now);
  const [a,b] = await Promise.all([cache.read("kino", "/results"), cache.read("kino", "/results")]);
  assert.equal(a,b); assert.equal(calls,1);
  now = 61_000;
  assert.equal(await cache.read("kino", "/results"),a); assert.equal(calls,2);
});
test("versioned historical plays are reused; missing records and failures are retried", async () => {
  let calls = 0, now = 0;
  const cache = createClientResourceCache((async () => { calls++; return Response.json({current:{targetDate:"2026-11-23"}}); }) as typeof fetch, () => now);
  await cache.read("date:v1", "/date", Infinity); now = 1_000_000;
  await cache.read("date:v1", "/date", Infinity); assert.equal(calls,1);
  await cache.read("date:v2", "/date", Infinity); assert.equal(calls,2);
  const missing = createClientResourceCache((async () => { calls++; return Response.json({current:null}); }) as typeof fetch, () => now);
  await missing.read("date", "/date", Infinity); now += 60_000; await missing.read("date", "/date", Infinity); assert.equal(calls,4);
  const failure = createClientResourceCache((async () => { throw new Error("network"); }) as typeof fetch);
  await assert.rejects(failure.read("key", "/date")); await assert.rejects(failure.read("key", "/date"));
});
