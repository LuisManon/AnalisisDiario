/** Browser memory only. Coalesces consumers without cancelling somebody else's read. */
export function createClientResourceCache(request: typeof fetch = fetch, clock = Date.now, limit = 128) {
  type Entry = { value?: unknown; etag?: string; expires: number; pending?: Promise<unknown> };
  const entries = new Map<string, Entry>();
  return {
    async read<T>(key: string, url: string, ttlMs = 60_000, force = false): Promise<T> {
      let entry = entries.get(key);
      if (entry?.pending) return entry.pending as Promise<T>;
      if (entry?.value !== undefined && entry.expires > clock() && !force) return entry.value as T;
      if (!entry) {
        if (entries.size >= limit) entries.delete(entries.keys().next().value!);
        entry = { expires: 0 }; entries.set(key, entry);
      }
      const current = entry;
      current.pending = (async () => {
        const response = await request(url, { cache: "no-store", headers: current.etag ? { "If-None-Match": current.etag } : {} });
        if (response.status === 304) {
          if (current.value === undefined) throw new Error("Se recibió una versión sin datos guardados.");
        } else {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? payload.message ?? "No se pudieron consultar los datos guardados.");
          current.value = payload; current.etag = response.headers.get("etag") ?? undefined;
        }
        // Missing portfolios are never retained indefinitely.
        const missing = current.value && typeof current.value === "object" && "current" in current.value && current.value.current === null;
        current.expires = clock() + (missing ? Math.min(60_000, ttlMs) : ttlMs);
        return current.value;
      })();
      try { return await current.pending as T; }
      finally { current.pending = undefined; }
    }
  };
}
export const clientResources = createClientResourceCache();
