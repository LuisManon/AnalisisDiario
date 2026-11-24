import assert from "node:assert/strict";
import { test } from "node:test";
import { createPollingTask } from "../lib/polling.ts";
test("hidden views wait; returning resumes once; overlapping focus events do not duplicate a request", async () => {
  let visible = false, now = 0, calls = 0;
  const timers = new Map<number,{callback:()=>void;delay:number}>(); let next = 0;
  const task = createPollingTask(async () => { calls++; }, { intervalMs: 300_000, visible: () => visible, now: () => now,
    schedule: (callback,delay) => { timers.set(++next,{callback,delay}); return next; }, cancel: id => { timers.delete(id as number); } });
  await task.start(); assert.equal(calls,0);
  visible = true; task.resume(); task.resume(); await Promise.resolve(); await Promise.resolve(); assert.equal(calls,1);
  now = 300_000; task.resume(); await Promise.resolve(); await Promise.resolve(); assert.equal(calls,2);
  task.stop(); assert.equal(timers.size,0);
});
test("failures back off and unmount aborts an in-flight request without scheduling another", async () => {
  let delay = 0, callback = () => {}, signal: AbortSignal | undefined;
  const task = createPollingTask(async () => { throw new Error("source"); }, { intervalMs:300_000, visible:()=>true,
    schedule:(fn,ms)=>{callback=fn;delay=ms;return 1;}, cancel:()=>{} });
  await task.start(); assert.equal(delay,30_000); callback(); await Promise.resolve(); await Promise.resolve(); assert.equal(delay,60_000); task.stop();
  let finish!:()=>void, schedules=0;
  const active = createPollingTask(async s => { signal=s; await new Promise<void>(resolve=>{finish=resolve;}); }, {intervalMs:300_000,visible:()=>true,schedule:()=>{schedules++;},cancel:()=>{}});
  const run=active.start(); active.stop(); assert.equal(signal?.aborted,true); finish(); await run; assert.equal(schedules,0);
});
