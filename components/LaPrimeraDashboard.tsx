"use client";

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  buildLaPrimeraStats,
  buildLaPrimeraSuggestions,
  filterLaPrimeraResults,
  formatQuinielonNumber,
  formatSession,
  laPrimeraSchedules
} from "../lib/la-primera";
import type { LaPrimeraDraw, LaPrimeraFilter } from "../lib/types";

type Props = {
  initialData: {
    results: LaPrimeraDraw[];
  };
};

type Tooltip = {
  x: number;
  y: number;
  draw: LaPrimeraDraw;
} | null;

const pageSize = 5;
const drawCutoffMinutes = {
  dia: 12 * 60,
  noche: 19 * 60
};

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

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function getDominicanClock() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Santo_Domingo",
    year: "numeric"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute)
  };
}

function getLatestDateLabel(draw: LaPrimeraDraw) {
  const now = getDominicanClock();
  const yesterday = addDays(now.date, -1);
  const cutoff = drawCutoffMinutes[draw.session];

  if (draw.session === "dia") {
    if (draw.date === now.date && now.minutes >= cutoff) return "Hoy";
    if (draw.date === yesterday && now.minutes < cutoff) return "Ayer";
    if (draw.date === now.date) return "Hoy";
    if (draw.date === yesterday) return "Ayer";
  }

  if (draw.session === "noche") {
    if (draw.date === now.date && now.minutes >= cutoff) return "Esta noche";
    if (draw.date === yesterday && now.minutes < cutoff) return "Anoche";
    if (draw.date === now.date) return "Esta noche";
    if (draw.date === yesterday) return "Anoche";
  }

  return formatLongDate(draw.date);
}

function getPreviousOccurrence(results: LaPrimeraDraw[], draw: LaPrimeraDraw) {
  const scoped = results.filter((result) => result.session === draw.session);
  const currentIndex = scoped.findIndex(
    (result) => result.date === draw.date && result.number === draw.number && result.session === draw.session
  );
  const previousIndex = scoped.findIndex((result, index) => index > currentIndex && result.number === draw.number);
  if (previousIndex < 0) return null;
  return {
    draw: scoped[previousIndex],
    delay: previousIndex
  };
}

function QuinielonBall({ number, tone = "red", winner = false }: { number: number; tone?: "red" | "dark"; winner?: boolean }) {
  return <span className={`${tone === "red" ? "primeraBall" : "primeraBall dark"} ${winner ? "primeraBallWinner" : ""}`}>{formatQuinielonNumber(number)}</span>;
}

