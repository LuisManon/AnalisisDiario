import { kinoDrawSchema, parseKinoArchive, type KinoDraw } from "./super-kino.ts";
import { isKinoNoDraw, kinoDates, kinoExpectedDate, kinoYearStart } from "./super-kino-clock.ts";
const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function parseEnloteriaKino(html: string, source: string): KinoDraw[] {
  const draws: KinoDraw[] = [];
  const pattern = /Resultados de Super Kino TV del (\d{1,2}) de ([a-z]+) de (\d{4})\. Números ganadores: ([\d,\s]+)\./gi;
  for (const match of html.matchAll(pattern)) {
    const month = months.indexOf(match[2].toLowerCase()) + 1;
    const date = `${match[3]}-${String(month).padStart(2,"0")}-${match[1].padStart(2,"0")}`;
    const parsed = kinoDrawSchema.safeParse({date, numbers: match[4].split(",").map(Number), source});
    // Reject the malformed row without discarding other valid dates in the archive.
    if (parsed.success) draws.push(parsed.data);
  }
  if (!draws.length) throw new Error("El archivo no contiene sorteos válidos de Super Kino TV.");
  return draws;
}
async function fetchHtml(url: string) {
  const response = await fetch(url, {cache: "no-store", signal: AbortSignal.timeout(15_000)});
  if (!response.ok) throw new Error(`Fuente de Kino: HTTP ${response.status}`);
  return response.text();
}
export async function fetchKinoAnchor(date: string) {
  const url = `https://enloteria.com/resultados-super-kino-tv-${date}`;
  return parseEnloteriaKino(await fetchHtml(url), url).filter(d => d.date <= date);
}
export async function fetchLatestKinoResults(expected = kinoExpectedDate()) {
  const source = `https://numeros.medios.com.do/leidsa/super-kino-tv/historial/${expected.slice(0,7)}/`;
  const attempts = await Promise.allSettled([
    fetchHtml(source).then(html => parseKinoArchive(html, source)),
    fetchKinoAnchor(expected)
  ]);
  const merged = new Map<string, KinoDraw>();
  // Monthly archive is preferred if both sources publish the same date.
  for (const attempt of [...attempts].reverse()) if (attempt.status === "fulfilled") {
    for (const draw of attempt.value) if (draw.date <= expected) merged.set(draw.date, draw);
  }
  if (!merged.size) throw new Error("Las fuentes todavía no responden con resultados válidos.");
  return [...merged.values()].sort((a,b) => b.date.localeCompare(a.date));
}
export function missingKinoDates(draws: KinoDraw[], end = kinoExpectedDate(), start = kinoYearStart(end)) {
  const known = new Set(draws.map(d => d.date));
  return kinoDates(start, end).filter(d => !known.has(d) && !isKinoNoDraw(d));
}
