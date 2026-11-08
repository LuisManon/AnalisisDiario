"use client";

import { useMemo, useState } from "react";
import type { LaPrimeraDraw, LaPrimeraFilter } from "../lib/types";

const longDate = (date: string) => new Intl.DateTimeFormat("es-DO", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
}).format(new Date(`${date}T12:00:00Z`));

export function QuinielonHistory({ results }: { results: LaPrimeraDraw[] }) {
  const [session, setSession] = useState<LaPrimeraFilter>("todos");
  const [date, setDate] = useState("");
  const [number, setNumber] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => results.filter(draw =>
    (session === "todos" || draw.session === session) &&
    (!date || draw.date === date) &&
    (!number.trim() || (/^\d{1,2}$/.test(number.trim()) && draw.number === Number(number)))
  ).slice().sort((a, b) => b.date.localeCompare(a.date) || (a.session === b.session ? 0 : a.session === "noche" ? -1 : 1)), [results, session, date, number]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pages);
  const visible = filtered.slice((activePage - 1) * pageSize, activePage * pageSize);

  return <section className="card quinielonHistoryCard" aria-labelledby="quinielon-history-title">
    <header className="quinielonHistoryHeader">
      <div><h2 id="quinielon-history-title">Historial de Quinielón</h2><p>{filtered.length} de {results.length} sorteos · ordenados del más reciente al más antiguo.</p></div>
      <label>Mostrar<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>
        {[10, 25, 50].map(size => <option key={size} value={size}>{size} sorteos</option>)}
      </select></label>
    </header>
    <div className="quinielonHistoryFilters">
      <label>Tanda<select value={session} onChange={event => { setSession(event.target.value as LaPrimeraFilter); setPage(1); }}>
        <option value="todos">Día y Noche</option><option value="dia">Día</option><option value="noche">Noche</option>
      </select></label>
      <label>Fecha<input type="date" value={date} onChange={event => { setDate(event.target.value); setPage(1); }} /></label>
      <label>Número ganador<input inputMode="numeric" maxLength={2} placeholder="00–99" value={number} onChange={event => { setNumber(event.target.value); setPage(1); }} /></label>
      <button type="button" disabled={session === "todos" && !date && !number} onClick={() => { setSession("todos"); setDate(""); setNumber(""); setPage(1); }}>Limpiar filtros</button>
    </div>
    {visible.length ? <ol className="quinielonHistoryList" aria-label="Resultados históricos de Quinielón">
      {visible.map(draw => <li className="quinielonHistoryRow" key={`${draw.date}-${draw.session}`}>
        <div className="quinielonHistoryDate"><time dateTime={draw.date}>{longDate(draw.date)}</time>{draw.drawId ? <small>Sorteo #{draw.drawId}</small> : null}</div>
        <span>{draw.session === "dia" ? "Día · 12:00 p. m." : "Noche · 7:00 p. m."}</span>
        <strong className={`primeraBall${draw.session === "noche" ? " dark" : ""}`} aria-label={`Número ganador ${String(draw.number).padStart(2, "0")}`}>{String(draw.number).padStart(2, "0")}</strong>
        <div className="quinielonHistorySource"><span>{draw.verification === "provisional" ? "Provisional · esperando confirmación" : draw.verification === "confirmed" ? "Confirmado" : "Registrado"}</span>{draw.source ? <a href={draw.source} target="_blank" rel="noreferrer">Ver fuente ↗</a> : <small>Sin enlace de fuente</small>}</div>
      </li>)}
    </ol> : <p className="quinielonHistoryEmpty">No hay sorteos que coincidan con estos filtros.</p>}
    <nav className="pagination" aria-label="Paginación del historial de Quinielón">
      <button type="button" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}>Anterior</button>
      <span aria-live="polite">Página {activePage} de {pages}</span>
      <button type="button" disabled={activePage >= pages} onClick={() => setPage(activePage + 1)}>Siguiente</button>
    </nav>
  </section>;
}
