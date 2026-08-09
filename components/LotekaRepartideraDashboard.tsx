"use client";

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  buildLotekaRepartideraStats,
  buildLotekaRepartideraSuggestions,
  filterLotekaByYear,
  formatLotekaNumber,
  getLotekaYears,
  lotekaRepartideraSchedule
} from "../lib/loteka-repartidera";
import type { LotekaRepartideraDraw } from "../lib/types";

type Props = {
  initialData: {
    results: LotekaRepartideraDraw[];
  };
};

type Tooltip = {
  x: number;
  y: number;
  draw: LotekaRepartideraDraw;
} | null;

const pageSize = 5;

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function LotekaBall({ number }: { number: number }) {
  return <span className="lotekaBall">{formatLotekaNumber(number)}</span>;
}

function getPreviousOccurrence(results: LotekaRepartideraDraw[], draw: LotekaRepartideraDraw) {
  const currentIndex = results.findIndex((result) => result.date === draw.date && result.number === draw.number);
  const previousIndex = results.findIndex((result, index) => index > currentIndex && result.number === draw.number);
  if (previousIndex < 0) return null;
  return {
    draw: results[previousIndex],
    delay: previousIndex
  };
}

export function LotekaRepartideraDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [status, setStatus] = useState(`Data local: ${initialData.results.length} sorteos cargados.`);
  const [historyPage, setHistoryPage] = useState(1);
  const [scatterYear, setScatterYear] = useState("todos");
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const results = data.results;
  const stats = useMemo(() => buildLotekaRepartideraStats(results), [results]);
  const suggestions = useMemo(() => buildLotekaRepartideraSuggestions(results, 5), [results]);
  const years = useMemo(() => getLotekaYears(results), [results]);
  const historyStartDate = results[results.length - 1]?.date ?? "";
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const paginatedHistory = results.slice((historyPage - 1) * pageSize, historyPage * pageSize);
  const scatterData = useMemo(() => filterLotekaByYear(results, scatterYear).slice().reverse(), [results, scatterYear]);

  useEffect(() => {
    let isMounted = true;
    const minimumLoading = new Promise((resolve) => window.setTimeout(resolve, 500));

    async function updateLatest() {
      try {
        const response = await fetch("/api/loteka-repartidera/update");
        const payload = await response.json();
        await minimumLoading;
        if (!isMounted) return;
        if (!response.ok) throw new Error(payload.message);
        if (Array.isArray(payload.results)) setData({ results: payload.results });
        setStatus(`${payload.message} Total: ${payload.total}. Ultimo: ${payload.latest?.date ?? "N/D"}.`);
      } catch {
        await minimumLoading;
        if (!isMounted) return;
        setStatus("No se pudo consultar Loteka. La data local permanece disponible.");
      } finally {
        if (isMounted) setIsPageLoading(false);
      }
    }

    updateLatest();
    return () => {
      isMounted = false;
    };
  }, []);

  function downloadHistory() {
    const blob = new Blob([`${JSON.stringify(results, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loteka-repartidera-${results[0]?.date ?? "sin-fecha"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function moveTooltip(event: ReactMouseEvent<SVGCircleElement>, draw: LotekaRepartideraDraw) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    setTooltip({
      x: Math.min(Math.max(event.clientX - bounds.left + 14, 12), bounds.width - 205),
      y: Math.min(Math.max(event.clientY - bounds.top + 14, 12), 290),
      draw
    });
  }

  if (isPageLoading) {
    return <LotekaSkeleton message="Actualizando Loteka..." />;
  }

  const latest = stats.latest;
  const previous = latest ? getPreviousOccurrence(results, latest) : null;

  return (
    <main className="lotekaTheme">
      <section className="hero lotekaHero">
        <div>
          <p className="eyebrow lotekaEyebrow">Loteka Lab local</p>
          <h1>La Repartidera MegaChance</h1>
          <p className="subcopy">
            Analisis historico del numero ganador de La Repartidera. Sorteo diario a las {lotekaRepartideraSchedule.time}, de {lotekaRepartideraSchedule.days.toLowerCase()}.
          </p>
        </div>
        <div className="heroPanel lotekaHeroPanel">
          <span className="panelLabel lotekaLabel">Ultimo sorteo</span>
          <div className="lotekaLatest">
            <span>{lotekaRepartideraSchedule.label}</span>
            <strong>{lotekaRepartideraSchedule.time}</strong>
            {latest ? <LotekaBall number={latest.number} /> : <b>Sin datos</b>}
            {latest ? (
              <div className="latestDrawDetails">
                <small>{formatShortDate(latest.date)} · {formatLongDate(latest.date)}</small>
                <small>
                  Numero ganador: <b>{formatLotekaNumber(latest.number)}</b>
                </small>
                {previous ? (
                  <small>
                    Antes salio el {formatShortDate(previous.draw.date)} · hace {previous.delay} sorteos.
                  </small>
                ) : (
                  <small>
                    No habia salido desde {historyStartDate ? formatShortDate(historyStartDate) : "el inicio del historial disponible"}.
                  </small>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="toolbar lotekaToolbar">
        <button className="downloadButton lotekaDownload" onClick={downloadHistory}>
          <span aria-hidden="true">↓</span> Descargar JSON
        </button>
        <span className="status">{status} Sugerencias historicas; no son predicciones garantizadas.</span>
      </section>

      <section className="metricsGrid">
        <div className="metric lotekaMetric">
          <span>Sorteos analizados</span>
          <strong>{stats.drawCount}</strong>
        </div>
        <div className="metric lotekaMetric">
          <span>Horario</span>
          <strong>{lotekaRepartideraSchedule.time}</strong>
        </div>
        <div className="metric lotekaMetric">
          <span>Mas caliente</span>
          <strong>{stats.topHot[0] ? formatLotekaNumber(stats.topHot[0].number) : "N/D"}</strong>
        </div>
        <div className="metric lotekaMetric">
          <span>Desde</span>
          <strong>{historyStartDate ? formatShortDate(historyStartDate) : "N/D"}</strong>
        </div>
      </section>

      <section className="twoColumn">
        <FrequencyCard title="Top 10 numeros calientes" results={results} />
        <SuggestionCard baseDate={latest?.date ?? ""} suggestions={suggestions} />
      </section>

      <section className="card scatterSection lotekaScatter">
        <div className="sectionHeader">
          <div>
            <h2>Diagrama de dispersion</h2>
            <p>Cada punto representa el numero ganador de La Repartidera en el sorteo de las {lotekaRepartideraSchedule.time}.</p>
          </div>
          <div className="scatterControls">
            <label>
              Año
              <select value={scatterYear} onChange={(event) => setScatterYear(event.target.value)}>
                <option value="todos">Todos</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="scatterWrap lotekaScatterWrap">
          {scatterData.length ? (
            <>
              <svg viewBox="0 0 920 360" role="img" aria-label="Dispersion de Repartidera MegaChance">
                <rect className="chartPlotBg" x="58" y="22" width="808" height="280" rx="8" />
                {[0, 20, 40, 60, 80, 99].map((value) => {
                  const y = 302 - (value / 99) * 280;
                  return (
                    <g key={value}>
                      <line className="chartGrid" x1="58" x2="866" y1={y} y2={y} />
                      <text className="chartTick" x="26" y={y + 4}>{value}</text>
                    </g>
                  );
                })}
                {scatterData.map((draw, index) => {
                  const x = 76 + (index / Math.max(1, scatterData.length - 1)) * 772;
                  const y = 302 - (draw.number / 99) * 280;
                  return (
                    <circle
                      key={draw.date}
                      className="lotekaPoint"
                      cx={x}
                      cy={y}
                      r="6"
                      onMouseEnter={(event) => moveTooltip(event, draw)}
                      onMouseMove={(event) => moveTooltip(event, draw)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
                <line className="chartAxis" x1="58" x2="866" y1="302" y2="302" />
                <text className="chartDate endpoint" x="58" y="332">{formatShortDate(scatterData[0].date)}</text>
                <text className="chartDate endpoint" x="780" y="332">{formatShortDate(scatterData[scatterData.length - 1].date)}</text>
                <text className="chartAxisLabel" x="390" y="350">Fecha del sorteo</text>
                <text className="chartAxisLabel" x="10" y="28">Numero</text>
              </svg>
              {tooltip ? (
                <div className="chartTooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                  <strong>{formatShortDate(tooltip.draw.date)}</strong>
                  <span>{formatLongDate(tooltip.draw.date)}</span>
                  <span>Horario: <b>{lotekaRepartideraSchedule.time}</b></span>
                  <span>Numero: <b>{formatLotekaNumber(tooltip.draw.number)}</b></span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="emptyChart">Sin datos para el filtro seleccionado.</div>
          )}
        </div>
        <div className="chartLegend">
          <span><i className="legendDot lotekaLegend" /> Repartidera</span>
        </div>
      </section>

      <section className="card">
        <div className="sectionHeader">
          <div>
            <h2>Historial paginado</h2>
            <p>{results.length} sorteos disponibles. Horario oficial: {lotekaRepartideraSchedule.time}.</p>
          </div>
          <div className="pagination">
            <button className="miniButton" disabled={historyPage === 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>
              Anterior
            </button>
            <span>Pagina {historyPage} de {pageCount}</span>
            <button className="miniButton" disabled={historyPage === pageCount} onClick={() => setHistoryPage((page) => Math.min(pageCount, page + 1))}>
              Siguiente
            </button>
          </div>
        </div>
        <div className="lotekaHistory">
          {paginatedHistory.map((draw) => (
            <article className="historyRow" key={draw.date}>
              <div className="historyDate">
                <strong>{formatShortDate(draw.date)} · {lotekaRepartideraSchedule.time}</strong>
                <span>{formatLongDate(draw.date)}</span>
              </div>
              <div className="ballsRow">
                <LotekaBall number={draw.number} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function LotekaSkeleton({ message }: { message: string }) {
  return (
    <main className="lotekaTheme">
      <section className="hero lotekaHero">
        <div>
          <div className="skeletonLine tiny" />
          <div className="skeletonBlock heroTitleSkeleton" />
          <div className="skeletonLine wide" />
        </div>
        <div className="heroPanel skeletonPanel">
          <div className="skeletonLine tiny" />
          <div className="skeletonBlock lotekaLatestSkeleton" />
        </div>
      </section>
      <section className="toolbar lotekaToolbar">
        <div className="skeletonButton" />
        <span className="status">{message}</span>
      </section>
      <section className="metricsGrid">
        {[0, 1, 2, 3].map((item) => (
          <div className="metric" key={item}>
            <div className="skeletonLine tiny" />
            <div className="skeletonLine number" />
          </div>
        ))}
      </section>
    </main>
  );
}

function FrequencyCard({ title, results }: { title: string; results: LotekaRepartideraDraw[] }) {
  const frequency = buildLotekaRepartideraStats(results).topHot;
  const max = Math.max(1, frequency[0]?.count ?? 1);

  return (
    <div className="card lotekaCard">
      <h2>{title}</h2>
      <p className="status">Sorteo diario a las {lotekaRepartideraSchedule.time}.</p>
      <div className="rankList">
        {frequency.map((item) => (
          <div className="rankItem" key={item.number}>
            <LotekaBall number={item.number} />
            <div className="bar lotekaBar"><span style={{ width: `${(item.count / max) * 100}%` }} /></div>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({
  baseDate,
  suggestions
}: {
  baseDate: string;
  suggestions: ReturnType<typeof buildLotekaRepartideraSuggestions>;
}) {
  return (
    <div className="card lotekaCard">
      <h2>5 sugerencias {baseDate ? <span className="suggestionBaseDate">(en base a la fecha {formatShortDate(baseDate)})</span> : null}</h2>
      <div className="primeraSuggestionList">
        {suggestions.map((item, index) => (
          <article key={item.number} className="primeraSuggestion">
            <span>{index + 1}</span>
            <LotekaBall number={item.number} />
            <div>
              <strong>Score {item.score}</strong>
              <small>
                Frec. {item.frequency} · Reciente {item.recent} · Atraso {item.delay}
                {item.lastDate ? ` · Ultima ${formatShortDate(item.lastDate)}` : " · Sin aparicion en historial"}
              </small>
            </div>
          </article>
        ))}
      </div>
      <p className="recommendationDisclaimer">
        Sugerencias estadisticas basadas en frecuencia, recencia y atraso del historial disponible. No garantizan aciertos.
      </p>
    </div>
  );
}
