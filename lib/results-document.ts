import { contentVersion, matchesVersion, versionHeaders } from "./http-version.ts";

/** Calculate a cheap version first; defer validation until somebody needs a body. */
export function createResultsDocument<T>(raw: string, parse: (raw: string) => T) {
  const version = contentVersion(raw);
  let parsed: T | undefined;
  return {
    version,
    respond(request: Request) {
      const headers = versionHeaders(version);
      if (matchesVersion(request.headers.get("if-none-match"), version)) return new Response(null, { status: 304, headers });
      if (new URL(request.url).searchParams.get("version") === "1") return Response.json({ version }, { headers });
      parsed ??= parse(raw);
      return Response.json({ results: parsed, version }, { headers });
    }
  };
}
