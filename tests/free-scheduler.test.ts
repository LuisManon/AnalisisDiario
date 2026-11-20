import assert from "node:assert/strict";
import { test } from "node:test";
import { schedulerJobs, installScheduler } from "../scripts/setup-free-scheduler.ts";

test("free scheduler dispatches short authenticated requests and converts UTC weekdays to DR", () => {
  const jobs = schedulerJobs("LuisManon/AnalisisDiario", "test-token");
  const night = jobs.find(job => job.title.endsWith("17 1 * * 0,2-6"))!;
  assert.equal(night.requestMethod, 1);
  assert.equal(night.requestTimeout, 30);
  assert.equal(night.extendedData.headers.Authorization, "Bearer test-token");
  assert.deepEqual(night.schedule.hours, [21]);
  assert.deepEqual(night.schedule.wdays, [6,1,2,3,4,5]);
  assert.equal(night.schedule.timezone, "America/Santo_Domingo");
  assert.deepEqual(JSON.parse(night.extendedData.body), {ref:"main",inputs:{schedule:"17 1 * * 0,2-6"}});
  const sunday = jobs.find(job => job.title.endsWith("17 20 * * 0"))!;
  assert.deepEqual(sunday.schedule.hours, [16]);
  assert.deepEqual(sunday.schedule.wdays, [0]);
  assert.throws(() => schedulerJobs("bad/path/extra", "token"));
});

test("installer updates existing jobs, creates missing jobs and never dispatches a draw", async () => {
  const jobs = schedulerJobs("LuisManon/AnalisisDiario", "test-token");
  let writes = 0;
  const request = (async (url, init) => {
    assert.ok(String(url).startsWith("https://api.cron-job.org/jobs"));
    if (!init?.method) return Response.json({jobs:[{jobId:10,title:jobs[0].title}]});
    assert.equal(init.method, writes === 0 ? "PATCH" : "PUT");
    if (writes === 0) assert.ok(String(url).endsWith("/10"));
    const job = JSON.parse(String(init.body)).job;
    assert.equal(job.extendedData.headers.Authorization, "Bearer test-token");
    writes++;
    return Response.json({jobId:100+writes});
  }) as typeof fetch;
  const result = await installScheduler({apiKey:"api-test",repository:"LuisManon/AnalisisDiario",token:"test-token",request,pause:async ms=>{assert.equal(ms,13000);}});
  assert.equal(result.length,jobs.length);
  assert.equal(result[0].jobId,10);
  assert.equal(writes,jobs.length);
});

test("installer refuses incomplete listings to avoid duplicate triggers", async () => {
  const request = (async () => Response.json({jobs:[],someFailed:true})) as typeof fetch;
  await assert.rejects(installScheduler({apiKey:"test",repository:"LuisManon/AnalisisDiario",token:"test",request}), /incompleto/);
});
