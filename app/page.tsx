import { readKinoResults } from "../lib/super-kino-store";
import { AppShell } from "../components/AppShell";
import { readLaPrimeraLoto5Results, readLaPrimeraQuinielaResults, readLaPrimeraResults, readLotekaRepartideraResults, readQuinielaPaleResults, readResults } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const kinoResults = await readKinoResults();
  const results = await readResults();
  const laPrimeraResults = await readLaPrimeraResults();
  const laPrimeraQuinielaResults = await readLaPrimeraQuinielaResults();
  const laPrimeraLoto5Results = await readLaPrimeraLoto5Results();
  const lotekaRepartideraResults = await readLotekaRepartideraResults();
  const quinielaPaleResults = await readQuinielaPaleResults();
  return <AppShell kinoResults={kinoResults} lotoResults={results} laPrimeraResults={laPrimeraResults} laPrimeraQuinielaResults={laPrimeraQuinielaResults} laPrimeraLoto5Results={laPrimeraLoto5Results} lotekaRepartideraResults={lotekaRepartideraResults} quinielaPaleResults={quinielaPaleResults} />;
}
