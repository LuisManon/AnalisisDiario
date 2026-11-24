"use client";
import { clientResources } from "../lib/client-resource-cache";
import { useEffect, useState } from "react";

/** A date change never displays the preceding date's plays while loading. */
export function useSavedSnapshot<T extends { targetDate: string }>(endpoint: string, date: string | undefined, available?: T | null, version?: string) {
  const [loaded, setLoaded] = useState<{ snapshot: T | null; version?: string } | null>(null);
  const [failure, setFailure] = useState<{ date: string; message: string } | null>(null);
  const immediate = available?.targetDate === date ? available : null;
  useEffect(() => {
    if (!date || immediate) return;
    const controller = new AbortController();
    clientResources.read<{ current: T | null }>(`${endpoint}:${date}:${version ?? "unversioned"}`, `${endpoint}?date=${encodeURIComponent(date)}`, version ? Infinity : 60_000)
      .then(payload => {
        if (!controller.signal.aborted) { setLoaded({ snapshot: payload.current, version }); setFailure(null); }
      })
      .catch(error => { if (!controller.signal.aborted) setFailure({ date, message: String(error.message) }); });
    return () => controller.abort();
  }, [date, endpoint, immediate, version]);
  return { snapshot: immediate ?? (loaded && loaded.version === version && loaded.snapshot?.targetDate === date ? loaded.snapshot : null), error: !immediate && failure && failure.date === date ? failure.message : "" };
}
