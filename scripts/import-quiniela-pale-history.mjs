import fs from "node:fs/promises";

const dataPath = "data/quiniela-pale-results.json";
const startDate = process.argv[2] ?? "2025-08-01";
const overlapEnd = process.argv[3] ?? "2026-03-09";
const monthMap = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };

const anchors = [];
for (const date = new Date(`${startDate}T00:00:00Z`); date <= new Date(`${overlapEnd}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 14)) {
  const anchor = new Date(date);
  anchor.setUTCDate(anchor.getUTCDate() + 14);
  anchors.push(anchor.toISOString().slice(0, 10) > overlapEnd ? overlapEnd : anchor.toISOString().slice(0, 10));
}
if (!anchors.includes(overlapEnd)) anchors.push(overlapEnd);
const uniqueAnchors = [...new Set(anchors)];

const historical = new Map();
for (let start = 0; start < uniqueAnchors.length; start += 5) {
  const pages = await Promise.all(uniqueAnchors.slice(start, start + 5).map(async (anchor) => {
    const url = `https://enloteria.com/resultados-leidsa-${anchor}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return { html: await response.text(), url };
  }));
  for (const { html, url } of pages) {
    const pattern = /Resultados de Leidsa del (\d{2}) de ([a-záéíóú]+) de (\d{4})\. Números ganadores: (\d{1,2}), (\d{1,2}), (\d{1,2})\./gi;
    for (const match of html.matchAll(pattern)) {
      const date = `${match[3]}-${monthMap[match[2].toLowerCase()]}-${match[1]}`;
      if (date >= startDate && date <= overlapEnd) historical.set(date, { date, numbers: [+match[4], +match[5], +match[6]], source: url });
    }
  }
}

const current = JSON.parse(await fs.readFile(dataPath, "utf8"));
const merged = new Map(current.map((draw) => [draw.date, draw]));
let added = 0;
let corrected = 0;
for (const [date, draw] of historical) {
  const existing = merged.get(date);
  if (!existing) {
    merged.set(date, draw);
    added += 1;
  } else if (!existing.numbers.every((number, position) => number === draw.numbers[position])) {
    merged.set(date, draw);
    corrected += 1;
  }
}

const results = [...merged.values()].sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile(dataPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ added, corrected, total: results.length, latest: results[0], oldest: results.at(-1) }, null, 2));
