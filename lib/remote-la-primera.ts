import { laPrimeraDrawSchema, laPrimeraLoto5DrawSchema, laPrimeraQuinielaDrawSchema } from "./validation";
import type { LaPrimeraDraw, LaPrimeraLoto5Draw, LaPrimeraQuinielaDraw } from "./types";
import { cleanLoto5Results } from "./la-primera-loto5";
import { parseLaBancaQuinielon } from "./la-primera-result-sources";

export { parseLaBancaQuinielon } from "./la-primera-result-sources";

const resultsUrl = "https://laprimera.do/resultados/";
const ajaxUrl = "https://laprimera.do/wp-admin/admin-ajax.php";
const laBancaBaseUrl = "https://labanca.do/loterias/la-primera";

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
    source: resultsUrl,
    verification: "confirmed"
  });

  return parsed.success ? parsed.data : null;
}

async function fetchLaBancaQuinielonForDate(date: string, session: "dia" | "noche") {
  const url = `${laBancaBaseUrl}/quinielon-${session}/${date}/`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "text/html,application/xhtml+xml", "Accept-Language": "es-DO,es;q=0.9", "User-Agent": "AnalisisDiario/1.0 Mozilla/5.0" },
    signal: AbortSignal.timeout(20_000)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`La Banca respondió HTTP ${response.status}.`);
  return parseLaBancaQuinielon(await response.text(), date, session, url);
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
    signal: AbortSignal.timeout(90_000)
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
    signal: AbortSignal.timeout(90_000)
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
  const response = await fetch(ajaxUrl, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "User-Agent": "LotoMasLab/1.0 Mozilla/5.0" }, body, signal: AbortSignal.timeout(90_000) });
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
  const response = await fetch(ajaxUrl, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "User-Agent": "LotoMasLab/1.0 Mozilla/5.0" }, body, signal: AbortSignal.timeout(90_000) });
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
  const dates = getDateRange(startDate, endDate);
  const [officialAttempt, provisionalAttempt] = await Promise.allSettled([
    (async () => {
      const nonce = await fetchNonce();
      const draws: LaPrimeraDraw[] = [];
      for (const date of dates) draws.push(...await fetchLaPrimeraResultsForDate(date, nonce));
      return draws;
    })(),
    (async () => {
      const attempts = await Promise.allSettled(
        dates.flatMap((date) => (["dia", "noche"] as const).map((session) => fetchLaBancaQuinielonForDate(date, session)))
      );
      return attempts.flatMap((attempt) => attempt.status === "fulfilled" && attempt.value ? [attempt.value] : []);
    })()
  ]);
  const official = officialAttempt.status === "fulfilled" ? officialAttempt.value : [];
  const provisional = provisionalAttempt.status === "fulfilled" ? provisionalAttempt.value : [];
  if (!official.length && !provisional.length && officialAttempt.status === "rejected" && provisionalAttempt.status === "rejected") {
    throw new AggregateError([officialAttempt.reason, provisionalAttempt.reason], "No se pudo consultar La Primera ni La Banca.");
  }

  const officialByKey = new Map(official.map((draw) => [`${draw.date}-${draw.session}`, draw]));
  const provisionalByKey = new Map(provisional.map((draw) => [`${draw.date}-${draw.session}`, draw]));
  const conflicts: Array<{ date: string; session: "dia" | "noche"; official: number; provisional: number }> = [];
  const results: LaPrimeraDraw[] = [];
  for (const key of new Set([...officialByKey.keys(), ...provisionalByKey.keys()])) {
    const confirmed = officialByKey.get(key);
    const early = provisionalByKey.get(key);
    if (confirmed) {
      if (early && early.number !== confirmed.number) conflicts.push({ date: confirmed.date, session: confirmed.session, official: confirmed.number, provisional: early.number });
      results.push({ ...confirmed, ...(early?.source ? { provisionalSource: early.source } : {}) });
    } else if (early) results.push(early);
  }
  return { results, officialResults: official, provisionalResults: provisional, conflicts, sourceUrl: official.length ? resultsUrl : laBancaBaseUrl, checkedDates: dates };
}
