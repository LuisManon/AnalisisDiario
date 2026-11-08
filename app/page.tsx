import { readKinoResults } from "../lib/super-kino-store";
import { AppShell } from "../components/AppShell";
import { readLaPrimeraResults, readResults } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const kinoResults = await readKinoResults();
  const results = await readResults();
  const laPrimeraResults = await readLaPrimeraResults();
  return <AppShell kinoResults={kinoResults} lotoResults={results} laPrimeraResults={laPrimeraResults} />;
}
