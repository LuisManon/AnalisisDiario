"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DrawBalls } from "./DrawBalls";
import {
  analyzeCombined,
  analyzeDays,
  analyzeMain,
  analyzePlus,
  analyzePositions,
  buildAppearanceHistory,
  statusLabels,
  type AnalysisMetric,
  type SearchPosition,
  type SearchType
} from "../lib/number-analysis";
import type { DayFilter, DrawResult } from "../lib/types";

function formatDate(date: string | null) {
  if (!date) return "Nunca";
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function formatDay(day: string) {
  return day === "miercoles" ? "Miércoles" : day === "sabado" ? "Sábado" : "Todos";
}

function metricValue(value: number | null, suffix = "") {
  return value === null ? "N/D" : `${value}${suffix}`;
}

function StatusBadge({ status }: { status: AnalysisMetric["status"] }) {
  return <span className={`numberStatus status-${status}`}>{statusLabels[status]}</span>;
}

function MetricCards({ metric }: { metric: AnalysisMetric }) {
  return (
    <div className="numberMetricGrid">
      <div><span>Sorteos analizados</span><strong>{metric.totalDraws}</strong></div>
      <div><span>Veces que salió</span><strong>{metric.appearances}</strong></div>
      <div><span>Porcentaje</span><strong>{metricValue(metric.percentage, "%")}</strong></div>
      <div><span>Última fecha</span><strong>{formatDate(metric.lastDate)}</strong></div>
      <div><span>Atraso actual</span><strong>{metricValue(metric.currentDelay, " sorteos")}</strong></div>
      <div><span>Estado</span><StatusBadge status={metric.status} /></div>
    </div>
  );
}

function SearchAccordion({
  title,
  summary,
  children,
  defaultOpen = false
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="numberAccordion" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        {summary ? <small>{summary}</small> : null}
      </summary>
      <div className="numberAccordionBody">{children}</div>
    </details>
  );
}

export function NumberSearch({ results }: { results: DrawResult[] }) {
  const [mainNumber, setMainNumber] = useState(14);
  const [plusNumber, setPlusNumber] = useState(8);
  const [type, setType] = useState<SearchType>("main");
  const [position, setPosition] = useState<SearchPosition>("any");
  const [day, setDay] = useState<DayFilter>("todos");
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const pageSize = 5;
  const effectiveType = position === "plus" ? "plus" : type;
  const includeMain = effectiveType !== "plus";
  const includePlus = effectiveType !== "main";

  const primaryMetric = useMemo(() => {
    if (effectiveType === "main") return analyzeMain(results, mainNumber, day, position);
    if (effectiveType === "plus") return analyzePlus(results, plusNumber, day);
    return analyzeCombined(results, mainNumber, plusNumber, day, position);
  }, [day, effectiveType, mainNumber, plusNumber, position, results]);
  const positionRows = useMemo(() => analyzePositions(results, mainNumber, day), [day, mainNumber, results]);
  const dayRows = useMemo(
    () => analyzeDays(results, mainNumber, plusNumber, effectiveType, position),
    [effectiveType, mainNumber, plusNumber, position, results]
  );
  const plusMetric = useMemo(() => analyzePlus(results, plusNumber, day), [day, plusNumber, results]);
  const plusDayRows = useMemo(
    () => analyzeDays(results, mainNumber, plusNumber, "plus", "plus"),
    [mainNumber, plusNumber, results]
  );
  const history = useMemo(
    () => buildAppearanceHistory(results, mainNumber, plusNumber, effectiveType, position, day),
    [day, effectiveType, mainNumber, plusNumber, position, results]
  );
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const positionLabel = effectiveType === "plus"
    ? "Número Más"
    : position === "any"
      ? "Cualquier posición"
      : `Posición ${position}`;
  const subject = effectiveType === "plus"
    ? `El número Más ${plusNumber}`
    : effectiveType === "both"
      ? `El número ${mainNumber} y el Más ${plusNumber}`
      : `El número ${mainNumber}`;
  const interpretation = primaryMetric.appearances
    ? `${subject} apareció ${primaryMetric.appearances} veces (${primaryMetric.percentage}%) en ${positionLabel.toLowerCase()} para ${formatDay(day).toLowerCase()}. Su última aparición fue el ${formatDate(primaryMetric.lastDate)}, hace ${primaryMetric.currentDelay} sorteos. Actualmente se clasifica como ${statusLabels[primaryMetric.status]}.`
    : `${subject} nunca ha salido en ${positionLabel.toLowerCase()} para el filtro ${formatDay(day)} según el historial disponible.`;

  function resetPage() {
    setPage(1);
  }

  function markQueryPending() {
    resetPage();
    setHasSearched(false);
  }

  function clearSearch() {
    setMainNumber(14);
    setPlusNumber(8);
    setType("main");
    setPosition("any");
    setDay("todos");
    setPage(1);
    setHasSearched(false);
  }

  return (
    <>
      <section className="sectionHeader">
        <h2>Buscador de Números</h2>
        <p>Análisis estadístico histórico de números principales y número Más.</p>
      </section>
      <section className="card numberSearch">
        <SearchAccordion title="Filtros de búsqueda" summary={hasSearched ? `${subject} · ${positionLabel} · ${formatDay(day)}` : "Configura los criterios y pulsa Buscar"} defaultOpen>
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); setHasSearched(true); }}>
            <div className="numberSearchFilters">
            <label>
              Número principal
              <input type="number" min="1" max="40" value={mainNumber} disabled={!includeMain} onChange={(event) => { setMainNumber(Math.min(40, Math.max(1, Number(event.target.value)))); markQueryPending(); }} />
            </label>
            <label>
              Número Más
              <input type="number" min="1" max="12" value={plusNumber} disabled={!includePlus} onChange={(event) => { setPlusNumber(Math.min(12, Math.max(1, Number(event.target.value)))); markQueryPending(); }} />
            </label>
            <label>
              Tipo de búsqueda
              <select value={type} onChange={(event) => {
                const nextType = event.target.value as SearchType;
                setType(nextType);
                if (nextType === "plus") setPosition("plus");
                if (nextType === "main" && position === "plus") setPosition("any");
                markQueryPending();
              }}>
                <option value="main">Solo números principales</option>
                <option value="plus">Solo número Más</option>
                <option value="both">Principales + número Más</option>
              </select>
            </label>
            <label>
              Posición
              <select disabled={type === "plus"} value={position} onChange={(event) => { setPosition(event.target.value as SearchPosition); markQueryPending(); }}>
                <option value="any">Cualquier posición</option>
                {[1, 2, 3, 4, 5, 6].map((value) => <option value={value} key={value}>Posición {value}</option>)}
                <option value="plus">Número Más</option>
              </select>
            </label>
            <label>
              Día del sorteo
              <select value={day} onChange={(event) => { setDay(event.target.value as DayFilter); markQueryPending(); }}>
                <option value="todos">Todos</option>
                <option value="miercoles">Miércoles</option>
                <option value="sabado">Sábado</option>
              </select>
            </label>
            </div>
            <div className="numberSearchActions">
              <button className="primaryButton" type="submit">Buscar</button>
              <button className="secondaryButton" type="button" onClick={clearSearch}>Limpiar filtro</button>
            </div>
          </form>
        </SearchAccordion>

        {hasSearched ? (
          <>
        <SearchAccordion title="Resumen principal" summary={`${primaryMetric.appearances} apariciones · ${primaryMetric.percentage}%`} defaultOpen>
          <div className="numberSearchTitle">
            <div>
              <span className="panelLabel">Resumen principal</span>
              <h3>{subject} · {positionLabel} · {formatDay(day)}</h3>
            </div>
            <StatusBadge status={primaryMetric.status} />
          </div>
          <MetricCards metric={primaryMetric} />
        </SearchAccordion>

        <SearchAccordion title="Métricas adicionales" summary={`Atraso ${metricValue(primaryMetric.currentDelay)} · últimos 20: ${primaryMetric.recent[20].percentage}%`}>
          <div className="additionalMetrics">
            <span>Promedio entre apariciones <strong>{metricValue(primaryMetric.averageGap, " sorteos")}</strong></span>
            <span>Máximo atraso histórico <strong>{metricValue(primaryMetric.maxGap, " sorteos")}</strong></span>
            <span>Racha más larga sin aparecer <strong>{metricValue(primaryMetric.maxGap, " sorteos")}</strong></span>
            <span>Histórica vs. reciente <strong>{primaryMetric.percentage}% vs. {primaryMetric.recent[20].percentage}%</strong></span>
            {([10, 20, 50, 100] as const).map((size) => (
              <span key={size}>Últimos {size} <strong>{primaryMetric.recent[size].appearances} · {primaryMetric.recent[size].percentage}%</strong></span>
            ))}
          </div>
        </SearchAccordion>

        {includeMain ? (
          <SearchAccordion title="Análisis por posición" summary="Frecuencia por P1, P2, P3, P4, P5 y P6">
            <div className="numberTableWrap">
              <table className="numberTable">
                <thead><tr><th>Posición</th><th>Veces</th><th>Porcentaje</th><th>Última fecha</th><th>Atraso</th><th>Estado</th></tr></thead>
                <tbody>
                  {positionRows.map(({ position: rowPosition, metric }) => (
                    <tr key={rowPosition}>
                      <td>{rowPosition}</td><td>{metric.appearances}</td><td>{metric.percentage}%</td>
                      <td>{formatDate(metric.lastDate)}</td><td>{metricValue(metric.currentDelay)}</td>
                      <td><StatusBadge status={metric.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SearchAccordion>
        ) : null}

        <SearchAccordion title="Análisis por día" summary="Miércoles vs. sábado">
          <div className="numberTableWrap">
            <table className="numberTable">
              <thead><tr><th>Día</th><th>Sorteos</th><th>Veces</th><th>Porcentaje</th><th>Última fecha</th><th>Atraso</th><th>Estado</th></tr></thead>
              <tbody>
                {dayRows.map(({ day: rowDay, metric }) => (
                  <tr key={rowDay}>
                    <td>{formatDay(rowDay)}</td><td>{metric.totalDraws}</td><td>{metric.appearances}</td><td>{metric.percentage}%</td>
                    <td>{formatDate(metric.lastDate)}</td><td>{metricValue(metric.currentDelay)}</td>
                    <td><StatusBadge status={metric.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SearchAccordion>

        {includePlus ? (
          <SearchAccordion title={`Número Más ${plusNumber}`} summary={`${plusMetric.appearances} apariciones · ${plusMetric.percentage}%`}>
            <div className="numberSearchTitle">
              <div><span className="panelLabel">Número Más</span><h3>Análisis separado del Más {plusNumber}</h3></div>
              <StatusBadge status={plusMetric.status} />
            </div>
            <MetricCards metric={plusMetric} />
            <div className="additionalMetrics plusAdditionalMetrics">
              <span>Miércoles <strong>{plusDayRows[0].metric.appearances} · {plusDayRows[0].metric.percentage}%</strong></span>
              <span>Sábado <strong>{plusDayRows[1].metric.appearances} · {plusDayRows[1].metric.percentage}%</strong></span>
              <span>Promedio entre apariciones <strong>{metricValue(plusMetric.averageGap, " sorteos")}</strong></span>
              <span>Máximo atraso histórico <strong>{metricValue(plusMetric.maxGap, " sorteos")}</strong></span>
              <span>Atraso actual <strong>{metricValue(plusMetric.currentDelay, " sorteos")}</strong></span>
              <span>Histórica vs. reciente <strong>{plusMetric.percentage}% vs. {plusMetric.recent[20].percentage}%</strong></span>
            </div>
          </SearchAccordion>
        ) : null}

        <SearchAccordion title="Historial de apariciones" summary={`${history.length} resultados`}>
          <div className="numberHistoryHeader">
            <h3>Historial de apariciones</h3>
            <span>{history.length} resultados</span>
          </div>
          {visibleHistory.length ? (
            <div className="numberHistory">
              {visibleHistory.map((row) => (
                <article key={`${row.date}-${row.positions.join("-")}`}>
                  <div><strong>{formatDate(row.date)}</strong><span>{formatDay(row.day)} · Sorteo #{row.drawId}</span></div>
                  <DrawBalls numbers={row.numbers} plus={row.plus} winningNumbers={results[0]?.numbers} winningPlus={results[0]?.plus} />
                  <strong className="positionTag">{row.positions.join(", ")}</strong>
                </article>
              ))}
            </div>
          ) : <p className="emptyNumberResult">Este número nunca ha salido en esta posición según el historial disponible.</p>}
          <nav className="pagination" aria-label="Paginación del historial de apariciones">
            <button className="secondaryButton" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
            <span>Página {currentPage} de {pageCount}</span>
            <button className="secondaryButton" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Siguiente</button>
          </nav>
        </SearchAccordion>

        <SearchAccordion title="Interpretación automática" summary={statusLabels[primaryMetric.status]} defaultOpen>
          <div className="numberInterpretation">
            <span className="panelLabel">Interpretación automática</span>
            <p>{interpretation}</p>
            <small>Análisis histórico informativo. No predice ni garantiza resultados futuros.</small>
          </div>
        </SearchAccordion>
          </>
        ) : null}
      </section>
    </>
  );
}
