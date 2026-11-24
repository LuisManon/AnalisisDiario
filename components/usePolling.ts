"use client";
import { useEffect, useRef } from "react";
import { createPollingTask } from "../lib/polling";

export function usePolling(key: string, task: (signal: AbortSignal) => Promise<void>, intervalMs = 300_000) {
  const latest = useRef(task); latest.current = task;
  useEffect(() => {
    const polling = createPollingTask(signal => latest.current(signal), {
      intervalMs, retryMs: intervalMs <= 60_000 ? intervalMs : 30_000, visible: () => !document.hidden,
      schedule: (callback, delay) => window.setTimeout(callback, delay), cancel: handle => window.clearTimeout(handle as number | undefined)
    });
    void polling.start();
    document.addEventListener("visibilitychange", polling.resume);
    window.addEventListener("focus", polling.resume);
    return () => {
      polling.stop(); document.removeEventListener("visibilitychange", polling.resume); window.removeEventListener("focus", polling.resume);
    };
  }, [key, intervalMs]);
}
