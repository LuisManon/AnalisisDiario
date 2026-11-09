import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { automationPlan, automationWindows, operationReady } from "../lib/automation-schedule.ts";
import { canGenerateLotoPortfolio, latestPublishedSlot, publicationWindow } from "../lib/draw-schedule.ts";
import { runAutomation } from "../scripts/automate-portfolios.ts";
import { savedStateReady } from "../lib/automation-status.ts";

const local = (date: string, time: string) => new Date(`${date}T${time}:00-04:00`);

test("exact emailed failure becomes read-only verification of the original targets", async () => {
  const now = new Date("2026-11-08T18:59:55Z");
  const plan = automationPlan("37 14 * * *", now);
  assert.equal(plan.expired,true);
  assert.equal(plan.operations.length,6);
  assert.ok(plan.operations.some(op=>op.date==="2026-11-08" && op.session==="dia"));
  const calls: string[]=[];
  const request = (async (url, init) => {
    const target = new URL(String(url)); calls.push(target.pathname);
    assert.equal(init?.method,"GET"); assert.equal(init?.body,undefined);
    return Response.json({ready:true,date:target.searchParams.get("date"),session:target.searchParams.get("session") ?? undefined});
  }) as typeof fetch;
  const result = await runAutomation({cron:"37 14 * * *",appUrl:"https://example.test",now,request});
  assert.equal(result.failed,false);
  assert.equal(result.report[0].state,"warning");
  assert.ok(calls.every(path=>path==="/api/automation/status"));
});

test("expired early attempts still fail for missing records and HTTP errors", async () => {
  for (const request of [
    (async ()=>Response.json({ready:false,date:"2026-11-08",session:"dia"})) as typeof fetch,
    (async ()=>Response.json({error:"storage unavailable"},{status:503})) as typeof fetch
  ]) {
    const result=await runAutomation({cron:"17 16 * * *",appUrl:"https://example.test",now:local("2026-11-08","16:00"),request});
    assert.equal(result.failed,true);
    assert.ok(result.report.some(row=>row.state==="failed"));
  }
});

test("three-hour boundary, midnight targets, invalid cron and saved state safeguards",()=>{
  assert.equal(automationPlan("17 16 * * *",local("2026-11-08","15:17")).expired,false);
  assert.equal(automationPlan("17 16 * * *",new Date("2026-11-08T19:17:00.001Z")).expired,true);
  const midnight=automationPlan("17 1 * * 0,2-6",local("2026-11-08","01:30"));
  assert.equal(midnight.date,"2026-11-07");
  assert.ok(midnight.operations.some(op=>op.date==="2026-11-07"));
  assert.throws(()=>automationPlan("invalid",local("2026-11-08","16:00")));
  assert.equal(savedStateReady("portfolio","2026-11-08",undefined,null),false);
  const kino = JSON.parse(readFileSync(new URL("../data/super-kino-portfolios/2026-11-08.json",import.meta.url),"utf8"));
  assert.equal(savedStateReady("portfolio","2026-11-08",undefined,kino),true);
  assert.equal(savedStateReady("portfolio","2026-11-07",undefined,kino),false);
  assert.equal(savedStateReady("assignment","2026-11-08","dia",null),false);
  const assignment = JSON.parse(readFileSync(new URL("../data/quinielon-assignments/2026-11-08-dia.json",import.meta.url),"utf8"));
  assert.equal(savedStateReady("assignment","2026-11-08","dia",assignment),true);
  assert.equal(savedStateReady("assignment","2026-11-08","dia",{...assignment,simulation:{kind:"retrospective"}}),false);
  assert.equal(savedStateReady("loto-portfolio","2026-11-08",undefined,{targetDate:"2026-11-07",plays:Array(30).fill({})}),false);
  assert.equal(savedStateReady("quinielon-result","2026-11-08","dia",[{date:"2026-11-08",session:"dia",verification:"provisional"}]),false);
  assert.equal(savedStateReady("quinielon-result","2026-11-08","dia",[{date:"2026-11-08",session:"dia",verification:"confirmed"}]),true);
});

test("Quinielón waits fifteen minutes and advances its expected published session only after the buffer", () => {
  assert.equal(publicationWindow("quinielon", local("2026-11-08", "11:59")), null);
  assert.equal(publicationWindow("quinielon", local("2026-11-08", "12:00"))?.remainingMinutes, 15);
  assert.equal(publicationWindow("quinielon", local("2026-11-08", "12:14"))?.remainingMinutes, 1);
  assert.equal(latestPublishedSlot("quinielon", local("2026-11-08", "12:14")).session, "noche");
  assert.equal(publicationWindow("quinielon", local("2026-11-08", "12:15")), null);
  assert.equal(latestPublishedSlot("quinielon", local("2026-11-08", "12:15")).session, "dia");
  assert.equal(publicationWindow("quinielon", local("2026-11-08", "19:00"))?.session, "noche");
});

test("Kino Sunday and weekday publication times differ; Loto runs only Wednesday and Saturday", () => {
  assert.equal(publicationWindow("kino", local("2026-11-08", "15:55"))?.remainingMinutes, 15);
  assert.equal(publicationWindow("kino", local("2026-11-08", "16:10")), null);
  assert.equal(publicationWindow("kino", local("2026-11-09", "20:55"))?.remainingMinutes, 15);
  assert.equal(publicationWindow("loto", local("2026-11-11", "21:09"))?.remainingMinutes, 1);
  assert.equal(publicationWindow("loto", local("2026-11-08", "20:55")), null);
});

