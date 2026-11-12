import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
function runtime(offline = false) {
  const handlers: Record<string, (event: any) => void> = {};
  const cached: string[] = [];
  runInNewContext(worker, {
    URL,
    self: { location: { origin: "https://example.test" }, clients: { claim: async () => {} }, addEventListener: (name: string, handler: any) => { handlers[name] = handler; } },
    caches: { open: async () => ({ addAll: async (assets: string[]) => cached.push(...assets) }), match: async () => "offline-shell" },
    fetch: async () => { if (offline) throw new Error("offline"); return "network"; },
  });
  return { handlers, cached };
}

test("offline precache contains only public static assets", async () => {
  const { handlers, cached } = runtime();
  let work: Promise<unknown> = Promise.resolve();
  handlers.install({ waitUntil: (p: Promise<unknown>) => { work = p; } });
  await work;
  assert.ok(cached.includes("/offline.html"));
  assert.ok(cached.every(path => path === "/offline.html" || path.endsWith(".png")));
});

test("worker leaves APIs, private requests and external resources to the network", () => {
  const { handlers } = runtime();
  for (const [url, method, mode] of [
    ["https://example.test/api/portfolio", "GET", "cors"],
    ["https://example.test/api/results", "GET", "cors"],
    ["https://example.test/", "POST", "navigate"],
    ["https://other.test/icons/icon-192.png", "GET", "cors"],
  ]) {
    handlers.fetch({ request: { url, method, mode }, respondWith: () => assert.fail("Private request intercepted") });
  }
});

test("navigation uses live data online and the generic shell offline", async () => {
  for (const offline of [false, true]) {
    const { handlers } = runtime(offline);
    let response: Promise<unknown> | undefined;
    handlers.fetch({ request: { url: "https://example.test/", method: "GET", mode: "navigate" }, respondWith: (p: Promise<unknown>) => { response = p; } });
    assert.equal(await response, offline ? "offline-shell" : "network");
  }
});
