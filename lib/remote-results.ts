import { drawSchema } from "./validation";
import type { DrawResult } from "./types";

const officialSourceUrl = "https://www.leidsa.com/results";
const backupSourceUrl = "https://www.yelu.do/leidsa/results/loto-mas";
const months: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11
};

function normalizeDrawDate(dateText: string) {
  const match = dateText.toLowerCase().match(/(\d{2}) de ([a-záéíóúñ]+) (\d{4})/);
  if (!match) return null;

  const month = months[match[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
  if (month === undefined) return null;

  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
  while (date.getUTCDay() !== 3 && date.getUTCDay() !== 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

export function parseRemoteResults(html: string): DrawResult[] {
  const results: DrawResult[] = [];
  const rowPattern =
    /<tr><td title="Fecha del Sorteo">([^<]+)<\/td><td[^>]*title="Loto Más"[\s\S]*?<span title="(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)\+(\d+)-(\d+)"/g;

  for (const match of html.matchAll(rowPattern)) {
    const date = normalizeDrawDate(match[1]);
    if (!date) continue;

    const parsed = drawSchema.safeParse({
      date,
      day: new Date(`${date}T00:00:00Z`).getUTCDay() === 3 ? "miercoles" : "sabado",
      numbers: match.slice(2, 8).map(Number),
      plus: Number(match[8]),
      source: backupSourceUrl
    });
    if (parsed.success) results.push(parsed.data);
  }

  return results;
}

export function parseOfficialLatestResult(html: string): DrawResult[] {
  const match = html.match(
    /"gameFamilyName":\\"Loto\\","gameProvider":\\"Leidsa\\"[\s\S]*?"previousDrawDetails":\{"drawId":\\"[^"]+\\","drawnValues":\[([0-9,]+)\],"bonusRoundsValues":\[([0-9,]+)\],"drawTimestamp":\\"([^"]+)\\"/
  );
  if (!match) return [];

  const timestamp = new Date(match[3]);
  timestamp.setUTCHours(timestamp.getUTCHours() - 4);
  const date = timestamp.toISOString().slice(0, 10);
  const parsed = drawSchema.safeParse({
    date,
    day: timestamp.getUTCDay() === 3 ? "miercoles" : "sabado",
    numbers: match[1].split(",").map(Number),
    plus: Number(match[2].split(",")[0]),
    source: officialSourceUrl
  });

  return parsed.success ? [parsed.data] : [];
}

async function fetchAndParse(url: string, parser: (html: string) => DrawResult[]) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html",
      "User-Agent": "LotoMasLab/1.0"
    },
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`${url} respondio HTTP ${response.status}.`);
  }

  const results = parser(await response.text());
  if (!results.length) {
    throw new Error(`No se reconocieron resultados de Loto Mas en ${url}.`);
  }
  return results;
}

export async function fetchRemoteResults() {
  const attempts = await Promise.allSettled([
    fetchAndParse(officialSourceUrl, parseOfficialLatestResult),
    fetchAndParse(backupSourceUrl, parseRemoteResults)
  ]);
  const results = [attempts[1], attempts[0]].flatMap((attempt) => (attempt.status === "fulfilled" ? attempt.value : []));

  if (!results.length) {
    throw new Error("No se pudo consultar ninguna fuente remota de resultados.");
  }

  return {
    results,
    sourceUrl: attempts[0].status === "fulfilled" ? officialSourceUrl : backupSourceUrl
  };
}
