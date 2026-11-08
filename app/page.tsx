import { readKinoResults } from "../lib/super-kino-store";
import { AppShell } from "../components/AppShell";
import { readLaPrimeraResults, readResults } from "../lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [kinoResults, results, laPrimeraResults] = await Promise.all([
    readKinoResults(), readResults(), readLaPrimeraResults()
  ]);
  return <AppShell kinoResults={kinoResults} lotoResults={results} laPrimeraResults={laPrimeraResults} />;
}
