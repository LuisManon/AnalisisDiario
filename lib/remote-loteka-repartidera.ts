import { lotekaRepartideraDrawSchema } from "./validation";
import type { LotekaRepartideraDraw } from "./types";

const resultsUrl = "https://loteka.com.do/wp-content/themes/loteka/resultados.php";

function toOfficialDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function toIsoDate(day: string, month: string, year: string) {
  return `${year}-${month}-${day}`;
}

function toIsoDateFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseOfficialRows(html: string) {
  const rows = [
    ...html.matchAll(
      /<tr>[\s\S]*?<td>(\d{2})\/(\d{2})\/(\d{4})<\/td>[\s\S]*?<td class="repartidera bola1"><span class="bola bg-red">\s*(\d{1,2})\s*<\/span><\/td>[\s\S]*?<\/tr>/g
    )
  ];

  return rows.flatMap(([, day, month, year, rawNumber]) => {
    const parsed = lotekaRepartideraDrawSchema.safeParse({
      date: toIsoDate(day, month, year),
      number: Number(rawNumber),
      source: resultsUrl
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export function getLotekaDateRange(startDate: string, endDate = toIsoDateFromDate(new Date())) {
  const ranges: Array<{ from: string; to: string }> = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  for (const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const from = new Date(cursor);
    if (from < start) from.setTime(start.getTime());
    const to = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    if (to > end) to.setTime(end.getTime());
    ranges.push({ from: toIsoDateFromDate(from), to: toIsoDateFromDate(to) });
  }

  return ranges;
}

export async function fetchLotekaRepartideraForRange(from: string, to: string) {
  const body = new URLSearchParams();
  body.set("from", toOfficialDate(from));
  body.set("to", toOfficialDate(to));
  body.set("sorteo", "repartidera");

  const response = await fetch(resultsUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "LotoMasLab/1.0 Mozilla/5.0"
    },
    body,
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) throw new Error(`Loteka respondio HTTP ${response.status}.`);
  return parseOfficialRows(await response.text());
}

export async function fetchLotekaRepartideraResultsSince(startDate: string, endDate?: string) {
  const ranges = getLotekaDateRange(startDate, endDate);
  const results: LotekaRepartideraDraw[] = [];

  for (const range of ranges) {
    results.push(...(await fetchLotekaRepartideraForRange(range.from, range.to)));
  }

  return {
    results,
    sourceUrl: resultsUrl,
    checkedRanges: ranges
  };
}
