import { quinielaPaleDrawSchema } from "./validation";
import type { QuinielaPaleDraw } from "./types";

const resultsUrl = "https://www.loteriasdominicanas.com.do/estadistica/quiniela-pale-leidsa";
const publicResultUrl = "https://www.loteriasdominicanas.com.do/loteria-leidsa/quiniela-pale";
const backupApiBaseUrl = "https://labanca.do/api/draws/leidsa/quiniela-pale";
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

export function parseDominicanasQuinielaPale(html: string, date: string): QuinielaPaleDraw | null {
  const [year, month, day] = date.split("-").map(Number);
  const headingPattern = new RegExp(`Resultado del 0?${day} de ${monthNames[month - 1]} de ${year}`, "i");
  if (!headingPattern.test(html)) return null;
  const block = html.match(/id="bloque-resultado"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  if (!block) return null;
  const numbers = [...block.matchAll(/stats-ball-small">\s*(\d{1,2})\s*<\/span>/g)].map((match) => Number(match[1]));
  if (numbers.length < 3) return null;
  const parsed = quinielaPaleDrawSchema.safeParse({ date, numbers: numbers.slice(0, 3), source: publicResultUrl });
  return parsed.success ? parsed.data : null;
}

async function fetchFromDominicanas(date: string): Promise<QuinielaPaleDraw | null> {
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
  return parseDominicanasQuinielaPale(await response.text(), date);
}

async function fetchFromLaBanca(date: string): Promise<QuinielaPaleDraw | null> {
  const url = `${backupApiBaseUrl}/${date}.json`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "AnalisisDiario/1.0" },
    signal: AbortSignal.timeout(15_000)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Respaldo de Quiniela Pale respondio HTTP ${response.status}.`);
  const payload = await response.json() as { draw_date?: unknown; numbers?: unknown; url?: unknown };
  if (payload.draw_date !== date || !Array.isArray(payload.numbers)) return null;
  const parsed = quinielaPaleDrawSchema.safeParse({
    date,
    numbers: payload.numbers.map(Number),
    source: typeof payload.url === "string" ? payload.url : url
  });
  return parsed.success ? parsed.data : null;
}

export async function fetchQuinielaPaleForDate(date: string): Promise<QuinielaPaleDraw | null> {
  const primary = await Promise.allSettled([fetchFromDominicanas(date)]);
  if (primary[0].status === "fulfilled" && primary[0].value) return primary[0].value;

  try {
    return await fetchFromLaBanca(date);
  } catch (backupError) {
    if (primary[0].status === "rejected") {
      throw new AggregateError([primary[0].reason, backupError], `No se pudo consultar Quiniela Pale para ${date}.`);
    }
    throw backupError;
  }
}

export async function fetchQuinielaPaleResultsSince(startDate: string, endDate?: string) {
  const dates = getQuinielaDateRange(startDate, endDate);
  const results: QuinielaPaleDraw[] = [];
  const errors: unknown[] = [];
  for (let start = 0; start < dates.length; start += 8) {
    const batch = await Promise.allSettled(dates.slice(start, start + 8).map((date) => fetchQuinielaPaleForDate(date)));
    for (const attempt of batch) {
      if (attempt.status === "fulfilled" && attempt.value) results.push(attempt.value);
      if (attempt.status === "rejected") errors.push(attempt.reason);
    }
  }
  if (!results.length && errors.length === dates.length) {
    throw new AggregateError(errors, "No se pudo consultar ninguna fuente remota de Quiniela Pale.");
  }
  return { results, sourceUrl: results[0]?.source ?? publicResultUrl, checkedDates: dates };
}
