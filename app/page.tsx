import { AppShell } from "../components/AppShell";
import { readLaPrimeraResults, readLotekaRepartideraResults, readQuinielaPaleResults, readResults } from "../lib/data";

export default async function Home() {
  const results = await readResults();
  const laPrimeraResults = await readLaPrimeraResults();
  const lotekaRepartideraResults = await readLotekaRepartideraResults();
  const quinielaPaleResults = await readQuinielaPaleResults();
  return <AppShell lotoResults={results} laPrimeraResults={laPrimeraResults} lotekaRepartideraResults={lotekaRepartideraResults} quinielaPaleResults={quinielaPaleResults} />;
}
