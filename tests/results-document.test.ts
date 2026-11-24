import assert from "node:assert/strict";
import { test } from "node:test";
import { createResultsDocument } from "../lib/results-document.ts";
import { conditionalJson } from "../lib/http-version.ts";
test("unchanged results return no body and never validate the complete history", async () => {
  let parses = 0;
  const document = createResultsDocument('[{"date":"2026-11-23"}]', raw => { parses++; return JSON.parse(raw); });
  const version = document.respond(new Request("https://example.test/api/results?version=1"));
  assert.deepEqual(await version.json(), { version: document.version }); assert.equal(parses, 0);
  const unchanged = document.respond(new Request("https://example.test/api/results", { headers: { "If-None-Match": `W/"${document.version}"` } }));
  assert.equal(unchanged.status, 304); assert.equal(await unchanged.text(), ""); assert.equal(parses, 0);
  const first = document.respond(new Request("https://example.test/api/results"));
  assert.equal((await first.json()).results[0].date, "2026-11-23");
  document.respond(new Request("https://example.test/api/results")); assert.equal(parses, 1);
});
test("source corrections change versions, and historical details support conditional reads", async () => {
  assert.notEqual(createResultsDocument("old", x => x).version, createResultsDocument("new", x => x).version);
  const initial = conditionalJson(new Request("https://example.test/detail"), { current: { targetDate: "2026-11-23" } });
  const repeat = conditionalJson(new Request("https://example.test/detail", { headers: { "If-None-Match": initial.headers.get("etag")! } }), { current: { targetDate: "2026-11-23" } });
  assert.equal(repeat.status, 304); assert.equal(await repeat.text(), "");
});
