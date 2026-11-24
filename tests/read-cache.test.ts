import assert from "node:assert/strict";
import { test } from "node:test";
import { createReadCache } from "../lib/read-cache.ts";

test("concurrent reads share work and expire without serving an old value forever", async () => {
  let now = 0, calls = 0;
  const cache = createReadCache<number>(60, 2, () => now);
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.read("a", load), cache.read("a", load)]), [1, 1]);
  now = 59;
  assert.equal(await cache.read("a", load), 1);
  now = 60;
  assert.equal(await cache.read("a", load), 2);
  cache.clear();
  assert.equal(await cache.read("a", load), 3);
});

test("failures are retried and the cache bounds the number of retained files", async () => {
  const cache = createReadCache<number>(60_000, 2);
  await assert.rejects(cache.read("a", async () => { throw new Error("unavailable"); }));
  assert.equal(await cache.read("a", async () => 1), 1);
  await cache.read("b", async () => 2);
  await cache.read("c", async () => 3);
  assert.equal(await cache.read("a", async () => 4), 4);
});

test("nested layers share expiry instead of extending a stale value for another full minute", async () => {
  let now = 0, current = "old";
  const files = createReadCache<string>(60_000, 2, () => now);
  const views = createReadCache<string>(60_000, 2, () => now);
  const file = () => files.read("file", async () => current);
  const view = () => views.read("view", file);
  await file();
  now = 1_000; current = "new";
  now = 59_000; assert.equal(await view(), "old");
  now = 60_000; assert.equal(await view(), "new");
});
