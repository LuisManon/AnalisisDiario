import { quinielaPaleDrawSchema } from "./validation";
import type { QuinielaPaleDraw } from "./types";

const resultsUrl = "https://www.loteriasdominicanas.com.do/estadistica/quiniela-pale-leidsa";
const publicResultUrl = "https://www.loteriasdominicanas.com.do/loteria-leidsa/quiniela-pale";
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getLatestExpectedQuinielaPaleDate() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santo_Domingo" }));
  const drawMinutes = now.getDay() === 0 ? 15 * 60 + 55 : 20 * 60 + 55;
  if (now.getHours() * 60 + now.getMinutes() < drawMinutes) now.setDate(now.getDate() - 1);
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export function getQuinielaDateRange(startDate: string, endDate = getLatestExpectedQuinielaPaleDate()) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
}

export async function fetchQuinielaPaleForDate(date: string): Promise<QuinielaPaleDraw | null> {
  const url = `${resultsUrl}?fecha=${encodeURIComponent(date)}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-DO,es;q=0.9",
      "User-Agent": "AnalisisDiario/1.0 Mozilla/5.0"
    },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Quiniela Pale respondio HTTP ${response.status}.`);
  const html = await response.text();
  const [year, month, day] = date.split("-").map(Number);
  const expectedHeading = `Resultado del ${day} de ${monthNames[month - 1]} de ${year}`;
  if (!html.includes(expectedHeading)) return null;
  const block = html.match(/id="bloque-resultado"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  if (!block) return null;
  const numbers = [...block.matchAll(/stats-ball-small">\s*(\d{1,2})\s*<\/span>/g)].map((match) => Number(match[1]));
  if (numbers.length < 3) return null;
  const parsed = quinielaPaleDrawSchema.safeParse({ date, numbers: numbers.slice(0, 3), source: publicResultUrl });
  return parsed.success ? parsed.data : null;
}

export async function fetchQuinielaPaleResultsSince(startDate: string, endDate?: string) {
  const dates = getQuinielaDateRange(startDate, endDate);
  const results: QuinielaPaleDraw[] = [];
  for (let start = 0; start < dates.length; start += 8) {
    const batch = await Promise.all(dates.slice(start, start + 8).map((date) => fetchQuinielaPaleForDate(date)));
    results.push(...batch.filter((result): result is QuinielaPaleDraw => Boolean(result)));
  }
  return { results, sourceUrl: publicResultUrl, checkedDates: dates };
}
