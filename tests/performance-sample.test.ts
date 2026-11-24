import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregatePerformanceDay, performanceSampleSchema, comparePerformanceSamples } from "../lib/performance-sample.ts";
test("CPU comparisons use per-route invocation counts and reject incompatible daily windows", () => {
  const first = performanceSampleSchema.parse({date:"2026-11-23",windowMinutes:1440,environment:"production",source:"fixture",routes:[{route:"/api/results",invocations:10,cpuMs:1000}]});
  const second = {...first,date:"2026-11-24",routes:[{route:"/api/results",invocations:20,cpuMs:1000}]};
  assert.equal(comparePerformanceSamples(first,second)[0].changePercent,-50);
  assert.equal(comparePerformanceSamples(first,second)[0].afterCpuPerRequestMs,50);
  assert.throws(()=>comparePerformanceSamples(first,{...second,windowMinutes:5}));
  assert.equal(comparePerformanceSamples(first,{...second,routes:[]})[0].changePercent,null);
  assert.equal(performanceSampleSchema.safeParse({...first,routes:[{route:"/api/results",invocations:0,cpuMs:1000}]}).success,false);
});
test("two complete 12-hour windows make a Dominican day without needing paid retention", () => {
  const a = performanceSampleSchema.parse({date:"2026-11-23",windowMinutes:720,environment:"production",source:"fixture",complete:true,from:"2026-11-23T04:00:00Z",to:"2026-11-23T16:00:00Z",routes:[{route:"/api/results",invocations:2,cpuMs:100}]});
  const b = {...a,from:"2026-11-23T16:00:00Z",to:"2026-11-24T04:00:00Z"};
  assert.equal(aggregatePerformanceDay("2026-11-23",[b,a]).routes[0].cpuMs,200);
  assert.throws(()=>aggregatePerformanceDay("2026-11-23",[a,a]));
  assert.throws(()=>aggregatePerformanceDay("2026-11-23",[a]));
  assert.throws(()=>aggregatePerformanceDay("2026-11-23",[a,{...b,complete:false}]));
});
