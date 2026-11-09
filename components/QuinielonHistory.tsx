"use client";

import { useMemo, useState } from "react";
import type { LaPrimeraDraw, LaPrimeraFilter } from "../lib/types";
import { groupQuinielonHistory, HISTORY_PAGE_SIZE } from "../lib/history-pagination";

const longDate = (date: string) => new Intl.DateTimeFormat("es-DO", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
}).format(new Date(`${date}T12:00:00Z`));

export function QuinielonHistory({ results }: { results: LaPrimeraDraw[] }) {
  const [session, setSession] = useState<LaPrimeraFilter>("todos");
  const [date, setDate] = useState("");
  const [number, setNumber] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => groupQuinielonHistory(results, session, date, number), [results, session, date, number]);
  const pages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  const activePage = Math.min(page, pages);
  const visible = filtered.slice((activePage - 1) * HISTORY_PAGE_SIZE, activePage * HISTORY_PAGE_SIZE);

  return <section className="card quinielonHistoryCard" aria-labelledby="quinielon-history-title">
    <header className="quinielonHistoryHeader">
      <div><h2 id="quinielon-history-title">Historial de Quinielón</h2><p>{filtered.length} fechas · 5 días por página · más recientes primero.</p><p>La búsqueda conserva las tandas de cada fecha para facilitar la comparación.</p></div>
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
      {visible.map(group => <li className="quinielonHistoryDay" key={group.date}>
        <header><time dateTime={group.date}>{longDate(group.date)}</time></header>
        <div className="quinielonHistorySessions">{(["dia", "noche"] as const).filter(tanda => session === "todos" || tanda === session).map(tanda => {
          const draw = group.draws.find(item => item.session === tanda);
          return <article className={`quinielonHistorySession${draw && number.trim() && draw.number === Number(number) ? " isSearchMatch" : ""}`} key={tanda}>
            <div><h3>{tanda === "dia" ? "Día" : "Noche"}</h3><small>{tanda === "dia" ? "12:00 p. m." : "7:00 p. m."}</small></div>
            {draw ? <><strong className={`primeraBall${tanda === "noche" ? " dark" : ""}`} aria-label={`Número ganador ${String(draw.number).padStart(2, "0")}`}>{String(draw.number).padStart(2, "0")}</strong>
              <div className="quinielonHistorySource"><span>{draw.verification === "provisional" ? "Provisional · esperando confirmación" : draw.verification === "confirmed" ? "Confirmado" : "Registrado"}</span>{draw.drawId ? <small>Sorteo #{draw.drawId}</small> : null}{draw.source ? <a href={draw.source} target="_blank" rel="noreferrer">Ver fuente ↗</a> : <small>Sin enlace de fuente</small>}</div></> : <p className="muted">Sin registro</p>}
          </article>;
        })}</div>
      </li>)}
    </ol> : <p className="quinielonHistoryEmpty">No hay sorteos que coincidan con estos filtros.</p>}
    <nav className="pagination" aria-label="Paginación del historial de Quinielón">
      <button type="button" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)}>Anterior</button>
      <span aria-live="polite">Página {activePage} de {pages}</span>
      <button type="button" disabled={activePage >= pages} onClick={() => setPage(activePage + 1)}>Siguiente</button>
    </nav>
  </section>;
}