test("Loto generation stops at 17:00 DR even on a UTC host", () => {
  assert.equal(canGenerateLotoPortfolio("2026-11-11", local("2026-11-11", "16:59")), true);
  assert.equal(canGenerateLotoPortfolio("2026-11-11", local("2026-11-11", "17:00")), false);
  assert.equal(canGenerateLotoPortfolio("2026-11-11", local("2026-11-12", "08:00")), false);
  assert.equal(canGenerateLotoPortfolio("2026-11-12", local("2026-11-11", "08:00")), false);
});

test("documented days without a Kino draw do not demand a nonexistent winner", () => {
  assert.equal(publicationWindow("kino", local("2026-04-03", "20:55")), null);
  assert.equal(latestPublishedSlot("kino", local("2026-04-04", "08:37")).date, "2026-04-01");
  const plan = automationPlan("17 1 * * 0,2-6", local("2026-04-03", "21:17"));
  assert.ok(!plan.operations.some(op => op.expect === "kino-result"));
});

test("a delayed job retains its scheduled operation rather than branching on the actual hour", () => {
  const plan = automationPlan("47 16 * * *", local("2026-11-08", "13:05"));
  assert.equal(plan.window.kind, "dia");
  assert.equal(plan.operations[0].session, "dia");
  assert.equal(plan.date, "2026-11-08");
  assert.equal(automationPlan("17 16 * * *", local("2026-11-08", "16:00")).expired, true);
  assert.ok(!automationPlan("37 14 * * *", local("2026-11-08", "12:10")).operations.some(op => op.expect === "assignment"));
});

test("UTC midnight still targets the Dominican draw date and Sunday does not update Loto", () => {
  const saturday = automationPlan("17 1 * * 0,2-6", new Date("2026-11-08T01:40:00Z"));
  assert.equal(saturday.date, "2026-11-07");
  assert.ok(saturday.operations.some(op => op.expect === "loto-result"));
  const sunday = automationPlan("17 20 * * 0", local("2026-11-08", "16:20"));
  assert.ok(!sunday.operations.some(op => op.expect === "loto-result"));
});

test("workflow and planner match, with exactly twelve scheduled runs per Dominican day", () => {
  const workflow = readFileSync(new URL("../.github/workflows/prepare-portfolios.yml", import.meta.url), "utf8");
  const crons = [...workflow.matchAll(/- cron: "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(crons, automationWindows.map(window => window.cron));
  const counts = new Map<string, number>();
  for (let day = 0; day < 9; day++) {
    const date = new Date(Date.UTC(2026, 10, 8 + day));
    for (const window of automationWindows) {
      const [minute, hour, , , weekday] = window.cron.split(" ");
      if (weekday !== "*" && ![...weekday.split(",").flatMap(part => part.includes("-") ? Array.from({length: Number(part.split("-")[1])-Number(part.split("-")[0])+1}, (_, i) => Number(part.split("-")[0])+i) : [Number(part)])].includes(date.getUTCDay())) continue;
      const instant = new Date(date); instant.setUTCHours(Number(hour), Number(minute));
      const key = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Santo_Domingo"}).format(instant);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  for (let day = 8; day <= 14; day++) assert.equal(counts.get(`2026-11-${String(day).padStart(2,"0")}`), 12);
});

test("a provisional result or wrong-date portfolio does not count as success", () => {
  const operation = automationPlan("17 16 * * *", local("2026-11-08", "12:17")).operations[0];
  assert.equal(operationReady(operation, {results:[{date:"2026-11-08",session:"dia",verification:"provisional"}]}), false);
  assert.equal(operationReady(operation, {results:[{date:"2026-11-08",session:"dia",verification:"confirmed"}]}), true);
  const portfolio = automationPlan("37 12 * * *", local("2026-11-08", "08:37")).operations.find(op => op.expect === "portfolio")!;
  assert.equal(operationReady(portfolio, {current:{targetDate:"2026-11-07",plays:[{}]}}), false);
  const loto = automationPlan("37 12 * * *", local("2026-11-08", "08:37")).operations.find(op => op.expect === "loto-portfolio")!;
  const payload = { current: {targetDate:loto.date,plays:Array(30).fill({})} };
  assert.equal(operationReady(loto, payload), true);
  assert.equal(operationReady(loto, {current: {...payload.current, plays: Array(29).fill({})}}), false);
});

test("pending publication succeeds on early attempts and fails on final attempt without network retries", async () => {
  let calls = 0;
  const request = (async () => { calls++; return Response.json({ok:true, results:[]}); }) as typeof fetch;
  const early = await runAutomation({cron:"17 16 * * *",appUrl:"https://example.test",now:local("2026-11-08","12:17"),request});
  assert.equal(early.failed,false); assert.equal(early.report[0].state,"pending");
  const final = await runAutomation({cron:"17 17 * * *",appUrl:"https://example.test",now:local("2026-11-08","13:17"),request});
  assert.equal(final.failed,true); assert.equal(calls,2);
});

test("a failed operation does not stop preparation of other products", async () => {
  let calls = 0;
  const request = (async () => { calls++; return Response.json({error:"fuente no disponible"},{status:502}); }) as typeof fetch;
  const result = await runAutomation({cron:"37 12 * * *",appUrl:"https://example.test",now:local("2026-11-08","08:37"),request});
  assert.equal(result.failed,true); assert.equal(calls,6); assert.equal(result.report.length,6);
});

test("a preparation window that arrives after the draw is reported, never silently successful", async () => {
  const request = (async () => Response.json({ok:true,results:[]})) as typeof fetch;
  const result = await runAutomation({cron:"37 14 * * *",appUrl:"https://example.test",now:local("2026-11-08","12:10"),request});
  assert.ok(result.report.some(item => item.label === "Ventana de preparación vencida" && item.state === "failed"));
});
