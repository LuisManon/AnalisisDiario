import { AppShell } from "../components/AppShell";
import { readLaPrimeraResults, readLotekaRepartideraResults, readResults } from "../lib/data";

export default async function Home() {
  const results = await readResults();
  const laPrimeraResults = await readLaPrimeraResults();
  const lotekaRepartideraResults = await readLotekaRepartideraResults();
  return <AppShell lotoResults={results} laPrimeraResults={laPrimeraResults} lotekaRepartideraResults={lotekaRepartideraResults} />;
}
