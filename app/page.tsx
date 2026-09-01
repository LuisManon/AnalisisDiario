import { AppShell } from "../components/AppShell";
import { readLaPrimeraQuinielaResults, readLaPrimeraResults, readLotekaRepartideraResults, readQuinielaPaleResults, readResults } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const results = await readResults();
  const laPrimeraResults = await readLaPrimeraResults();
  const laPrimeraQuinielaResults = await readLaPrimeraQuinielaResults();
  const lotekaRepartideraResults = await readLotekaRepartideraResults();
  const quinielaPaleResults = await readQuinielaPaleResults();
  return <AppShell lotoResults={results} laPrimeraResults={laPrimeraResults} laPrimeraQuinielaResults={laPrimeraQuinielaResults} lotekaRepartideraResults={lotekaRepartideraResults} quinielaPaleResults={quinielaPaleResults} />;
}
