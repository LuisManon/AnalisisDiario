"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildQuinielaPairs,
  buildQuinielaStats,
  buildQuinielaSuggestions,
  formatQuinielaNumber,
  getNextQuinielaDate,
  getQuinielaTargetLabel
} from "../lib/quiniela-pale";
import type { QuinielaSuggestion } from "../lib/quiniela-pale";
import type { QuinielaPaleDraw } from "../lib/types";

type Props = { initialData: { results: QuinielaPaleDraw[] } };
type QuinielaPortfolioSnapshot = { targetDate: string; generatedAt: string; plays: QuinielaSuggestion[] };
type PreviousQuinielaPortfolio = QuinielaPortfolioSnapshot & { draw: QuinielaPaleDraw };

const positionColors = ["#d71920", "#21499a", "#d9a309"];

const quinielaPrizeTable = [
  { play: "Quiniela", result: "Número en 1ra posición", prize: "RD$60" },
  { play: "Quiniela", result: "Número en 2da posición", prize: "RD$8" },
  { play: "Quiniela", result: "Número en 3ra posición", prize: "RD$4" },
  { play: "Super Palé", result: "Combinación ganadora", prize: "RD$3,000" },
  { play: "Tripleta", result: "3 números", prize: "RD$30,000" },
  { play: "Tripleta", result: "2 números", prize: "RD$150" }
];

function QBall({ number, winner = false, position = 0 }: { number: number; winner?: boolean; position?: number }) {
  return (
    <span className={`quinielaBall p${position + 1} ${winner ? "quinielaBallWinner" : ""}`}>
      {formatQuinielaNumber(number)}
    </span>
  );
}

function shortDate(date: string) {
  return date.split("-").reverse().join("-");
}

