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
import { buildQuinielaSuggestions, formatQuinielaNumber } from "../lib/quiniela-pale";
import { getNextLoto5Date } from "../lib/la-primera-loto5";
import type { LaPrimeraDraw, LaPrimeraFilter, LaPrimeraLoto5Draw, LaPrimeraQuinielaDraw, LaPrimeraSession, Loto5PortfolioPlay, Loto5PortfolioSnapshot, QuinielaPaleDraw } from "../lib/types";

type LaPrimeraProduct = "quinielon" | "quiniela" | "loto5";

type Props = {
  initialData: {
    results: LaPrimeraDraw[];
    quinielaResults: LaPrimeraQuinielaDraw[];
    loto5Results: LaPrimeraLoto5Draw[];
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
  const [product, setProduct] = useState<LaPrimeraProduct>("quinielon");
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
        if (Array.isArray(payload.results)) setData({
          results: payload.results,
          quinielaResults: Array.isArray(payload.quinielaResults) ? payload.quinielaResults : initialData.quinielaResults,
          loto5Results: Array.isArray(payload.loto5Results) ? payload.loto5Results : initialData.loto5Results
        });
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

  if (product === "quiniela") {
    return <LaPrimeraQuinielaView results={data.quinielaResults} onProductChange={setProduct} status={status} />;
  }

  if (product === "loto5") {
    return <LaPrimeraLoto5View results={data.loto5Results} onProductChange={setProduct} status={status} />;
  }

  return (
    <main className="primeraTheme">
      <ProductSwitch product={product} onChange={setProduct} />
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
        <FrequencyCard title="Top 20 calientes Dia" results={filterLaPrimeraResults(results, "dia")} winningNumber={stats.latestBySession.dia?.number} />
        <FrequencyCard title="Top 20 calientes Noche" results={filterLaPrimeraResults(results, "noche")} winningNumber={stats.latestBySession.noche?.number} />
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

function ProductSwitch({ product, onChange }: { product: LaPrimeraProduct; onChange: (product: LaPrimeraProduct) => void }) {
  return (
    <nav className="primeraProductSwitch" aria-label="Producto de La Primera">
      <button className={product === "quinielon" ? "active" : ""} onClick={() => onChange("quinielon")}>El Quinielón</button>
      <button className={product === "quiniela" ? "active" : ""} onClick={() => onChange("quiniela")}>Quiniela Día/Noche</button>
      <button className={product === "loto5" ? "active" : ""} onClick={() => onChange("loto5")}>Loto 5</button>
    </nav>
  );
}

function quinielaTopByPosition(results: LaPrimeraQuinielaDraw[]) {
  return Array.from({ length: 3 }, (_, position) => {
    const counts = Array(100).fill(0) as number[];
    for (const draw of results) counts[draw.numbers[position]] += 1;
    return counts.map((count, number) => ({ number, count }))
      .sort((a, b) => b.count - a.count || a.number - b.number)
      .slice(0, 20);
  });
}

function nextDateAfter(date: string) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function PrimeraQuinielaBall({ number, position, winner = false }: { number: number; position: number; winner?: boolean }) {
  return <span className={`primeraQuinielaBall p${position + 1} ${winner ? "winner" : ""}`}>{formatQuinielaNumber(number)}</span>;
}

function LaPrimeraQuinielaView({
  results,
  onProductChange,
  status
}: {
  results: LaPrimeraQuinielaDraw[];
  onProductChange: (product: LaPrimeraProduct) => void;
  status: string;
}) {
  const [session, setSession] = useState<LaPrimeraSession>("dia");
  const scoped = useMemo(() => results.filter((draw) => draw.session === session), [results, session]);
  const latest = scoped[0] ?? null;
  const targetDate = latest ? nextDateAfter(latest.date) : "";
  const positionTops = useMemo(() => quinielaTopByPosition(scoped), [scoped]);
  const suggestionInput = useMemo<QuinielaPaleDraw[]>(() => scoped.map((draw) => ({ date: draw.date, numbers: draw.numbers, source: draw.source })), [scoped]);
  const suggestions = useMemo(() => targetDate ? buildQuinielaSuggestions(suggestionInput, targetDate, 5) : [], [suggestionInput, targetDate]);

  return (
    <main className="primeraTheme primeraQuinielaTheme">
      <ProductSwitch product="quiniela" onChange={onProductChange} />
      <section className="hero primeraHero">
        <div>
          <p className="eyebrow primeraEyebrow">La Primera · producto independiente</p>
          <h1>Quiniela Día y Noche</h1>
          <p className="subcopy">Tres posiciones del 00 al 99. Tops y recomendaciones separados por tanda.</p>
        </div>
        <div className="heroPanel primeraHeroPanel">
          <span className="panelLabel primeraLabel">Último resultado · {formatSession(session)}</span>
          <strong>{latest ? formatShortDate(latest.date) : "Sin datos"}</strong>
          <div className="primeraQuinielaBalls">{latest?.numbers.map((number, position) => <PrimeraQuinielaBall key={position} number={number} position={position} />)}</div>
          <small>{session === "dia" ? "12:00 PM" : "7:00 PM"}</small>
        </div>
      </section>

      <section className="toolbar primeraToolbar quinielaSimpleToolbar">
        <div className="segmented primeraSegmented">
          {(["dia", "noche"] as LaPrimeraSession[]).map((option) => <button key={option} className={session === option ? "active" : ""} onClick={() => setSession(option)}>{formatSession(option)}</button>)}
        </div>
        <span className="status">{scoped.length} sorteos de {formatSession(session)} · {status}</span>
      </section>

      <section className="primeraQuinielaTopGrid">
        {positionTops.map((items, position) => (
          <article className="card primeraCard" key={position}>
            <h2>Top 20 · P{position + 1}</h2>
            <div className="primeraQuinielaRankList">
              {items.map((item, rank) => (
                <div className="primeraQuinielaRank" key={item.number}>
                  <b>#{rank + 1}</b>
                  <PrimeraQuinielaBall number={item.number} position={position} winner={latest?.numbers[position] === item.number} />
                  <span>{item.count} salidas</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="card primeraCard primeraQuinielaRecommendations">
        <div>
          <h2>5 recomendaciones · {formatSession(session)}</h2>
          <p className="mutedText">Inclinadas al {targetDate ? formatLongDate(targetDate) : "próximo sorteo"}, usando solamente el histórico de esta tanda.</p>
        </div>
        <div className="primeraQuinielaSuggestionGrid">
          {suggestions.map((play) => (
            <article key={play.id}>
              <span className={`recommendationProfile ${play.profile}`}>{play.profile === "fuerte" ? "Fuerte" : play.profile === "equilibrada" ? "Equilibrada" : "Exploratoria"}</span>
              <div className="primeraQuinielaBalls">{play.numbers.map((number, position) => <PrimeraQuinielaBall key={position} number={number} position={position} />)}</div>
              <strong>{play.score} pts</strong>
            </article>
          ))}
        </div>
        <p className="recommendationDisclaimer">Análisis estadístico; no predice ni garantiza resultados.</p>
      </section>
    </main>
  );
}

const loto5Prizes = [
  { hits: "5 + Más", prize: "RD$30,000,000" },
  { hits: "5", prize: "RD$3,000,000" },
  { hits: "4 + Más", prize: "RD$30,000" },
  { hits: "4", prize: "RD$5,000" },
  { hits: "3 + Más", prize: "RD$1,000" },
  { hits: "3", prize: "RD$100" },
  { hits: "2 + Más", prize: "RD$60" },
  { hits: "2", prize: "RD$20" }
];

const loto5PositionColors = ["#fd0100", "#333333", "#d79b25", "#8d2db5", "#147a62", "#d65a12"];

function loto5CoverageRange(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b);
  if (!sorted.length) return { low: 0, high: 0 };
  const sampleSize = Math.max(1, Math.ceil(sorted.length * 0.8));
  let low = sorted[0];
  let high = sorted[sampleSize - 1];
  for (let start = 1; start + sampleSize <= sorted.length; start += 1) {
    const candidateLow = sorted[start];
    const candidateHigh = sorted[start + sampleSize - 1];
    if (candidateHigh - candidateLow < high - low) {
      low = candidateLow;
      high = candidateHigh;
    }
  }
  return { low, high };
}

function Loto5RangeMap({ results }: { results: LaPrimeraLoto5Draw[] }) {
  const rows = Array.from({ length: 5 }, (_, position) => {
    const values = results.map((draw) => draw.numbers[position]);
    const { low, high } = loto5CoverageRange(values);
    return { position, low, high, average: values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length), omitted: values.filter((value) => value < low || value > high).length };
  });
  const ticks = [1, 5, 10, 15, 20, 25, 30, 35, 38];

  return <section className="rangeMap loto5RangeMap" aria-label="Mapa de rangos de Loto 5 por posición">
    <div className="rangeMapHeader"><div><span className="panelLabel">Mapa de rangos</span><h3>Rango normal de salida por posición</h3></div><p>Intervalo más compacto que concentra el 80% de las apariciones en cada posición.</p></div>
    <div className="rangeAxis" aria-hidden="true">{ticks.map((tick) => <span key={tick} style={{ left: `${((tick - 1) / 37) * 100}%` }}>{String(tick).padStart(2, "0")}</span>)}</div>
    <div className="rangeRows">{rows.map((row) => {
      const left = ((row.low - 1) / 37) * 100;
      const right = ((row.high - 1) / 37) * 100;
      const color = loto5PositionColors[row.position];
      return <article className="rangeRow" key={row.position}><div className="rangeLabel"><i style={{ background: color }} /><strong>P{row.position + 1}</strong><span>Posición {row.position + 1}</span></div><div className="rangeTrack"><div className="rangeBandGlow" style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, background: color }} /><div className="rangeBand" style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, background: color }} /><span className="rangeStart" style={{ left: `${left}%` }}>{String(row.low).padStart(2, "0")}</span><span className="rangeEnd" style={{ left: `${right}%` }}>{String(row.high).padStart(2, "0")}</span></div><div className="rangeStats"><strong>{String(row.low).padStart(2, "0")} - {String(row.high).padStart(2, "0")}</strong><span>Prom. {row.average.toFixed(1)} · {row.omitted} fuera · {results.length} sorteos</span></div></article>;
    })}</div>
  </section>;
}

function Loto5Ball({ number, plus = false, winner = false }: { number: number; plus?: boolean; winner?: boolean }) {
  return <span className={`primeraLoto5Ball ${plus ? "plus" : ""} ${winner ? "winner" : ""}`}>{String(number).padStart(2, "0")}</span>;
}

function loto5PrizeLabel(matches: number, plus: boolean) {
  return loto5Prizes.find((prize) => prize.hits === `${matches}${plus ? " + Más" : ""}`)?.prize ?? "Sin premio";
}

function Loto5PortfolioView({ portfolio, winningDraw }: { portfolio: Loto5PortfolioSnapshot; winningDraw?: LaPrimeraLoto5Draw }) {
  const profileLabels: Record<Loto5PortfolioPlay["profile"], string> = { fuerte: "Fuertes", equilibrada: "Equilibradas", exploratoria: "Exploratorias" };
  return <section className="loto5PortfolioBody">
    <header className="portfolioTarget"><div><span className="panelLabel">{winningDraw ? "Sorteo evaluado" : "Sorteo objetivo"}</span><h2>{formatLongDate(portfolio.targetDate)}</h2></div><p>Algoritmo {portfolio.algorithmVersion} · histórico hasta {portfolio.historicalThrough ? formatShortDate(portfolio.historicalThrough) : "N/D"}</p></header>
    <div className="loto5PortfolioColumns">{(["fuerte", "equilibrada", "exploratoria"] as const).map((profile) => <article className={`loto5PortfolioColumn ${profile}`} key={profile}><header><h3>{profileLabels[profile]}</h3><strong>20</strong></header><div className="loto5PortfolioList">{portfolio.plays.filter((play) => play.profile === profile).map((play, index) => {
      const matches = winningDraw ? play.numbers.filter((number) => winningDraw.numbers.includes(number)).length : 0;
      const plusMatched = winningDraw?.plus === play.plus;
      return <div className="loto5PortfolioPlay" key={play.id}><div className="portfolioPlayMeta"><b>#{index + 1}</b><span>{play.score} pts</span>{play.exactPositionRepeat ? <em>Repite posición</em> : null}</div><div className="primeraLoto5Balls">{play.numbers.map((number, position) => <span className={winningDraw?.numbers[position] === number ? "loto5ExactPosition" : ""} key={`${position}-${number}`}><Loto5Ball number={number} winner={winningDraw?.numbers.includes(number)} /></span>)}<i>+</i><Loto5Ball number={play.plus} plus winner={plusMatched} /></div><small>{winningDraw ? `${matches} aciertos${plusMatched ? " + Más" : ""} · ${loto5PrizeLabel(matches, Boolean(plusMatched))}` : play.explanation}</small></div>;
    })}</div></article>)}</div>
  </section>;
}

function LaPrimeraLoto5View({
  results,
  onProductChange,
  status
}: {
  results: LaPrimeraLoto5Draw[];
  onProductChange: (product: LaPrimeraProduct) => void;
  status: string;
}) {
  const [historyPage, setHistoryPage] = useState(1);
  const [portfolioRequested, setPortfolioRequested] = useState(false);
  const [portfolio, setPortfolio] = useState<Loto5PortfolioSnapshot | null>(null);
  const [previousPortfolio, setPreviousPortfolio] = useState<(Loto5PortfolioSnapshot & { draw: LaPrimeraLoto5Draw }) | null>(null);
  const [portfolioMessage, setPortfolioMessage] = useState("Abre la sección para generar las 60 jugadas.");
  const latest = results[0] ?? null;
  const oldest = results.at(-1) ?? null;
  const positionTops = useMemo(() => Array.from({ length: 6 }, (_, position) => {
    const maximum = position === 5 ? 10 : 38;
    const counts = Array(maximum + 1).fill(0) as number[];
    for (const draw of results) counts[position === 5 ? draw.plus : draw.numbers[position]] += 1;
    return counts.slice(1).map((count, index) => ({ number: index + 1, count })).sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 5);
  }), [results]);
  const pageCount = Math.max(1, Math.ceil(results.length / 10));
  const history = results.slice((historyPage - 1) * 10, historyPage * 10);
  const targetDate = getNextLoto5Date(results);

  useEffect(() => {
    if (!portfolioRequested) return;
    setPortfolioMessage("Cargando o creando el fotograma de 60 jugadas…");
    fetch(`/api/la-primera/loto5-portfolio?drawDate=${targetDate}`)
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload) => { setPortfolio(payload.current ?? null); setPreviousPortfolio(payload.previous ?? null); setPortfolioMessage(""); })
      .catch(() => setPortfolioMessage("No se pudo crear el fotograma de Loto 5."));
  }, [portfolioRequested, targetDate]);

  return (
    <main className="primeraTheme primeraLoto5Theme">
      <ProductSwitch product="loto5" onChange={onProductChange} />
      <section className="hero primeraHero loto5Hero">
        <div>
          <p className="eyebrow primeraEyebrow">La Primera · sorteo diario</p>
          <h1>Loto 5 y Loto 5 Más</h1>
          <p className="subcopy">Cinco números del 01 al 38 y un adicional Más del 01 al 10. El orden de los aciertos no importa.</p>
        </div>
        <div className="heroPanel primeraHeroPanel">
          <span className="panelLabel primeraLabel">Último resultado · 7:00 PM</span>
          <strong>{latest ? formatLongDate(latest.date) : "Sin datos"}</strong>
          <div className="primeraLoto5Balls">
            {latest?.numbers.map((number) => <Loto5Ball key={number} number={number} />)}
            {latest ? <><i>+</i><Loto5Ball number={latest.plus} plus /></> : null}
          </div>
          <small>{latest ? `Sorteo #${latest.drawId ?? "N/D"}` : status}</small>
        </div>
      </section>

      <section className="metricsGrid loto5Metrics">
        <div className="metric primeraMetric"><span>Sorteos cargados</span><strong>{results.length}</strong></div>
        <div className="metric primeraMetric"><span>Histórico</span><strong>{oldest ? `${formatShortDate(oldest.date)} — ${latest ? formatShortDate(latest.date) : ""}` : "N/D"}</strong></div>
        <div className="metric primeraMetric"><span>Precio Loto 5</span><strong>RD$20</strong></div>
        <div className="metric primeraMetric"><span>Con Loto 5 Más</span><strong>RD$30</strong></div>
      </section>

      <details className="topPositionsAccordion loto5InfoAccordion">
        <summary><span>Reglas del sorteo y tabla de premios</span><small>Cómo jugar, precios y premios oficiales.</small></summary>
        <section className="twoColumn loto5InfoGrid"><article className="card primeraCard">
          <h2>Reglas del sorteo</h2>
          <ul className="loto5Rules">
            <li>Se celebra todos los días a las 7:00 PM.</li>
            <li>Selecciona 5 números distintos del 01 al 38.</li>
            <li>Los aciertos cuentan en cualquier orden.</li>
            <li>Loto 5 Más agrega un número del 01 al 10.</li>
            <li>Los premios mayores se reparten si hay varios ganadores.</li>
          </ul>
          <a className="sourceLink" href="https://laprimera.do/loto5-y-loto5-mas-2/" target="_blank" rel="noreferrer">Consultar reglas oficiales ↗</a>
        </article>
        <article className="card primeraCard">
          <h2>Tabla de premios</h2>
          <div className="loto5PrizeTableWrap">
            <table className="loto5PrizeTable"><thead><tr><th>Aciertos</th><th>Premio</th></tr></thead>
              <tbody>{loto5Prizes.map((row) => <tr key={row.hits}><td>{row.hits}</td><td>{row.prize}</td></tr>)}</tbody>
            </table>
          </div>
        </article></section>
      </details>

      <details className="topPositionsAccordion loto5TopAccordion" open>
        <summary><span>Top 5 por posición</span><small>Cada columna calcula la frecuencia respetando la posición exacta, incluido el Más.</small></summary>
        <section className="topPositionsBoard"><div className="topPositionsGuide"><span><i className="guideRank">#</i> Orden por frecuencia</span><span><i className="guideBar" /> Comparación con el líder de cada posición</span><span><b>{results.length}</b> sorteos analizados</span></div>
          <div className="topPositionsGrid loto5PositionGrid">{positionTops.map((items, position) => {
            const isPlus = position === 5;
            const color = loto5PositionColors[position];
            const maxCount = Math.max(1, ...items.map((item) => item.count));
            return <article className={`positionRankingCard ${isPlus ? "positionRankingPlus" : ""}`} style={{ borderTopColor: color }} key={position}><header className="positionRankingHeader"><span className="positionColorDot" style={{ backgroundColor: color }} /><div><span>{isPlus ? "MÁS" : `P${position + 1}`}</span><h3>{isPlus ? "Loto 5 Más" : `Posición ${position + 1}`}</h3></div></header><div className="positionRankingList">{items.map((item, rank) => <div className="positionRankingItem" key={item.number}><span className={`rankNumber rankNumber${rank + 1}`}>{rank + 1}</span><Loto5Ball number={item.number} plus={isPlus} winner={isPlus ? latest?.plus === item.number : latest?.numbers[position] === item.number} /><div className="positionFrequency"><div className="positionFrequencyMeta"><span>{rank === 0 ? "Líder" : `Top ${rank + 1}`}</span><strong>{item.count} salidas</strong></div><div className="positionBar"><span style={{ backgroundColor: color, width: `${(item.count / maxCount) * 100}%` }} /></div></div></div>)}</div></article>;
          })}</div>
        </section>
      </details>

      <details className="topPositionsAccordion loto5PortfolioAccordion" onToggle={(event) => { if (event.currentTarget.open) setPortfolioRequested(true); }}>
        <summary><span>Generador de 60 jugadas</span><small>20 fuertes, 20 equilibradas y 20 exploratorias para {formatShortDate(targetDate)}.</small></summary>
        {portfolio ? <div className="portfolioSnapshots"><Loto5PortfolioView portfolio={portfolio} />{previousPortfolio ? <details className="portfolioPreviousAccordion"><summary><span>Comparar con el sorteo anterior</span><small>{formatShortDate(previousPortfolio.targetDate)}</small></summary><Loto5PortfolioView portfolio={previousPortfolio} winningDraw={previousPortfolio.draw} /></details> : null}</div> : <div className="thirtyPortfolioLoading">{portfolioMessage}</div>}
      </details>

      <section className="card rangeMapSection loto5RangeSection"><Loto5RangeMap results={results} /></section>

      <section className="card primeraCard loto5History">
        <div className="sectionHeader"><div><h2>Histórico de Loto 5</h2><p>{results.length} sorteos oficiales cargados.</p></div>
          <div className="pagination"><button className="miniButton" disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)}>Anterior</button><span>Página {historyPage} de {pageCount}</span><button className="miniButton" disabled={historyPage === pageCount} onClick={() => setHistoryPage((page) => page + 1)}>Siguiente</button></div>
        </div>
        {history.map((draw) => <article className="historyRow" key={draw.date}><div className="historyDate"><strong>{formatShortDate(draw.date)}</strong><span>{formatLongDate(draw.date)}</span></div><div className="primeraLoto5Balls">{draw.numbers.map((number) => <Loto5Ball key={number} number={number} />)}<i>+</i><Loto5Ball number={draw.plus} plus /></div></article>)}
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
