import { laPrimeraDrawSchema, laPrimeraLoto5DrawSchema, laPrimeraQuinielaDrawSchema } from "./validation";
import type { LaPrimeraDraw, LaPrimeraLoto5Draw, LaPrimeraQuinielaDraw } from "./types";
import { cleanLoto5Results } from "./la-primera-loto5";

const resultsUrl = "https://laprimera.do/resultados/";
const ajaxUrl = "https://laprimera.do/wp-admin/admin-ajax.php";

type OfficialLottery = {
  fecha?: string;
  hora_sorteo?: string;
  sorteo_numero?: number;
  id?: number;
  juego_id?: number;
  juego_nombre?: string;
  resultado?: string[];
};

type OfficialResponse = {
  success?: boolean;
  data?: {
    lotteries?: {
      la_primera?: OfficialLottery[];
    };
  };
};

function parseNonce(html: string) {
  const match = html.match(/var\s+primera_js\s*=\s*\{[\s\S]*?"nonce"\s*:\s*"([^"]+)"/);
  if (!match) throw new Error("No se encontro el nonce de La Primera.");
  return match[1];
}

function parseOfficialDraw(date: string, item: OfficialLottery): LaPrimeraDraw | null {
  if (item.juego_id !== 83 || item.juego_nombre !== "EL QUINIELON") return null;
  const rawNumber = item.resultado?.[0];
  const number = rawNumber === undefined ? Number.NaN : Number(rawNumber);
  const session = item.hora_sorteo === "07:00pm" ? "noche" : item.hora_sorteo === "12:00pm" ? "dia" : null;
  if (!session || !Number.isInteger(number)) return null;

  const parsed = laPrimeraDrawSchema.safeParse({
    date,
    session,
    number,
    drawId: item.sorteo_numero,
    source: resultsUrl
  });

  return parsed.success ? parsed.data : null;
}

function parseOfficialQuinielaDraw(date: string, item: OfficialLottery): LaPrimeraQuinielaDraw | null {
  if (item.juego_id !== 5 || item.resultado?.length !== 3) return null;
  const session = item.hora_sorteo === "07:00pm" ? "noche" : item.hora_sorteo === "12:00pm" ? "dia" : null;
  if (!session) return null;
  const numbers = item.resultado.map(Number);
  const parsed = laPrimeraQuinielaDrawSchema.safeParse({ date, session, numbers, drawId: item.sorteo_numero, source: resultsUrl });
  return parsed.success ? parsed.data : null;
}

function parseOfficialLoto5Draw(date: string, item: OfficialLottery): LaPrimeraLoto5Draw | null {
  if (item.juego_id !== 37 || item.resultado?.length !== 6) return null;
  const values = item.resultado.map(Number);
  const parsed = laPrimeraLoto5DrawSchema.safeParse({
    date,
    numbers: values.slice(0, 5),
    plus: values[5],
    drawId: item.sorteo_numero,
    source: resultsUrl
  });
  return parsed.success ? parsed.data : null;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getDateRange(startDate: string, endDate = toIsoDate(new Date())) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
}

async function fetchNonce() {
  const response = await fetch(resultsUrl, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-DO,es;q=0.9",
      "User-Agent": "LotoMasLab/1.0 Mozilla/5.0"
    },
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) throw new Error(`La Primera respondio HTTP ${response.status}.`);
  return parseNonce(await response.text());
}

export async function fetchLaPrimeraResultsForDate(date: string, nonce: string) {
  const body = new FormData();
  body.append("action", "get_lotteries_results");
  body.append("nonce", nonce);
  body.append("date", date);

  const response = await fetch(ajaxUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "LotoMasLab/1.0 Mozilla/5.0"
    },
    body,
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) throw new Error(`La Primera AJAX respondio HTTP ${response.status}.`);
  const payload = (await response.json()) as OfficialResponse;
  const official = payload.data?.lotteries?.la_primera ?? [];
  return official.flatMap((item) => {
    const parsed = parseOfficialDraw(date, item);
    return parsed ? [parsed] : [];
  });
}

export async function fetchLaPrimeraQuinielaResultsForDate(date: string, nonce: string) {
  const body = new FormData();
  body.append("action", "get_lotteries_results");
  body.append("nonce", nonce);
  body.append("date", date);
  const response = await fetch(ajaxUrl, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "User-Agent": "LotoMasLab/1.0 Mozilla/5.0" }, body, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`La Primera AJAX respondio HTTP ${response.status}.`);
  const payload = (await response.json()) as OfficialResponse;
  return (payload.data?.lotteries?.la_primera ?? []).flatMap((item) => {
    const parsed = parseOfficialQuinielaDraw(date, item);
    return parsed ? [parsed] : [];
  });
}

export async function fetchLaPrimeraLoto5ResultsForDate(date: string, nonce: string) {
  const body = new FormData();
  body.append("action", "get_lotteries_results");
  body.append("nonce", nonce);
  body.append("date", date);
  const response = await fetch(ajaxUrl, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "User-Agent": "LotoMasLab/1.0 Mozilla/5.0" }, body, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`La Primera AJAX respondio HTTP ${response.status}.`);
  const payload = (await response.json()) as OfficialResponse;
  return (payload.data?.lotteries?.la_primera ?? []).flatMap((item) => {
    const parsed = parseOfficialLoto5Draw(date, item);
    return parsed ? [parsed] : [];
  });
}

export async function fetchLaPrimeraLoto5ResultsSince(startDate: string, endDate?: string) {
  const nonce = await fetchNonce();
  const dates = getDateRange(startDate, endDate);
  const results: LaPrimeraLoto5Draw[] = [];
  for (const date of dates) results.push(...await fetchLaPrimeraLoto5ResultsForDate(date, nonce));
  return { results: cleanLoto5Results(results), sourceUrl: resultsUrl, checkedDates: dates };
}

export async function fetchLaPrimeraQuinielaResultsSince(startDate: string, endDate?: string) {
  const nonce = await fetchNonce();
  const dates = getDateRange(startDate, endDate);
  const results: LaPrimeraQuinielaDraw[] = [];
  for (const date of dates) results.push(...await fetchLaPrimeraQuinielaResultsForDate(date, nonce));
  return { results, sourceUrl: resultsUrl, checkedDates: dates };
}

export async function fetchLaPrimeraResultsSince(startDate: string, endDate?: string) {
  const nonce = await fetchNonce();
  const dates = getDateRange(startDate, endDate);
  const results: LaPrimeraDraw[] = [];

  for (const date of dates) {
    results.push(...(await fetchLaPrimeraResultsForDate(date, nonce)));
  }

  return {
    results,
    sourceUrl: resultsUrl,
    checkedDates: dates
  };
}