function fullDate(date: string) {
  return new Intl.DateTimeFormat("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function compactRange(values: number[]) {
  if (!values.length) return { low: 0, high: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const size = Math.max(1, Math.ceil(sorted.length * 0.8));
  let low = sorted[0];
  let high = sorted[size - 1];
  for (let start = 1; start + size <= sorted.length; start += 1) {
    const candidateLow = sorted[start];
    const candidateHigh = sorted[start + size - 1];
    if (candidateHigh - candidateLow < high - low) [low, high] = [candidateLow, candidateHigh];
  }
  return { low, high };
}

function QuinielaPortfolioView({ portfolio, winningDraw, historicalThrough }: { portfolio: QuinielaPortfolioSnapshot; winningDraw?: QuinielaPaleDraw; historicalThrough: string | null }) {
  return (
    <div className="quinielaPortfolioSnapshot">
      <div className={`quinielaRecommendationContext ${winningDraw ? "evaluation" : "next"}`}>
        <strong>{winningDraw ? "Sorteo anterior evaluado" : "Próximo sorteo"}</strong>
        <span>Objetivo: {getQuinielaTargetLabel(portfolio.targetDate)}</span>
        <span>Histórico utilizado hasta: {historicalThrough ? shortDate(historicalThrough) : "sin datos"}</span>
        <span>{winningDraw ? "La corona indica coincidencia exacta de número y posición. Esta fotografía no se recalcula." : "El último resultado disponible ya está incluido y estas jugadas quedaron congeladas para esta fecha."}</span>
      </div>
      <div className="quinielaThirtyColumns">
        {([[
          "fuerte", "Inclinación fuerte", "Mayor afinidad histórica con el día y la posición exacta."
        ], [
          "equilibrada", "Equilibradas", "Balance de frecuencia, retraso, posición y pares."
        ], [
          "exploratoria", "Exploratorias", "Menor afinidad reciente con respaldo histórico utilizable."
        ]] as const).map(([profile, title, description]) => {
          const plays = portfolio.plays.filter((play) => play.profile === profile);
          return <article className={`quinielaThirtyColumn ${profile}`} key={profile}>
            <header><div><h3>{title}</h3><p>{description}</p></div><strong>{plays.length}</strong></header>
            <div>{plays.map((play, index) => <div className="quinielaThirtyPlay" key={play.id}>
              <b>#{index + 1}</b>
              <div className="quinielaBalls">{play.numbers.map((number, position) => <QBall key={position} number={number} position={position} winner={winningDraw?.numbers[position] === number} />)}</div>
              <span>{play.score} pts</span>
            </div>)}</div>
          </article>;
        })}
      </div>
      <p className="recommendationDisclaimer">Las posiciones P1, P2 y P3 deben conservarse en el orden mostrado. Análisis histórico; no garantiza resultados.</p>
    </div>
  );
}

export function QuinielaPaleDashboard({ initialData }: Props) {
  const [results, setResults] = useState(initialData.results);
  const [status, setStatus] = useState(`Datos listos: ${initialData.results.length} sorteos cargados.`);
  const [updating, setUpdating] = useState(false);
  const [year, setYear] = useState("todos");
  const [day, setDay] = useState("todos");
  const [searchNumber, setSearchNumber] = useState("32");
  const [activeSearch, setActiveSearch] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [portfolioRequested, setPortfolioRequested] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<QuinielaPortfolioSnapshot | null>(null);
  const [previousPortfolio, setPreviousPortfolio] = useState<PreviousQuinielaPortfolio | null>(null);
  const [portfolioMessage, setPortfolioMessage] = useState("Abre la sección para cargar las jugadas guardadas.");
  const automaticUpdateStarted = useRef(false);
  const targetDate = useMemo(() => {
    const scheduled = getNextQuinielaDate();
    const latestDate = results[0]?.date;
    if (!latestDate || latestDate < scheduled) return scheduled;
    const next = new Date(`${latestDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  }, [results]);
  const years = useMemo(() => [...new Set(results.map((draw) => draw.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)), [results]);
  const filtered = useMemo(() => results.filter((draw) => (year === "todos" || draw.date.startsWith(year)) && (day === "todos" || weekday(draw.date) === Number(day))), [results, year, day]);
  const stats = useMemo(() => buildQuinielaStats(filtered), [filtered]);
  const suggestions = useMemo(() => analysisReady ? buildQuinielaSuggestions(results.filter((draw) => draw.date < targetDate), targetDate, 5) : [], [analysisReady, results, targetDate]);
  const pairs = useMemo(() => buildQuinielaPairs(filtered, 5), [filtered]);
  const latest = results[0];
  const ranges = useMemo(() => [0, 1, 2].map((position) => compactRange(filtered.map((draw) => draw.numbers[position]))), [filtered]);
  const searchMatches = useMemo(() => activeSearch === null ? [] : results.filter((draw) => draw.numbers.includes(activeSearch)), [results, activeSearch]);
  const historyPages = Math.max(1, Math.ceil(filtered.length / 10));
  const history = filtered.slice((historyPage - 1) * 10, historyPage * 10);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAnalysisReady(true), 50);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!portfolioRequested) return;
    setPortfolioMessage("Cargando o creando la fotografía de este sorteo…");
    fetch(`/api/quiniela-pale/portfolio?drawDate=${targetDate}`)
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload) => {
        setCurrentPortfolio(payload.current ?? null);
        setPreviousPortfolio(payload.previous ?? null);
        setPortfolioMessage("");
      })
      .catch(() => setPortfolioMessage("No se pudieron cargar las 30 jugadas guardadas."));
  }, [portfolioRequested, targetDate]);

  useEffect(() => {
    if (automaticUpdateStarted.current) return;
    automaticUpdateStarted.current = true;
    void updateResults();
  }, []);

  async function updateResults() {
    setUpdating(true);
    setStatus(results.length < 60 ? "Cargando el historial inicial de Quiniela Pale..." : "Revisando resultados nuevos...");
    try {
      const response = await fetch("/api/quiniela-pale/update");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setResults(payload.results);
      setStatus(payload.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar Quiniela Pale.");
    } finally {
      setUpdating(false);
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quiniela-pale-${results[0]?.date ?? "historial"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!analysisReady) {
    return (
      <main className="lotoTheme quinielaTheme quinielaPageLoading" role="status" aria-live="polite">
        <section className="hero">
          <div>
            <p className="eyebrow">Quiniela Pale Lab local</p>
            <h1>Cargando analisis de Quiniela Pale</h1>
            <p className="subcopy">Preparando frecuencias, posiciones, pares y jugadas recomendadas.</p>
          </div>
          <div className="heroPanel quinielaLoadingPanel">
            <span className="quinielaLoadingSpinner" />
            <strong>Analizando {results.length} sorteos...</strong>
            <small>La interfaz aparecera en un momento.</small>
          </div>
        </section>
        <section className="metricsGrid quinielaLoadingMetrics">
          {[0, 1, 2, 3].map((item) => <div className="metric" key={item}><i /></div>)}
        </section>
        <section className="card quinielaLoadingCard"><i /><i /><i /></section>
      </main>
    );
  }

  return (
    <main className="lotoTheme quinielaTheme">
      <section className="hero">
        <div>
          <p className="eyebrow">Quiniela Pale Lab local</p>
          <h1>Analisis por posicion, combinaciones y jugadas</h1>
          <p className="subcopy">Resultados de LEIDSA del 00 al 99. Analiza cada posicion, pares y afinidad por dia sin asumir numeros ganadores.</p>
        </div>
        <div className="heroPanel latestDrawPanel">
          <span className="panelLabel">Ultimo sorteo</span>
          <strong>{latest ? `${shortDate(latest.date)} · ${fullDate(latest.date).split(",")[0]}` : "Sin datos"}</strong>
          <div className="quinielaBalls">{latest?.numbers.map((number, position) => <QBall key={position} number={number} position={position} />)}</div>
          <small>Lun-Sab 8:55 PM · Domingo 3:55 PM</small>
        </div>
      </section>

      <section className="toolbar quinielaToolbar">
        <div className="quinielaFilters">
          <select aria-label="Año Quiniela Pale" value={year} onChange={(event) => { setYear(event.target.value); setHistoryPage(1); }}>
            <option value="todos">Todos los años</option>{years.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select aria-label="Día Quiniela Pale" value={day} onChange={(event) => { setDay(event.target.value); setHistoryPage(1); }}>
            <option value="todos">Todos los días</option>
            {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((label, index) => <option value={index} key={label}>{label}</option>)}
          </select>
        </div>
        <div className="toolbarActions"><button className="secondaryButton" onClick={updateResults} disabled={updating}>{updating ? "Actualizando..." : "Revisar actualizacion"}</button><button className="downloadButton" onClick={downloadJson}><span aria-hidden="true">↓</span> Descargar JSON</button></div>
        <span className="status">{status}</span>
      </section>

      <section className="metricsGrid">
        <div className="metric"><span>Sorteos analizados</span><strong>{stats.drawCount}</strong></div>
        <div className="metric"><span>Mas frecuente</span><strong>{stats.topHot[0] ? formatQuinielaNumber(stats.topHot[0].number) : "N/D"}</strong></div>
        <div className="metric"><span>Par mas repetido</span><strong>{pairs[0] ? pairs[0].numbers.map(formatQuinielaNumber).join("-") : "N/D"}</strong></div>
        <div className="metric"><span>Proximo sorteo</span><strong className="quinielaMetricDate">{getQuinielaTargetLabel(targetDate)}</strong></div>
      </section>

      <section className="card quinielaPrizeCard">
        <div>
          <p className="eyebrow">Pagos por cada RD$1 apostado</p>
          <h2>Tabla de premios</h2>
          <p className="muted">Referencia para Quiniela, Super Palé y Tripleta de LEIDSA.</p>
        </div>
        <div className="quinielaPrizeTableWrap">
          <table>
            <thead><tr><th>Jugada</th><th>Acierto</th><th>Premio</th></tr></thead>
            <tbody>{quinielaPrizeTable.map((item) => <tr key={`${item.play}-${item.result}`}><td>{item.play}</td><td>{item.result}</td><td>{item.prize}</td></tr>)}</tbody>
          </table>
        </div>
        <small>Montos de referencia por peso apostado. Confirma siempre las condiciones vigentes en tu ticket o punto de venta.</small>
      </section>

      <details className="topPositionsAccordion" open>
        <summary><span>Top 5 por posicion</span><small>Frecuencia exacta en primera, segunda y tercera.</small></summary>
      <section className="topPositionsBoard quinielaTopBoard">
        <div className="quinielaPositionGrid">{stats.topByPosition.map((items, position) => <article className="quinielaPositionCard" key={position}><h3>{position + 1}{position === 0 ? "ra" : position === 1 ? "da" : "ra"} posicion</h3>{items.map((item, rank) => <div className="quinielaRank" key={item.number}><b>#{rank + 1}</b><QBall number={item.number} position={position} winner={latest?.numbers[position] === item.number} /><span>{item.count} salidas</span></div>)}</article>)}</div>
      </section>
      </details>

      <details className="topPositionsAccordion quinielaThirtyAccordion" onToggle={(event) => { if (event.currentTarget.open) setPortfolioRequested(true); }}>
        <summary>
          <span>Generador de 30 Jugadas</span>
          <small>Inclinado al {getQuinielaTargetLabel(targetDate)} · 10 fuertes, 10 equilibradas y 10 exploratorias.</small>
        </summary>
        {currentPortfolio ? <section className="quinielaThirtyBody">
          <QuinielaPortfolioView portfolio={currentPortfolio} historicalThrough={results.find((draw) => draw.date < currentPortfolio.targetDate)?.date ?? null} />
          {previousPortfolio ? <details className="quinielaPreviousPortfolio"><summary><span>Comparar con el sorteo anterior</span><small>{getQuinielaTargetLabel(previousPortfolio.targetDate)}</small></summary><QuinielaPortfolioView portfolio={previousPortfolio} winningDraw={previousPortfolio.draw} historicalThrough={results.find((draw) => draw.date < previousPortfolio.targetDate)?.date ?? null} /></details> : null}
        </section> : <div className="thirtyPortfolioLoading">{portfolioMessage}</div>}
      </details>

      <section className="twoColumn quinielaAnalysisGrid">
        <article className="card">
          <div className="recommendationTitleRow"><h2>Jugadas recomendadas</h2><span className="quinielaInfo" title="Puntajes relativos basados en frecuencia, posicion, retraso, pares y afinidad del dia.">i</span></div>
          <p className="muted">Analisis inclinado al proximo sorteo del {getQuinielaTargetLabel(targetDate)}.</p>
          {analysisReady ? (
            <div className="recommendationList">{suggestions.map((play) => <div className="quinielaRecommendation" key={play.id}><span>#{play.id}</span><div><span className={`recommendationProfile ${play.profile}`}>{play.profile === "fuerte" ? "Inclinacion fuerte" : play.profile === "equilibrada" ? "Jugada equilibrada" : "Jugada exploratoria"}</span><div className="quinielaBalls">{play.numbers.map((number, position) => <QBall key={position} number={number} position={position} />)}</div></div><b className="scoreBadge">{play.score} pts</b></div>)}</div>
          ) : (
            <div className="quinielaAnalysisLoading" role="status" aria-live="polite">
              <span className="quinielaLoadingSpinner" />
              <div><strong>Analizando jugadas recomendadas...</strong><small>Calculando afinidad del dia, posiciones y combinaciones.</small></div>
            </div>
          )}
          <p className="recommendationDisclaimer">Apoyo estadistico; no predice ni garantiza resultados.</p>
        </article>
        <article className="card"><h2>Pares frecuentes para Pale</h2><p className="muted">Dos numeros que han coincidido dentro del mismo sorteo, sin importar posicion.</p><div className="quinielaPairs">{pairs.map((pair, index) => <div key={pair.numbers.join("-")}><b>#{index + 1}</b><div className="quinielaBalls">{pair.numbers.map((number) => <QBall key={number} number={number} winner={latest?.numbers.includes(number)} />)}</div><span>{pair.count} coincidencias</span></div>)}</div></article>
      </section>

      <section className="card quinielaSearch">
        <div className="sectionHeader"><div><h2>Busqueda de numero</h2><p>Consulta apariciones, posiciones y fechas dentro del historial.</p></div></div>
        <div className="quinielaSearchBar"><input type="number" min="0" max="99" value={searchNumber} onChange={(event) => setSearchNumber(event.target.value)} /><button className="primaryButton" onClick={() => setActiveSearch(Math.min(99, Math.max(0, Number(searchNumber))))}>Buscar</button><button className="secondaryButton" onClick={() => setActiveSearch(null)}>Limpiar filtro</button></div>
        {activeSearch !== null ? <div className="quinielaSearchResults"><strong>{formatQuinielaNumber(activeSearch)} apareció {searchMatches.length} veces</strong>{searchMatches.slice(0, 12).map((draw) => <div key={draw.date}><span>{shortDate(draw.date)}</span><div className="quinielaBalls">{draw.numbers.map((number, position) => <QBall key={position} number={number} position={position} winner={number === activeSearch} />)}</div></div>)}</div> : null}
      </section>

      <section className="twoColumn quinielaCharts">
        <article className="card"><h2>Diagrama de dispersion</h2><p className="muted">Ultimos sorteos del filtro, separados por posicion.</p><div className="quinielaScatterScroll"><svg viewBox="0 0 760 260" role="img" aria-label="Diagrama de dispersion Quiniela Pale">{[0,20,40,60,80,99].map((tick) => <g key={tick}><text x="8" y={230 - tick * 1.9}>{tick}</text><line x1="38" x2="740" y1={230 - tick * 1.9} y2={230 - tick * 1.9} stroke="#dfe5ef" /></g>)}{filtered.slice(0, 40).reverse().flatMap((draw, drawIndex) => draw.numbers.map((number, position) => <circle key={`${draw.date}-${position}`} cx={48 + drawIndex * 17} cy={230 - number * 1.9} r="3.5" fill={positionColors[position]}><title>{draw.date} · P{position + 1}: {formatQuinielaNumber(number)}</title></circle>))}</svg></div></article>
        <article className="card"><h2>Mapa de rangos</h2><p className="muted">Intervalo mas compacto que concentra el 80% de cada posicion.</p><div className="quinielaRanges">{ranges.map((range, position) => <div key={position}><b>P{position + 1}</b><div className="quinielaRangeTrack"><i style={{ left: `${range.low}%`, width: `${Math.max(2, range.high - range.low)}%`, background: positionColors[position] }} /></div><strong>{formatQuinielaNumber(range.low)} - {formatQuinielaNumber(range.high)}</strong></div>)}</div></article>
      </section>

      <section className="card quinielaHistory"><div className="sectionHeader"><div><h2>Historial cargado</h2><p>{filtered.length} sorteos en el filtro actual.</p></div></div>{history.map((draw) => <article key={draw.date}><div><strong>{shortDate(draw.date)}</strong><span>{fullDate(draw.date)}</span></div><div className="quinielaBalls">{draw.numbers.map((number, position) => <QBall key={position} number={number} position={position} winner={latest?.numbers.includes(number)} />)}</div></article>)}<nav className="pagination"><button disabled={historyPage === 1} onClick={() => setHistoryPage((page) => page - 1)}>Anterior</button><span>Pagina {historyPage} de {historyPages}</span><button disabled={historyPage === historyPages} onClick={() => setHistoryPage((page) => page + 1)}>Siguiente</button></nav></section>
    </main>
  );
}
