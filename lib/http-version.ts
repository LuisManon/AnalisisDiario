import { createHash } from "node:crypto";

export function contentVersion(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
export function matchesVersion(header: string | null, version: string) {
  return Boolean(header?.split(",").some(tag => tag.trim() === "*" || tag.trim().replace(/^W\//, "") === `"${version}"`));
}
export function versionHeaders(version: string) {
  return { ETag: `"${version}"`, "Cache-Control": "no-store", "Vercel-CDN-Cache-Control": "no-store" };
}
export function conditionalJson(request: Request, payload: unknown) {
  const raw = JSON.stringify(payload), version = contentVersion(raw), headers = versionHeaders(version);
  const response = matchesVersion(request.headers.get("if-none-match"), version)
    ? new Response(null, { status: 304, headers })
    : new Response(raw, { headers: { ...headers, "Content-Type": "application/json" } });
  if (process.env.VERCEL) {
    const url = new URL(request.url);
    console.info(JSON.stringify({ event: "snapshot-read", route: url.pathname, date: url.searchParams.get("date"), status: response.status, version }));
  }
  return response;
}
