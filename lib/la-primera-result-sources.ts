type QuinielonResult = {
  date: string;
  session: "dia" | "noche";
  number: number;
  drawId?: number;
  source?: string;
  verification?: "provisional" | "confirmed";
  provisionalSource?: string;
};

const laBancaBaseUrl = "https://labanca.do/loterias/la-primera";
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function parseLaBancaQuinielon(html: string, date: string, session: "dia" | "noche", source = `${laBancaBaseUrl}/quinielon-${session}/${date}/`): QuinielonResult | null {
  const [year, month, day] = date.split("-").map(Number);
  const monthName = monthNames[month - 1];
  if (!year || !monthName || !day) return null;

  const label = session === "dia" ? "Día" : "Noche";
  const pattern = new RegExp(`El número ganador de Quinielón ${label} La Primera del 0?${day} de ${monthName} de ${year} fue (\\d{1,2})`, "i");
  const match = html.match(pattern);
  if (!match) return null;

  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 0 || number > 99) return null;
  return { date, session, number, source, verification: "provisional" };
}

function resultAuthority(result: QuinielonResult) {
  if (result.verification === "provisional") return 1;
  if (result.verification === "confirmed" || result.source?.includes("laprimera.do")) return 2;
  return 0;
}

export function mergeLaPrimeraResults<T extends QuinielonResult>(results: T[]) {
  const unique = new Map<string, T>();
  for (const result of results) {
    const key = `${result.date}-${result.session}`;
    const saved = unique.get(key);
    if (!saved || resultAuthority(result) >= resultAuthority(saved)) unique.set(key, result);
  }
  return [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.session.localeCompare(b.session));
}
