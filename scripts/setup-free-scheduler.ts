import { pathToFileURL } from "node:url";
import { automationWindows } from "../lib/automation-schedule.ts";

// A short dispatch request avoids cron-job.org's free 30-second execution limit.
export function schedulerJobs(repository: string, token: string, branch = "main") {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Repositorio inválido.");
  return automationWindows.map(window => {
    const [minute, hour, , , weekdays] = window.cron.split(" ");
    const utcDays = weekdays === "*" ? [-1] : weekdays.split(",").flatMap(part => {
      const [start, end] = part.split("-").map(Number);
      return end === undefined ? [start] : Array.from({length: end - start + 1}, (_, i) => start + i);
    });
    const localHour = (Number(hour) + 20) % 24;
    const localDays = utcDays.map(day => day === -1 ? -1 : (day + (Number(hour) < 4 ? 6 : 0)) % 7);
    return {
      title: `AnalisisDiario ${repository} ${window.cron}`,
      enabled: true, saveResponses: false, requestTimeout: 30, requestMethod: 1,
      url: `https://api.github.com/repos/${repository}/actions/workflows/prepare-portfolios.yml/dispatches`,
      schedule: { timezone: "America/Santo_Domingo", expiresAt: 0,
        hours: [localHour], minutes: [Number(minute)], mdays: [-1], months: [-1], wdays: localDays },
      notification: { onFailure: true, onFailureCount: 1, onSuccess: true, onDisable: true },
      extendedData: { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
        "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
        body: JSON.stringify({ ref: branch, inputs: { schedule: window.cron } }) }
    };
  });
}

export async function installScheduler({ apiKey, repository, token, request = fetch,
  pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) }: {
  apiKey: string; repository: string; token: string; request?: typeof fetch; pause?: (ms: number) => Promise<void>;
}) {
  const jobs = schedulerJobs(repository, token);
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const listed = await request("https://api.cron-job.org/jobs", { headers, signal: AbortSignal.timeout(30_000) });
  if (!listed.ok) throw new Error(`No se pudieron consultar los jobs: HTTP ${listed.status}`);
  const existing = await listed.json() as { jobs: Array<{ jobId: number; title: string }>; someFailed?: boolean };
  if (existing.someFailed || !Array.isArray(existing.jobs)) throw new Error("Listado incompleto; no se crearán duplicados.");
  const installed: Array<{ title: string; jobId: number }> = [];
  for (const job of jobs) {
    const matches = existing.jobs.filter(item => item.title === job.title);
    if (matches.length > 1) throw new Error(`Hay jobs duplicados para ${job.title}; revisa la consola.`);
    const saved = matches[0];
    const response = await request(`https://api.cron-job.org/jobs${saved ? `/${saved.jobId}` : ""}`, {
      method: saved ? "PATCH" : "PUT", headers, body: JSON.stringify({job}), signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`No se pudo configurar ${job.title}: HTTP ${response.status}. Puedes reintentar sin duplicar.`);
    const payload = await response.json() as { jobId?: number };
    const jobId = saved?.jobId ?? payload.jobId;
    if (!jobId) throw new Error("El servicio no devolvió un identificador de job.");
    installed.push({ title: job.title, jobId });
    // Free API limit: at most five creations per minute.
    await pause(13_000);
  }
  return installed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repository = process.env.SCHEDULER_REPOSITORY ?? "LuisManon/AnalisisDiario";
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify(schedulerJobs(repository, "REDACTED"), null, 2));
  } else {
    const apiKey = process.env.CRON_JOB_API_KEY;
    const token = process.env.SCHEDULER_GITHUB_TOKEN;
    if (!apiKey || !token) throw new Error("Faltan CRON_JOB_API_KEY y SCHEDULER_GITHUB_TOKEN. Usa un token fine-grained limitado a este repositorio, Actions: write.");
    console.log(JSON.stringify(await installScheduler({apiKey, repository, token}), null, 2));
  }
}
