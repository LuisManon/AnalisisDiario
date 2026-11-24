import fs from "node:fs/promises";
import { aggregatePerformanceDay, performanceSampleSchema } from "../lib/performance-sample.ts";
const [date, ...files] = process.argv.slice(2);
if (!date || !files.length) throw new Error("Uso: node --experimental-strip-types scripts/aggregate-performance-day.ts YYYY-MM-DD muestra1.json muestra2.json");
const samples = await Promise.all(files.map(async file => performanceSampleSchema.parse(JSON.parse(await fs.readFile(file,"utf8")))));
console.log(JSON.stringify(aggregatePerformanceDay(date,samples),null,2));
