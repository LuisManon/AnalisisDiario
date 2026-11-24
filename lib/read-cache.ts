/** Coalesces concurrent reads; failed reads are never cached. */
export function createReadCache<T>(ttlMs: number, limit = 128, clock = Date.now) {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();
  return {
    clear() { entries.clear(); },
    read(key: string, load: () => Promise<T>): Promise<T> {
      const cached = entries.get(key);
      if (cached && cached.expires > clock()) return cached.value;
      if (entries.size >= limit) entries.delete(entries.keys().next().value!);
      // All layers expire in the same time window: an old lower-layer value
      // cannot acquire a new full lifetime in an upper layer.
      const entry = { expires: (Math.floor(clock() / ttlMs) + 1) * ttlMs, value: Promise.resolve().then(load) };
      entries.set(key, entry);
      entry.value.catch(() => { if (entries.get(key) === entry) entries.delete(key); });
      return entry.value;
    }
  };
}
