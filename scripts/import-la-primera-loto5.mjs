import fs from "node:fs/promises";

const resultsUrl = "https://laprimera.do/resultados/";
const ajaxUrl = "https://laprimera.do/wp-admin/admin-ajax.php";
const endDate = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const defaultStart = new Date(`${endDate}T00:00:00Z`);
defaultStart.setUTCFullYear(defaultStart.getUTCFullYear() - 1);
const startDate = process.argv[2] ?? defaultStart.toISOString().slice(0, 10);

const html = await fetch(resultsUrl).then((response) => response.text());
const nonce = html.match(/var\s+primera_js\s*=\s*\{[\s\S]*?"nonce"\s*:\s*"([^"]+)"/)?.[1];
if (!nonce) throw new Error("No se encontró el nonce oficial.");

const dates = [];
for (const date = new Date(`${startDate}T00:00:00Z`); date <= new Date(`${endDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
  dates.push(date.toISOString().slice(0, 10));
}

async function fetchDate(date) {
  const body = new FormData();
  body.append("action", "get_lotteries_results");
  body.append("nonce", nonce);
  body.append("date", date);
  const response = await fetch(ajaxUrl, { method: "POST", body });
  if (!response.ok) throw new Error(`${date}: HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.data?.lotteries?.la_primera ?? []).flatMap((item) => {
    if (item.juego_id !== 37 || item.resultado?.length !== 6) return [];
    const values = item.resultado.map(Number);
    if (values.slice(0, 5).some((number) => !Number.isInteger(number) || number < 1 || number > 38)) return [];
    if (!Number.isInteger(values[5]) || values[5] < 1 || values[5] > 10) return [];
    return [{ date, numbers: values.slice(0, 5), plus: values[5], drawId: item.sorteo_numero, source: resultsUrl }];
  });
}

const results = [];
for (let index = 0; index < dates.length; index += 8) {
  const batch = await Promise.allSettled(dates.slice(index, index + 8).map(fetchDate));
  for (const attempt of batch) {
    if (attempt.status === "fulfilled") results.push(...attempt.value);
    else console.warn(attempt.reason);
  }
}

results.sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile("data/la-primera-loto5-results.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ startDate, endDate, draws: results.length, latest: results[0], oldest: results.at(-1) }, null, 2));
