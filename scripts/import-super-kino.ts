import fs from "node:fs/promises";
import { fetchKinoAnchor, missingKinoDates } from "../lib/remote-super-kino.ts";
import { kinoExpectedDate, kinoYearStart, kinoDates, kinoClock } from "../lib/super-kino-clock.ts";
import { kinoDrawSchema } from "../lib/super-kino.ts";
const file = "data/super-kino-results.json";
const end = kinoExpectedDate();
const start = kinoYearStart(kinoClock().date);
const existing = kinoDrawSchema.array().parse(JSON.parse(await fs.readFile(file,"utf8")));
const merged = new Map(existing.map(d => [d.date,d]));
const dates = kinoDates(start,end);
const anchors = dates.filter((_,i) => i % 14 === 13 || i === dates.length - 1);
for (let i=0; i<anchors.length; i+=4) {
  const batch = await Promise.allSettled(anchors.slice(i,i+4).map(fetchKinoAnchor));
  for (const result of batch) {
    if (result.status === "fulfilled") for (const draw of result.value) {
      if (draw.date >= start && draw.date <= end && !merged.has(draw.date)) merged.set(draw.date, draw);
    }
    else console.error(String(result.reason));
  }
  console.log(`Archivos ${Math.min(i+4,anchors.length)}/${anchors.length}: ${merged.size} sorteos`);
}
// Fill actual gaps by exact date; never label another day's numbers with the requested date.
const gaps = missingKinoDates([...merged.values()],end,start);
for (let i=0;i<gaps.length;i+=4) {
  const batch = await Promise.allSettled(gaps.slice(i,i+4).map(fetchKinoAnchor));
  for (const result of batch) if (result.status === "fulfilled") for (const draw of result.value) {
    if (draw.date >= start && draw.date <= end && !merged.has(draw.date)) merged.set(draw.date,draw);
  }
}
const results = [...merged.values()].sort((a,b)=>b.date.localeCompare(a.date));
await fs.writeFile(file,`${JSON.stringify(results,null,2)}\n`);
console.log(JSON.stringify({total:results.length,start,end,missing:missingKinoDates(results,end,start)},null,2));
