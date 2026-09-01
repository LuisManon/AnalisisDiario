import fs from "node:fs/promises";

const resultsUrl = "https://laprimera.do/resultados/";
const ajaxUrl = "https://laprimera.do/wp-admin/admin-ajax.php";
const startDate = process.argv[2] ?? "2025-09-01";
const endDate = process.argv[3] ?? new Date().toISOString().slice(0, 10);

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
    if (item.juego_id !== 5 || item.resultado?.length !== 3) return [];
    const session = item.hora_sorteo === "12:00pm" ? "dia" : item.hora_sorteo === "07:00pm" ? "noche" : null;
    if (!session) return [];
    return [{ date, session, numbers: item.resultado.map(Number), drawId: item.sorteo_numero, source: resultsUrl }];
  });
}

const results = [];
for (let index = 0; index < dates.length; index += 8) {
  results.push(...(await Promise.all(dates.slice(index, index + 8).map(fetchDate))).flat());
}
results.sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
await fs.writeFile("data/la-primera-quiniela-results.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ startDate, endDate, draws: results.length, latest: results[0], oldest: results.at(-1) }, null, 2));
