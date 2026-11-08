"use client";

import { useEffect, useState } from "react";
import { latestPublishedSlot, publicationWindow, type ScheduledProduct } from "../lib/draw-schedule";

export function DrawPublicationStatus({ product, results }: {
  product: ScheduledProduct;
  results: Array<{ date: string; session?: "dia" | "noche" }>;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!now) return null;
  const running = publicationWindow(product, now);
  const slot = running ?? latestPublishedSlot(product, now);
  if (results.some(draw => draw.date === slot.date && (!slot.session || draw.session === slot.session))) return null;
  const date = new Intl.DateTimeFormat("es-DO", {
    weekday: "long", day: "numeric", month: "long", timeZone: "America/Santo_Domingo"
  }).format(new Date(`${slot.date}T12:00:00-04:00`));
  const dateLabel = date.charAt(0).toUpperCase() + date.slice(1);
  return <div className={`drawPublicationStatus ${running ? "inProgress" : "awaiting"}`} role="status" aria-live="polite">
    <strong>{running ? "Sorteo en curso" : "Esperando publicación de resultados"}</strong>
    <span className="drawPublicationDate">{dateLabel}{slot.session ? ` · Tanda ${slot.session === "dia" ? "Día" : "Noche"}` : ""}</span>
    <span>{running
      ? `Debe esperar ${running.remainingMinutes} ${running.remainingMinutes === 1 ? "minuto" : "minutos"} para conocer el resultado.`
      : "Los ganadores aún no están disponibles. La automatización los consultará en las ventanas programadas."}</span>
    <small>Puede continuar revisando los datos y realizando su análisis.</small>
  </div>;
}
