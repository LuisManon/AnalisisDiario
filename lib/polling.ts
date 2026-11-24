type PollOptions = {
  intervalMs: number; retryMs?: number;
  visible: () => boolean; now?: () => number;
  schedule: (callback: () => void, delay: number) => unknown;
  cancel: (handle: unknown) => void;
};

/** One in-flight task, bounded retries, and immediate refresh on returning to a stale view. */
export function createPollingTask(task: (signal: AbortSignal) => Promise<void>, options: PollOptions) {
  let stopped = false, pending = false, timer: unknown, failures = 0, lastAttempt = -Infinity;
  let controller: AbortController | undefined;
  const now = options.now ?? Date.now;
  const queue = (delay: number) => { if (!stopped) timer = options.schedule(() => { void run(); }, delay); };
  const run = async () => {
    if (stopped || pending) return;
    options.cancel(timer);
    if (!options.visible()) { queue(options.intervalMs); return; }
    pending = true; lastAttempt = now(); controller = new AbortController();
    try { await task(controller.signal); failures = 0; }
    catch { failures++; }
    finally {
      pending = false;
      queue(failures ? Math.min(options.intervalMs, (options.retryMs ?? 30_000) * 2 ** Math.min(failures - 1, 4)) : options.intervalMs);
    }
  };
  return {
    start: run,
    resume() { if (options.visible() && now() - lastAttempt >= Math.min(60_000, options.intervalMs)) void run(); },
    stop() { stopped = true; options.cancel(timer); controller?.abort(); }
  };
}
