import { buildLaPrimeraFrequencyRanking } from "./la-primera";
import type { LaPrimeraDraw, LaPrimeraSession } from "./types";
import { subtractMonths } from "./quinielon-distributor";
export function buildQuinielonV2Rankings(results: LaPrimeraDraw[], variant: "quinielon-v2" | "inversionistas" = "quinielon-v2") {
  const split = (session: LaPrimeraSession) => {
    const scoped = results.filter((draw) => draw.session === session);
    const ranking = buildLaPrimeraFrequencyRanking(scoped);
    const referenceDate = results.reduce((latest, draw) => draw.date > latest ? draw.date : latest, "");
    const delayThreshold = referenceDate ? subtractMonths(referenceDate, 6) : "";
    const lastDate = (number: number) => scoped.reduce(
      (latest, draw) => draw.number === number && draw.date > latest ? draw.date : latest,
      ""
    );
    const isDelayed = (number: number) => {
      const latest = lastDate(number);
      return !latest || latest <= delayThreshold;
    };
    if (variant === "inversionistas") {
      const active = ranking.filter((item) => !isDelayed(item.number));
      const nosotros = active.slice(0, 30);
      const inversionistas = active.slice(30, 60);
      const selected = new Set([...nosotros, ...inversionistas].map((item) => item.number));
      const banca = ranking.filter((item) => !selected.has(item.number)).sort((a, b) =>
        Number(isDelayed(b.number)) - Number(isDelayed(a.number)) ||
        a.count - b.count || lastDate(a.number).localeCompare(lastDate(b.number)) || a.number - b.number
      );
      return { nosotros, inversionistas, banca };
    }
    const originalTop = ranking.slice(0, 40);
    const displacedTop = new Set(originalTop.filter((item) => isDelayed(item.number)).map((item) => item.number));
    const nosotros = ranking.filter((item) => !isDelayed(item.number)).slice(0, 40);
    const ours = new Set(nosotros.map((item) => item.number));
    const remaining = ranking.filter((item) => !ours.has(item.number));
    const bank = remaining
      .filter((item) => !displacedTop.has(item.number))
      .sort((a, b) =>
        Number(isDelayed(b.number)) - Number(isDelayed(a.number)) ||
        a.count - b.count ||
        lastDate(a.number).localeCompare(lastDate(b.number)) ||
        a.number - b.number
      )
      .slice(0, 20);
    const bankNumbers = new Set(bank.map((item) => item.number));
    return {
      nosotros,
      inversionistas: remaining.filter((item) => !bankNumbers.has(item.number)),
      banca: bank
    };
  };
  return { dia: split("dia"), noche: split("noche") };
}

