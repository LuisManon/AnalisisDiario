import fs from "node:fs/promises";
import { performanceSampleSchema, comparePerformanceSamples } from "../lib/performance-sample.ts";
const [first, second] = process.argv.slice(2);
if (!first || !second) throw new Error("Uso: node --experimental-strip-types scripts/compare-performance-samples.ts antes.json despues.json");
const before = performanceSampleSchema.parse(JSON.parse(await fs.readFile(first,"utf8")));
const after = performanceSampleSchema.parse(JSON.parse(await fs.readFile(second,"utf8")));
console.log(JSON.stringify({ before: before.date, after: after.date, windowMinutes: before.windowMinutes, environment: before.environment, rows: comparePerformanceSamples(before,after),
  note: "CPU observada en Vercel; CPU por petición = CPU / invocaciones. La comparación no atribuye causalidad ni garantiza un ahorro mensual." },null,2));