export function LaPrimeraDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [status, setStatus] = useState(`Data local: ${initialData.results.length} sorteos cargados.`);
  const [session, setSession] = useState<LaPrimeraFilter>("todos");
  const [scatterSession, setScatterSession] = useState<LaPrimeraFilter>("todos");
  const [historyPage, setHistoryPage] = useState(1);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const results = data.results;
  const stats = useMemo(() => buildLaPrimeraStats(results, session), [results, session]);
  const daySuggestions = useMemo(() => buildLaPrimeraSuggestions(results, "dia", 5), [results]);
  const nightSuggestions = useMemo(() => buildLaPrimeraSuggestions(results, "noche", 5), [results]);
  const daySuggestionDate = stats.latestBySession.dia?.date ?? results[0]?.date ?? "";
  const nightSuggestionDate = stats.latestBySession.noche?.date ?? results[0]?.date ?? "";
  const history = stats.filtered;
  const historyStartDate = results[results.length - 1]?.date ?? "";
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize));
  const paginatedHistory = history.slice((historyPage - 1) * pageSize, historyPage * pageSize);
  const scatterData = useMemo(() => filterLaPrimeraResults(results, scatterSession).slice().reverse(), [results, scatterSession]);

  useEffect(() => {
    let isMounted = true;
    const minimumLoading = new Promise((resolve) => window.setTimeout(resolve, 500));

    async function updateLatest() {
      try {
        const response = await fetch("/api/la-primera/update");
        const payload = await response.json();
        await minimumLoading;
        if (!isMounted) return;
        if (!response.ok) throw new Error(payload.message);
        if (Array.isArray(payload.results)) setData({ results: payload.results });
        setStatus(`${payload.message} Total: ${payload.total}. Ultimo: ${payload.latest?.date ?? "N/D"}.`);
      } catch {
        await minimumLoading;
        if (!isMounted) return;
        setStatus("No se pudo consultar La Primera. La data local permanece disponible.");
      } finally {
        if (isMounted) setIsPageLoading(false);
      }
    }

    updateLatest();
    return () => {
      isMounted = false;
    };
  }, []);

  function changeSession(value: LaPrimeraFilter) {
    setSession(value);
    setHistoryPage(1);
  }

  function downloadHistory() {
    const blob = new Blob([`${JSON.stringify(results, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `la-primera-quinielon-${results[0]?.date ?? "sin-fecha"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function moveTooltip(event: ReactMouseEvent<SVGCircleElement>, draw: LaPrimeraDraw) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    setTooltip({
      x: Math.min(Math.max(event.clientX - bounds.left + 14, 12), bounds.width - 205),
      y: Math.min(Math.max(event.clientY - bounds.top + 14, 12), 290),
      draw
    });
  }

  if (isPageLoading) {
    return <LaPrimeraSkeleton message="Actualizando La Primera..." />;
  }

  return (
    <main className="primeraTheme">
      <section className="hero primeraHero">
        <div>
          <p className="eyebrow primeraEyebrow">La Primera Lab local</p>
          <h1>Quinielon Dia y Noche</h1>
          <p className="subcopy">
            Analisis historico para revisar frecuencia, ultimos resultados, numeros calientes y 5 sugerencias estadisticas por tanda.
          </p>
        </div>
        <div className="heroPanel primeraHeroPanel">
          <span className="panelLabel primeraLabel">Ultimos sorteos</span>
          <div className="latestSplit">
            {(["dia", "noche"] as const).map((option) => {
              const latest = stats.latestBySession[option];
              const previous = latest ? getPreviousOccurrence(results, latest) : null;
              return (
                <article key={option}>
                  <span>{laPrimeraSchedules[option].label}</span>
                  <strong>{laPrimeraSchedules[option].time}</strong>
                  {latest ? <QuinielonBall number={latest.number} /> : <b>Sin datos</b>}
                  {latest ? (
                    <div className="latestDrawDetails">
                      <small>
                        {formatShortDate(latest.date)} · <b>{getLatestDateLabel(latest)}</b>
                      </small>
                      <small>
                        Numero ganador: <b>{formatQuinielonNumber(latest.number)}</b>
                      </small>
                      {previous ? (
                        <small>
                          Antes salio el {formatShortDate(previous.draw.date)} · hace {previous.delay} sorteos de {formatSession(latest.session)}
                        </small>
                      ) : (
                        <small>
                          No habia salido en esta tanda desde {historyStartDate ? formatShortDate(historyStartDate) : "el inicio del historial"}.
                        </small>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="toolbar primeraToolbar">
        <div className="segmented primeraSegmented">
          {(["todos", "dia", "noche"] as LaPrimeraFilter[]).map((option) => (
            <button key={option} className={session === option ? "active" : ""} onClick={() => changeSession(option)}>
              {formatSession(option)}
            </button>
          ))}
        </div>
        <button className="downloadButton primeraDownload" onClick={downloadHistory}>
          <span aria-hidden="true">↓</span> Descargar JSON
        </button>
        <span className="status">{status} Las recomendaciones son historicas, no predicciones garantizadas.</span>
      </section>

      <section className="metricsGrid">
        <div className="metric primeraMetric">
          <span>Sorteos analizados</span>
          <strong>{stats.drawCount}</strong>
        </div>
        <div className="metric primeraMetric">
          <span>Filtro activo</span>
          <strong>{formatSession(session)}</strong>
        </div>
        <div className="metric primeraMetric">
          <span>Mas caliente</span>
          <strong>{stats.topHot[0] ? formatQuinielonNumber(stats.topHot[0].number) : "N/D"}</strong>
        </div>
        <div className="metric primeraMetric">
          <span>Horario</span>
          <strong>{session === "noche" ? "7:00 PM" : session === "dia" ? "12:00 PM" : "12 / 7"}</strong>
        </div>
      </section>

      <section className="twoColumn">
        <FrequencyCard title="Top 10 calientes Dia" results={filterLaPrimeraResults(results, "dia")} winningNumber={stats.latestBySession.dia?.number} />
        <FrequencyCard title="Top 10 calientes Noche" results={filterLaPrimeraResults(results, "noche")} winningNumber={stats.latestBySession.noche?.number} />
      </section>

      <section className="twoColumn">
        <SuggestionCard title="5 sugerencias Dia" baseDate={daySuggestionDate} suggestions={daySuggestions} winningNumber={stats.latestBySession.dia?.number} />
        <SuggestionCard title="5 sugerencias Noche" baseDate={nightSuggestionDate} suggestions={nightSuggestions} winningNumber={stats.latestBySession.noche?.number} />
      </section>

      <section className="card scatterSection primeraScatter">
        <div className="sectionHeader">
          <div>
            <h2>Diagrama de dispersion</h2>
            <p>Cada punto representa el numero ganador de una tanda en la fecha cargada.</p>
          </div>
          <div className="scatterControls">
            <label>
              Tanda
              <select value={scatterSession} onChange={(event) => setScatterSession(event.target.value as LaPrimeraFilter)}>
                <option value="todos">Todos</option>
                <option value="dia">Dia</option>
                <option value="noche">Noche</option>
              </select>
            </label>
          </div>
        </div>
        <div className="scatterWrap primeraScatterWrap">
          {scatterData.length ? (
            <>
              <svg viewBox="0 0 920 360" role="img" aria-label="Dispersion de Quinielon">
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
                      key={`${draw.date}-${draw.session}`}
                      className={draw.session === "dia" ? "primeraPoint" : "primeraPoint night"}
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
                  <span>Tanda: <b>{formatSession(tooltip.draw.session)}</b></span>
                  <span>Numero: <b>{formatQuinielonNumber(tooltip.draw.number)}</b></span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="emptyChart">Sin datos para el filtro seleccionado.</div>
          )}
        </div>
        <div className="chartLegend">
          <span><i className="legendDot primeraLegend" /> Dia</span>
          <span><i className="legendDot primeraLegend night" /> Noche</span>
        </div>
      </section>

      <section className="card">
        <div className="sectionHeader">
          <div>
            <h2>Historial paginado</h2>
            <p>{history.length} sorteos en el filtro {formatSession(session)}.</p>
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
        <div className="primeraHistory">
          {paginatedHistory.map((draw) => (
            <article className="historyRow" key={`${draw.date}-${draw.session}`}>
              <div className="historyDate">
                <strong>{formatShortDate(draw.date)} · {formatSession(draw.session)}</strong>
                <span>{formatLongDate(draw.date)}</span>
              </div>
              <div className="ballsRow">
                <QuinielonBall number={draw.number} tone={draw.session === "dia" ? "red" : "dark"} winner={draw.number === stats.latestBySession[draw.session]?.number} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function LaPrimeraSkeleton({ message }: { message: string }) {
  return (
    <main className="primeraTheme">
      <section className="hero primeraHero">
        <div>
          <div className="skeletonLine tiny" />
          <div className="skeletonBlock heroTitleSkeleton" />
          <div className="skeletonLine wide" />
        </div>
        <div className="heroPanel skeletonPanel">
          <div className="skeletonLine tiny" />
          <div className="latestSplit">
            <div className="skeletonBlock primeraLatestSkeleton" />
            <div className="skeletonBlock primeraLatestSkeleton" />
          </div>
        </div>
      </section>
      <section className="toolbar primeraToolbar">
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
      <section className="twoColumn">
        <div className="card"><div className="skeletonBlock primeraCardSkeleton" /></div>
        <div className="card"><div className="skeletonBlock primeraCardSkeleton" /></div>
      </section>
    </main>
  );
}

function FrequencyCard({ title, results, winningNumber }: { title: string; results: LaPrimeraDraw[]; winningNumber?: number }) {
  const frequency = buildLaPrimeraStats(results, "todos").topHot;
  const max = Math.max(1, frequency[0]?.count ?? 1);

  return (
    <div className="card primeraCard">
      <h2>{title}</h2>
      <div className="rankList">
        {frequency.map((item) => (
          <div className="rankItem" key={item.number}>
            <QuinielonBall number={item.number} winner={item.number === winningNumber} />
            <div className="bar primeraBar"><span style={{ width: `${(item.count / max) * 100}%` }} /></div>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({
  baseDate,
  title,
  suggestions,
  winningNumber
}: {
  baseDate: string;
  title: string;
  suggestions: ReturnType<typeof buildLaPrimeraSuggestions>;
  winningNumber?: number;
}) {
  return (
    <div className="card primeraCard">
      <h2>{title} {baseDate ? <span className="suggestionBaseDate">(en base a la fecha {formatShortDate(baseDate)})</span> : null}</h2>
      <div className="primeraSuggestionList">
        {suggestions.map((item, index) => (
          <article key={item.number} className="primeraSuggestion">
            <span>{index + 1}</span>
            <QuinielonBall number={item.number} winner={item.number === winningNumber} />
            <div>
              <strong>Score {item.score}</strong>
              <small>
                Frec. {item.frequency} · Reciente {item.recent} · Atraso {item.delay}
                {item.lastDate ? ` · Ultima ${formatShortDate(item.lastDate)}` : " · Sin aparicion en tanda"}
              </small>
            </div>
          </article>
        ))}
      </div>
      <p className="recommendationDisclaimer">
        Sugerencias estadisticas basadas en frecuencia, recencia y atraso. No garantizan aciertos.
      </p>
    </div>
  );
}
