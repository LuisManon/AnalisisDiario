import { z } from "zod";

export const performanceSampleSchema = z.object({
  date: z.iso.date(), windowMinutes: z.number().positive(), environment: z.enum(["production", "all"]),
  source: z.string().min(1), note: z.string().optional(),
  from: z.iso.datetime({offset:true}).optional(), to: z.iso.datetime({offset:true}).optional(), complete: z.boolean().optional(),
  routes: z.array(z.object({ route: z.string().startsWith("/"), invocations: z.number().int().nonnegative(), cpuMs: z.number().nonnegative() }))
}).superRefine((sample,ctx) => {
  if (new Set(sample.routes.map(r=>r.route)).size !== sample.routes.length) ctx.addIssue({code:"custom",message:"Rutas duplicadas."});
  if (sample.routes.some(r=>r.invocations === 0 && r.cpuMs > 0)) ctx.addIssue({code:"custom",message:"La CPU por petición requiere un denominador válido."});
  if (Boolean(sample.from) !== Boolean(sample.to) || (sample.from && sample.to && (Date.parse(sample.to)-Date.parse(sample.from))/60_000 !== sample.windowMinutes)) ctx.addIssue({code:"custom",message:"El intervalo no corresponde a la duración declarada."});
});
export type PerformanceSample = z.infer<typeof performanceSampleSchema>;
export function aggregatePerformanceDay(date: string, samples: PerformanceSample[]): PerformanceSample {
  z.iso.date().parse(date);
  if (!samples.length) throw new Error("Faltan muestras del día.");
  const ordered = [...samples].sort((a,b)=>Date.parse(a.from ?? "")-Date.parse(b.from ?? ""));
  const start = Date.parse(`${date}T00:00:00-04:00`), end = start + 86_400_000;
  let cursor = start;
  const routes = new Map<string,{route:string;invocations:number;cpuMs:number}>();
  for (const sample of ordered) {
    if (!sample.from || !sample.to || sample.complete !== true || sample.environment !== ordered[0].environment || Date.parse(sample.from) !== cursor || Date.parse(sample.to) > end) throw new Error("Las muestras deben cubrir el día dominicano sin huecos, solapamientos ni listas parciales.");
    cursor = Date.parse(sample.to);
    for (const row of sample.routes) {
      const total = routes.get(row.route) ?? {route:row.route,invocations:0,cpuMs:0};
      routes.set(row.route,{...total,invocations:total.invocations+row.invocations,cpuMs:total.cpuMs+row.cpuMs});
    }
  }
  if (cursor !== end) throw new Error("El día está incompleto.");
  return performanceSampleSchema.parse({date,windowMinutes:1440,environment:ordered[0].environment,source:"Suma de ventanas no solapadas de Vercel",from:new Date(start).toISOString(),to:new Date(end).toISOString(),complete:true,routes:[...routes.values()]});
}
export function comparePerformanceSamples(before: PerformanceSample, after: PerformanceSample) {
  if (before.windowMinutes !== after.windowMinutes || before.environment !== after.environment) throw new Error("Compara períodos de igual duración y el mismo entorno.");
  return [...new Set([...before.routes, ...after.routes].map(r=>r.route))].map(route => {
    const first = before.routes.find(r=>r.route===route), last = after.routes.find(r=>r.route===route);
    const oldAverage = first?.invocations ? first.cpuMs / first.invocations : null;
    const newAverage = last?.invocations ? last.cpuMs / last.invocations : null;
    return { route, beforeCpuMs: first?.cpuMs ?? null, afterCpuMs: last?.cpuMs ?? null, beforeCpuPerRequestMs: oldAverage, afterCpuPerRequestMs: newAverage,
      changePercent: oldAverage && newAverage !== null ? 100 * (newAverage-oldAverage)/oldAverage : null };
  });
}
