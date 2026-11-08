import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { automationPlan, operationReady } from "../lib/automation-schedule.ts";

export async function runAutomation({ cron, appUrl, now = new Date(), request = fetch }: {
  cron: string; appUrl: string; now?: Date; request?: typeof fetch;
}) {
  const plan = automationPlan(cron, now);
  const report: Array<{ label: string; state: string; detail: string }> = plan.missed.map(detail => ({ label: "Ventana de preparación vencida", state: "failed", detail }));
  for (const operation of plan.operations) {
    try {
      const response = await request(new URL(operation.path, appUrl), {
        method: operation.body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "User-Agent": "AnalisisDiario-Scheduler/2.0" },
        ...(operation.body ? { body: JSON.stringify(operation.body) } : {}),
        signal: AbortSignal.timeout(180_000)
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false || payload.error) throw new Error(payload.message ?? payload.error ?? `HTTP ${response.status}`);
      const ready = operationReady(operation, payload);
      report.push({ label: operation.label, state: ready ? "ready" : plan.window.final ? "failed" : "pending", detail: ready ? `${operation.date} guardado/verificado` : `Pendiente ${operation.date}${operation.session ? ` ${operation.session}` : ""}` });
    } catch (error) {
      report.push({ label: operation.label, state: "failed", detail: error instanceof Error ? error.message : "Error de consulta" });
    }
  }
  return { date: plan.date, cron, report, failed: report.some(item => item.state === "failed") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Manual dispatch runs only the most recent applicable window, never a full day's retries.
  const cron = process.env.AUTOMATION_SCHEDULE;
  if (!cron) throw new Error("Falta AUTOMATION_SCHEDULE.");
  const result = await runAutomation({ cron, appUrl: process.env.APP_URL ?? "https://analisis-diario.vercel.app" });
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Automatización ${result.date}\n\n| Operación | Estado | Detalle |\n| --- | --- | --- |\n${result.report.map(item => `| ${item.label} | ${item.state} | ${item.detail.replace(/[|\r\n]/g, " ")} |`).join("\n")}\n`);
  if (result.failed) process.exitCode = 1;
}
