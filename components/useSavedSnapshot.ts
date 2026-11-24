"use client";
import { useEffect, useState } from "react";

/** A date change never displays the preceding date's plays while loading. */
export function useSavedSnapshot<T extends { targetDate: string }>(endpoint: string, date: string | undefined, available?: T | null) {
  const [loaded, setLoaded] = useState<T | null>(null);
  const [failure, setFailure] = useState<{ date: string; message: string } | null>(null);
  const immediate = available?.targetDate === date ? available : null;
  useEffect(() => {
    if (!date || immediate) return;
    const controller = new AbortController();
    fetch(`${endpoint}?date=${encodeURIComponent(date)}`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "No se pudo cargar la cartera guardada.");
        if (!controller.signal.aborted) { setLoaded(payload.current); setFailure(null); }
      })
      .catch(error => { if (!controller.signal.aborted) setFailure({ date, message: String(error.message) }); });
    return () => controller.abort();
  }, [date, endpoint, immediate]);
  return { snapshot: immediate ?? (loaded?.targetDate === date ? loaded : null), error: !immediate && failure && failure.date === date ? failure.message : "" };
}
