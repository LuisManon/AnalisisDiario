"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  buildLaPrimeraStats,
  buildLaPrimeraExclusiveRankings,
  buildLaPrimeraFrequencyRanking,
  buildLaPrimeraSuggestions,
  filterLaPrimeraResults,
  formatQuinielonNumber,
  formatSession,
  laPrimeraSchedules
} from "../lib/la-primera";
import { buildQuinielaSuggestions, formatQuinielaNumber } from "../lib/quiniela-pale";
import { getNextLoto5Date } from "../lib/la-primera-loto5";
import type { LaPrimeraDraw, LaPrimeraFilter, LaPrimeraLoto5Draw, LaPrimeraQuinielaDraw, LaPrimeraSession, Loto5PortfolioPlay, Loto5PortfolioSnapshot, QuinielaPaleDraw } from "../lib/types";

type LaPrimeraProduct = "inversionistas" | "quinielon" | "quinielon-v2" | "quiniela" | "loto5";

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

type RosterInfo = "nosotros" | "inversionistas" | "banca";

type DelayedNumber = {
  number: number;
  lastDate: string | null;
};

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

function subtractMonths(date: string, months: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() - months);
  return value.toISOString().slice(0, 10);
}

function getDelayedRosterNumbers(
  results: LaPrimeraDraw[],
  ranking: Array<{ number: number }>,
  session: LaPrimeraSession,
  referenceDate: string,
  months = 6
): DelayedNumber[] {
  const threshold = subtractMonths(referenceDate, months);

  return ranking
    .map(({ number }) => ({
      number,
      lastDate: results.find((draw) => draw.session === session && draw.number === number)?.date ?? null
    }))
    .filter((item) => item.lastDate === null || item.lastDate <= threshold)
    .sort((a, b) => {
      if (a.lastDate === null) return b.lastDate === null ? a.number - b.number : -1;
      if (b.lastDate === null) return 1;
      return a.lastDate.localeCompare(b.lastDate) || a.number - b.number;
    });
}

function buildFrozenNumberMap(
  results: LaPrimeraDraw[],
  ranking: Array<{ number: number }>,
  sessions: readonly LaPrimeraSession[],
  referenceDate: string,
  months = 6
) {
  const frozen = new Map<number, LaPrimeraSession[]>();
  if (!referenceDate) return frozen;

  for (const session of sessions) {
    for (const item of getDelayedRosterNumbers(results, ranking, session, referenceDate, months)) {
      frozen.set(item.number, [...(frozen.get(item.number) ?? []), session]);
    }
  }

  return frozen;
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

function getExpectedLaPrimeraDraw() {
  const now = getDominicanClock();
  const yesterday = addDays(now.date, -1);
  const expectedSession: LaPrimeraSession = now.minutes >= drawCutoffMinutes.noche
    ? "noche"
    : now.minutes >= drawCutoffMinutes.dia
      ? "dia"
      : "noche";
  const expectedSessionDate = now.minutes >= drawCutoffMinutes.dia ? now.date : yesterday;
  const expectedLoto5Date = now.minutes >= drawCutoffMinutes.noche ? now.date : yesterday;
  return { expectedSession, expectedSessionDate, expectedLoto5Date };
}

function isQuinielonCurrent(results: LaPrimeraDraw[]) {
  const { expectedSession, expectedSessionDate } = getExpectedLaPrimeraDraw();
  return results.some(
    (draw) => draw.date === expectedSessionDate && draw.session === expectedSession
  );
}

function isPrimeraQuinielaCurrent(results: LaPrimeraQuinielaDraw[]) {
  const { expectedSession, expectedSessionDate } = getExpectedLaPrimeraDraw();
  return results.some(
    (draw) => draw.date === expectedSessionDate && draw.session === expectedSession
  );
}

function isPrimeraLoto5Current(results: LaPrimeraLoto5Draw[]) {
  const { expectedLoto5Date } = getExpectedLaPrimeraDraw();
  return results.some((draw) => draw.date === expectedLoto5Date);
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

function QuinielonBall({ number, tone = "red", winner = false }: { number: number; tone?: "red" | "dark" | "gold"; winner?: boolean }) {
  const toneClass = tone === "dark" ? " dark" : tone === "gold" ? " gold" : "";
  return <span className={`primeraBall${toneClass} ${winner ? "primeraBallWinner" : ""}`}>{formatQuinielonNumber(number)}</span>;
}

export function LaPrimeraDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [product, setProduct] = useState<LaPrimeraProduct>("inversionistas");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [status, setStatus] = useState(`Data local: ${initialData.results.length} sorteos cargados.`);
  const [session, setSession] = useState<LaPrimeraFilter>("todos");
  const [scatterSession, setScatterSession] = useState<LaPrimeraFilter>("todos");
  const [historyPage, setHistoryPage] = useState(1);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [openRosterInfo, setOpenRosterInfo] = useState<RosterInfo | null>(null);
  const dataRef = useRef(initialData);
  const results = data.results;
  const stats = useMemo(() => buildLaPrimeraStats(results, session), [results, session]);
  const exclusiveRankings = useMemo(() => buildLaPrimeraExclusiveRankings(results), [results]);
  const rotationMonday = getWeekMonday(getDominicanClock().date);
  const movementByNumber = useMemo(() => {
    const base = results.filter((draw) => draw.date < rotationMonday);
    return buildNumberMovements(base.length ? buildWeeklyRotations(results, rotationMonday, base) : []);
  }, [results, rotationMonday]);
  const rosterDelayReferenceDate = results[0]?.date ?? "";
  const rosterDelayRankings = useMemo(() => ({
    nosotros: [...exclusiveRankings.hotDay, ...exclusiveRankings.hotNight],
    inversionistas: [...exclusiveRankings.investorDay, ...exclusiveRankings.investorNight],
    banca: exclusiveRankings.bank
  }), [exclusiveRankings]);
  const frozenRosterNumbers = useMemo(() => ({
    nosotrosDia: buildFrozenNumberMap(results, exclusiveRankings.hotDay, ["dia"], rosterDelayReferenceDate),
    nosotrosNoche: buildFrozenNumberMap(results, exclusiveRankings.hotNight, ["noche"], rosterDelayReferenceDate),
    inversionistasDia: buildFrozenNumberMap(results, exclusiveRankings.investorDay, ["dia"], rosterDelayReferenceDate),
    inversionistasNoche: buildFrozenNumberMap(results, exclusiveRankings.investorNight, ["noche"], rosterDelayReferenceDate),
    banca: buildFrozenNumberMap(results, exclusiveRankings.bank, ["dia", "noche"], rosterDelayReferenceDate)
  }), [exclusiveRankings, results, rosterDelayReferenceDate]);
  const weeklyDraws = results.filter((draw) => draw.date >= getWeekMonday(getDominicanClock().date));
  const weeklyWinningNumbers = weeklyDraws.map((draw) => draw.number);
  const weeklyWinningNumbersBySession = {
    dia: weeklyDraws.filter((draw) => draw.session === "dia").map((draw) => draw.number),
    noche: weeklyDraws.filter((draw) => draw.session === "noche").map((draw) => draw.number)
  };
  const daySuggestions = useMemo(() => buildLaPrimeraSuggestions(results, "dia", 5), [results]);
  const nightSuggestions = useMemo(() => buildLaPrimeraSuggestions(results, "noche", 5), [results]);
  const daySuggestionDate = stats.latestBySession.dia?.date ?? results[0]?.date ?? "";
  const nightSuggestionDate = stats.latestBySession.noche?.date ?? results[0]?.date ?? "";
  const history = stats.filtered;
  const historyStartDate = results[results.length - 1]?.date ?? "";
  const historyDates = [...new Set(history.map((draw) => draw.date))];
  const pageCount = Math.max(1, Math.ceil((session === "todos" ? historyDates.length : history.length) / pageSize));
  const paginatedHistory = session === "todos"
    ? historyDates.slice((historyPage - 1) * pageSize, historyPage * pageSize).map((date) => ({
        date,
        draws: (["noche", "dia"] as const)
          .map((currentSession) => history.find((draw) => draw.date === date && draw.session === currentSession))
          .filter((draw): draw is LaPrimeraDraw => Boolean(draw))
      }))
    : history.slice((historyPage - 1) * pageSize, historyPage * pageSize).map((draw) => ({ date: draw.date, draws: [draw] }));
  const scatterData = useMemo(() => filterLaPrimeraResults(results, scatterSession).slice().reverse(), [results, scatterSession]);

  useEffect(() => {
    let isMounted = true;
    const updating = new Set<"quinielon" | "quiniela" | "loto5">();
    const loadingTimeout = window.setTimeout(() => {
      if (isMounted) setIsPageLoading(false);
    }, 500);

    async function updateProduct(product: "quinielon" | "quiniela" | "loto5") {
      if (updating.has(product)) return;
      updating.add(product);
      try {
        const expected = getExpectedLaPrimeraDraw();
        const targetDate = product === "loto5" ? expected.expectedLoto5Date : expected.expectedSessionDate;
        const response = await fetch(`/api/la-primera/update?product=${product}&date=${targetDate}`, { cache: "no-store" });
        const payload = await response.json();
        if (!isMounted) return;
        if (!response.ok) throw new Error(payload.message);
        setData((current) => {
          const next = {
            results: Array.isArray(payload.results) ? payload.results : current.results,
            quinielaResults: Array.isArray(payload.quinielaResults) ? payload.quinielaResults : current.quinielaResults,
            loto5Results: Array.isArray(payload.loto5Results) ? payload.loto5Results : current.loto5Results
          };
          dataRef.current = next;
          return next;
        });
        if (product === "quinielon") setStatus(`${payload.message} Total: ${payload.total}. Último: ${payload.latest?.date ?? "N/D"}.`);
      } catch {
        if (!isMounted) return;
        if (product === "quinielon") setStatus("La fuente oficial está tardando. Reintentaremos automáticamente en un minuto.");
      } finally {
        updating.delete(product);
      }
    }

    if (!isQuinielonCurrent(dataRef.current.results)) void updateProduct("quinielon");
    if (!isPrimeraQuinielaCurrent(dataRef.current.quinielaResults)) void updateProduct("quiniela");
    if (!isPrimeraLoto5Current(dataRef.current.loto5Results)) void updateProduct("loto5");

    const pollInterval = window.setInterval(() => {
      if (!isQuinielonCurrent(dataRef.current.results)) void updateProduct("quinielon");
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      window.clearInterval(pollInterval);
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

  if (product === "quinielon-v2" || product === "inversionistas") {
    return <LaPrimeraQuinielonV2View key={product} variant={product} results={results} onProductChange={setProduct} status={status} />;
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

      <WeeklyTopChallenge results={results} />

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

      <section className="quinielonRosterSection nosotrosRosterSection">
        <header>
          <span>Nuestra selección</span>
          <div className="rosterTitleRow">
            <h2>Top 20 calientes</h2>
            <RosterDelayButton
              label="Nosotros"
              isOpen={openRosterInfo === "nosotros"}
              onClick={() => setOpenRosterInfo((current) => current === "nosotros" ? null : "nosotros")}
            />
          </div>
          <p>Los números con mayor frecuencia histórica para cada tanda.</p>
          {openRosterInfo === "nosotros" ? <RosterDelayPanel results={results} ranking={rosterDelayRankings.nosotros} referenceDate={rosterDelayReferenceDate} /> : null}
        </header>
        <div className="twoColumn">
          <NumberGridCard movementByNumber={movementByNumber} title="Top 20 calientes Día" ranking={exclusiveRankings.hotDay} winningNumbers={weeklyWinningNumbersBySession.dia} frozenByNumber={frozenRosterNumbers.nosotrosDia} />
          <NumberGridCard movementByNumber={movementByNumber} title="Top 20 calientes Noche" ranking={exclusiveRankings.hotNight} winningNumbers={weeklyWinningNumbersBySession.noche} frozenByNumber={frozenRosterNumbers.nosotrosNoche} />
        </div>
      </section>

      <section className="quinielonRosterSection investorSection">
        <header>
          <span>Selección exclusiva</span>
          <div className="rosterTitleRow">
            <h2>Números de los Inversionistas</h2>
            <RosterDelayButton
              label="Inversionistas"
              isOpen={openRosterInfo === "inversionistas"}
              onClick={() => setOpenRosterInfo((current) => current === "inversionistas" ? null : "inversionistas")}
            />
          </div>
          <p>Los siguientes 20 números disponibles por tanda, sin repetir los de nuestra selección.</p>
          {openRosterInfo === "inversionistas" ? <RosterDelayPanel results={results} ranking={rosterDelayRankings.inversionistas} referenceDate={rosterDelayReferenceDate} /> : null}
        </header>
        <div className="twoColumn">
          <NumberGridCard movementByNumber={movementByNumber} title="Top 20 Inversionistas Día" ranking={exclusiveRankings.investorDay} winningNumbers={weeklyWinningNumbersBySession.dia} frozenByNumber={frozenRosterNumbers.inversionistasDia} tone="gold" />
          <NumberGridCard movementByNumber={movementByNumber} title="Top 20 Inversionistas Noche" ranking={exclusiveRankings.investorNight} winningNumbers={weeklyWinningNumbersBySession.noche} frozenByNumber={frozenRosterNumbers.inversionistasNoche} tone="gold" />
        </div>
      </section>

      <section className="quinielonRosterSection bankSection">
        <header>
          <span>Selección restante</span>
          <div className="rosterTitleRow">
            <h2>Números de la Banca</h2>
            <RosterDelayButton
              label="Banca"
              isOpen={openRosterInfo === "banca"}
              onClick={() => setOpenRosterInfo((current) => current === "banca" ? null : "banca")}
            />
          </div>
          <p>Los 20 números restantes después de las selecciones de Nosotros e Inversionistas.</p>
          {openRosterInfo === "banca" ? <RosterDelayPanel results={results} ranking={rosterDelayRankings.banca} referenceDate={rosterDelayReferenceDate} /> : null}
        </header>
        <NumberGridCard movementByNumber={movementByNumber} title="20 números restantes" ranking={exclusiveRankings.bank} winningNumbers={weeklyWinningNumbers} frozenByNumber={frozenRosterNumbers.banca} tone="dark" />
      </section>
      <p className="weeklyCrownNote quinielonCrownNote">Las coronas acumulan los aciertos de la semana actual y se limpian automáticamente cada lunes.</p>

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
            <p>{session === "todos" ? `${historyDates.length} fechas · 5 fechas por página` : `${history.length} sorteos en el filtro ${formatSession(session)}`}.</p>
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
          {paginatedHistory.map((group) => (
            <article className="historyRow primeraGroupedHistoryRow" key={group.date}>
              <div className="historyDate">
                <strong>{formatShortDate(group.date)}</strong>
                <span>{formatLongDate(group.date)}</span>
              </div>
              <div className="primeraHistorySessions">
                {group.draws.map((draw) => (
                  <div className={`primeraHistorySession ${draw.session}`} key={draw.session}>
                    <span>{formatSession(draw.session)}</span>
                    <QuinielonBall number={draw.number} tone={draw.session === "dia" ? "red" : "dark"} winner={draw.number === stats.latestBySession[draw.session]?.number} />
                    <small>{laPrimeraSchedules[draw.session].time}</small>
                  </div>
                ))}
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
      <button className={product === "inversionistas" ? "active" : ""} onClick={() => onChange("inversionistas")}>Inversionistas</button>
      <button className={product === "quinielon-v2" ? "active" : ""} onClick={() => onChange("quinielon-v2")}>Quinielón V2</button>
      <button className={product === "quinielon" ? "active" : ""} onClick={() => onChange("quinielon")}>El Quinielón</button>
      <button className={product === "quiniela" ? "active" : ""} onClick={() => onChange("quiniela")}>Quiniela Día/Noche</button>
      <button className={product === "loto5" ? "active" : ""} onClick={() => onChange("loto5")}>Loto 5</button>
    </nav>
  );
}

type QuinielonV2Group = "nosotros" | "inversionistas" | "banca";

type QuinielonVariant = "quinielon-v2" | "inversionistas";

function buildQuinielonV2Rankings(results: LaPrimeraDraw[], variant: QuinielonVariant = "quinielon-v2") {
  const split = (session: LaPrimeraSession) => {
    const scoped = results.filter((draw) => draw.session === session);
    const ranking = buildLaPrimeraFrequencyRanking(scoped);
    const referenceDate = results.reduce((latest, draw) => draw.date > latest ? draw.date : latest, "");
    const delayThreshold = referenceDate ? subtractMonths(referenceDate, 6) : "";
    const lastDate = (number: number) => scoped.reduce(
      (latest, draw) => draw.number === number && draw.date > latest ? draw.date : latest,
      ""
    );
    const isDelayed = (number: number) => {
      const latest = lastDate(number);
      return !latest || latest <= delayThreshold;
    };
    if (variant === "inversionistas") {
      const active = ranking.filter((item) => !isDelayed(item.number));
      const nosotros = active.slice(0, 30);
      const inversionistas = active.slice(30, 60);
      const selected = new Set([...nosotros, ...inversionistas].map((item) => item.number));
      const banca = ranking.filter((item) => !selected.has(item.number)).sort((a, b) =>
        Number(isDelayed(b.number)) - Number(isDelayed(a.number)) ||
        a.count - b.count || lastDate(a.number).localeCompare(lastDate(b.number)) || a.number - b.number
      );
      return { nosotros, inversionistas, banca };
    }
    const originalTop = ranking.slice(0, 40);
    const displacedTop = new Set(originalTop.filter((item) => isDelayed(item.number)).map((item) => item.number));
    const nosotros = ranking.filter((item) => !isDelayed(item.number)).slice(0, 40);
    const ours = new Set(nosotros.map((item) => item.number));
    const remaining = ranking.filter((item) => !ours.has(item.number));
    const bank = remaining
      .filter((item) => !displacedTop.has(item.number))
      .sort((a, b) =>
        Number(isDelayed(b.number)) - Number(isDelayed(a.number)) ||
        a.count - b.count ||
        lastDate(a.number).localeCompare(lastDate(b.number)) ||
        a.number - b.number
      )
      .slice(0, 20);
    const bankNumbers = new Set(bank.map((item) => item.number));
    return {
      nosotros,
      inversionistas: remaining.filter((item) => !bankNumbers.has(item.number)),
      banca: bank
    };
  };
  return { dia: split("dia"), noche: split("noche") };
}

function quinielonV2GroupForNumber(
  rankings: ReturnType<typeof buildQuinielonV2Rankings>,
  session: LaPrimeraSession,
  number: number
): QuinielonV2Group {
  if (rankings[session].nosotros.some((item) => item.number === number)) return "nosotros";
  if (rankings[session].inversionistas.some((item) => item.number === number)) return "inversionistas";
  return "banca";
}

function buildQuinielonV2WeeklyRotations(results: LaPrimeraDraw[], monday: string, variant: QuinielonVariant = "quinielon-v2") {
  const sunday = addDays(monday, 6);
  const accumulated = results.filter((draw) => draw.date < monday);
  const weeklyDraws = results
    .filter((draw) => draw.date >= monday && draw.date <= sunday)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.session === b.session ? 0 : a.session === "dia" ? -1 : 1));
  let previous = buildQuinielonV2Rankings(accumulated, variant);
  const rotations: Array<{ date: string; session: LaPrimeraSession; number: number; from: QuinielonV2Group; to: QuinielonV2Group }> = [];

  for (const draw of weeklyDraws) {
    accumulated.push(draw);
    const next = buildQuinielonV2Rankings(accumulated, variant);
    for (let number = 0; number <= 99; number += 1) {
      const from = quinielonV2GroupForNumber(previous, draw.session, number);
      const to = quinielonV2GroupForNumber(next, draw.session, number);
      if (from !== to) rotations.push({ date: draw.date, session: draw.session, number, from, to });
    }
    previous = next;
  }

  return rotations;
}

const quinielonV2GroupLabels: Record<QuinielonV2Group, string> = {
  nosotros: "La Casa",
  inversionistas: "Inversionistas",
  banca: "Banca"
};

function QuinielonV2WeeklyChallenge({ results, variant }: { results: LaPrimeraDraw[]; variant: QuinielonVariant }) {
  const investors = variant === "inversionistas";
  const [showTotal, setShowTotal] = useState(false);
  const today = getDominicanClock().date;
  const monday = getWeekMonday(today);
  const sunday = addDays(monday, 6);
  const baseResults = results.filter((draw) => draw.date < monday);
  const rankings = buildQuinielonV2Rankings(baseResults.length ? baseResults : results, variant);
  const rotations = baseResults.length ? buildQuinielonV2WeeklyRotations(results, monday, variant) : [];
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const days = weekDates.map((date) => ({
    date,
    tandas: (["dia", "noche"] as const).map((session) => {
      const draw = results.find((item) => item.date === date && item.session === session);
      return { session, draw, status: draw ? quinielonV2GroupForNumber(rankings, session, draw.number) : "pendiente" as const };
    })
  }));
  const resolved = days.flatMap((day) => day.tandas).filter((tanda) => tanda.status !== "pendiente");
  const totals = {
    nosotros: resolved.filter((tanda) => tanda.status === "nosotros").length,
    inversionistas: resolved.filter((tanda) => tanda.status === "inversionistas").length,
    banca: resolved.filter((tanda) => tanda.status === "banca").length
  };
  const percentages = {
    nosotros: resolved.length ? Math.round((totals.nosotros / resolved.length) * 100) : 0,
    inversionistas: resolved.length ? Math.round((totals.inversionistas / resolved.length) * 100) : 0,
    banca: 0
  };
  percentages.banca = resolved.length ? Math.max(0, 100 - percentages.nosotros - percentages.inversionistas) : 0;
  const pending = 14 - resolved.length;
  const lastResolvedDate = days.filter((day) => day.tandas.some((tanda) => tanda.status !== "pendiente")).at(-1)?.date;

  return (
    <section className="card weeklyTopChallenge quinielonV2Weekly">
      <header className="weeklyTopHeader">
        <div><span className="panelLabel primeraLabel">Puja semanal {investors ? "Inversionistas" : "V2"} · 14 tandas</span><h2>La Casa contra Inversionistas y Banca</h2><p>{investors ? "La Casa: 30 activos · Inversionistas: siguientes 30 activos · Banca: 40 restantes. La alineación queda congelada al comenzar el lunes." : "La Casa prioriza frecuencia y excluye atrasos de 6 meses; la alineación queda congelada al comenzar el lunes."}</p></div>
        <div className="weeklyRoster"><strong>100 por tanda</strong><span>Día y Noche independientes · {formatShortDate(monday)}–{formatShortDate(sunday)}</span></div>
      </header>
      <div className="weeklyDayGrid">
        {days.map((day) => <article className={`weeklyDayCard ${day.date === today ? "today" : ""}`} key={day.date}>
          <header><div><strong>{new Intl.DateTimeFormat("es-DO", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`))}</strong><span>{formatShortDate(day.date)}</span></div></header>
          <div className="weeklyTandas">{day.tandas.map((tanda) => <div className={`weeklyTanda ${tanda.status}`} key={tanda.session}>
            <span>{formatSession(tanda.session)}</span>
            <strong>{tanda.status === "pendiente" ? "Pendiente" : quinielonV2GroupLabels[tanda.status]}</strong>
            <small>{tanda.draw ? `${formatQuinielonNumber(tanda.draw.number)} · Quinielón` : "Esperando resultado"}</small>
          </div>)}</div>
        </article>)}
      </div>
      <aside className="weeklyRotations" aria-live="polite">
        <header><div><span>Rotaciones automáticas</span><strong>{rotations.length}</strong></div><small>Se reinician cada lunes</small></header>
        {rotations.length ? <div className="weeklyRotationList">{rotations.map((rotation, index) => <div className="weeklyRotationItem" key={`${rotation.date}-${rotation.session}-${rotation.number}-${index}`}>
          <b>{formatQuinielonNumber(rotation.number)}</b>
          <span>{quinielonV2GroupLabels[rotation.from]} <i aria-hidden="true">→</i> {quinielonV2GroupLabels[rotation.to]}</span>
          <small>{formatShortDate(rotation.date)} · {formatSession(rotation.session)}</small>
        </div>)}</div> : <p>Sin cambios de grupo esta semana.</p>}
      </aside>
      <div className="weeklyTopActions">
        <button className="primaryButton weeklyCalculateButton" onClick={() => setShowTotal((value) => !value)}>{showTotal ? "Ocultar total semanal" : "Calcular total semanal"}</button>
        {showTotal ? <div className="weeklyTopSummary"><strong>{percentages.nosotros}% La Casa · {percentages.inversionistas}% Inversionistas · {percentages.banca}% Banca</strong><p>Marcador actual: <b>{totals.nosotros}–{totals.inversionistas}–{totals.banca}</b> en {resolved.length} tandas resueltas{lastResolvedDate ? `, desde el lunes hasta el ${formatShortDate(lastResolvedDate)}` : ""}. {pending ? `Quedan ${pending} tandas pendientes.` : "La semana está completa."}</p></div> : <p className="weeklySummaryHint">Calcula el marcador usando la plantilla {investors ? "de Inversionistas" : "V2"} del lunes.</p>}
      </div>
    </section>
  );
}

function QuinielonV2DelayPanel({ results, ranking, session, referenceDate }: { results: LaPrimeraDraw[]; ranking: Array<{ number: number }>; session: LaPrimeraSession; referenceDate: string }) {
  const delayed = referenceDate ? getDelayedRosterNumbers(results, ranking, session, referenceDate, 6) : [];
  return <aside className="rosterDelayPanel" role="status"><strong>6 meses o más sin salir</strong><small>{formatSession(session)} · calculado hasta {formatShortDate(referenceDate)}</small>{delayed.length ? <div className="rosterDelayList">{delayed.map((item) => <span key={item.number}>{formatQuinielonNumber(item.number)}<small>{item.lastDate ? formatShortDate(item.lastDate) : "Sin registro"}</small></span>)}</div> : <p>Ninguno.</p>}</aside>;
}

function LaPrimeraQuinielonV2View({ results, onProductChange, status, variant }: { results: LaPrimeraDraw[]; onProductChange: (product: LaPrimeraProduct) => void; status: string; variant: QuinielonVariant }) {
  const investors = variant === "inversionistas";
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [today, setToday] = useState(() => getDominicanClock().date);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(getDominicanClock().date), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const rankings = useMemo(() => buildQuinielonV2Rankings(results, variant), [results, variant]);
  const referenceDate = results[0]?.date ?? "";
  const monday = getWeekMonday(today);
  const movements = useMemo(() => {
    const rotations = results.some((draw) => draw.date < monday) ? buildQuinielonV2WeeklyRotations(results, monday, variant) : [];
    return {
      dia: buildNumberMovements(rotations.filter((rotation) => rotation.session === "dia")),
      noche: buildNumberMovements(rotations.filter((rotation) => rotation.session === "noche"))
    };
  }, [results, monday, variant]);
  const weeklyWinningNumbers = {
    dia: results.filter((draw) => draw.date >= monday && draw.session === "dia").map((draw) => draw.number),
    noche: results.filter((draw) => draw.date >= monday && draw.session === "noche").map((draw) => draw.number)
  };
  const latestBySession = { dia: results.find((draw) => draw.session === "dia"), noche: results.find((draw) => draw.session === "noche") };
  const frozen = (ranking: Array<{ number: number }>, session: LaPrimeraSession) => buildFrozenNumberMap(results, ranking, [session], referenceDate, 6);
  const groups: Array<{ key: QuinielonV2Group; title: string; description: string; tone: "red" | "gold" | "dark" }> = [
    { key: "nosotros", title: "La Casa", description: investors ? "Los 30 más frecuentes y activos: ningún número con 6 meses o más de atraso." : "Los 40 más frecuentes y activos: ningún número con 6 meses o más de atraso.", tone: "red" },
    { key: "inversionistas", title: "Inversionistas", description: investors ? "Los siguientes 30 más frecuentes y activos después de La Casa (puestos 31–60 entre los activos), sin atrasos de 6 meses." : "Plan de respaldo: recibe los frecuentes desplazados por atraso y los siguientes disponibles.", tone: "gold" },
    { key: "banca", title: "Banca", description: investors ? "Los 40 restantes, incluidos todos los números con 6 meses o más sin salir." : "Los 20 restantes, donde se concentran los de menor frecuencia y mayor atraso.", tone: "dark" }
  ];

  return <main className="primeraTheme quinielonV2Theme">
    <ProductSwitch product={variant} onChange={onProductChange} />
    <section className="hero primeraHero quinielonV2Hero"><div><p className="eyebrow primeraEyebrow">La Primera · clasificación independiente</p><h1>{investors ? "Inversionistas" : "Quinielón V2"}</h1><p className="subcopy">La Casa, Inversionistas y Banca calculados por separado para Día y Noche.</p></div><div className="heroPanel primeraHeroPanel"><span className="panelLabel primeraLabel">Últimos sorteos</span><div className="latestSplit v2LatestSplit">{(["dia", "noche"] as const).map((session) => {
      const latest = latestBySession[session];
      return <article className={`v2LatestCard ${session}`} key={session}><i className="v2SkyIcon" aria-hidden="true" /><span>{formatSession(session)}</span><strong>{laPrimeraSchedules[session].time}</strong>{latest ? <QuinielonBall number={latest.number} tone={session === "dia" ? "red" : "dark"} /> : <b>Sin datos</b>}<small>{latest ? <>{formatShortDate(latest.date)} · <b>{getLatestDateLabel(latest)}</b></> : "Sin fecha"}</small></article>;
    })}</div></div></section>
    <section className="toolbar primeraToolbar"><span className="status">{status} {investors ? "Inversionistas" : "V2"} mantiene clasificaciones independientes por tanda.</span></section>
    <QuinielonV2WeeklyChallenge results={results} variant={variant} />
    {groups.map((group) => <section className={`quinielonRosterSection v2RosterSection ${group.key === "inversionistas" ? "investorSection" : group.key === "banca" ? "bankSection" : "nosotrosRosterSection"}`} key={group.key}>
      <header><span>Clasificación {investors ? "Inversionistas" : "V2"}</span><h2>{group.title}</h2><p>{group.description}</p></header>
      <div className="twoColumn">{(["dia", "noche"] as const).map((session) => {
        const infoKey = `${group.key}-${session}`;
        const ranking = rankings[session][group.key];
        return <div className="v2RosterColumn" key={session}>
          <div className="v2RosterColumnTitle"><strong>{group.title} · {formatSession(session)}</strong><span className={`v2SessionIcon ${session}`} aria-hidden="true">{session === "dia" ? "☀️" : "🌙"}</span><RosterDelayButton label={`${group.title} ${formatSession(session)}`} isOpen={openInfo === infoKey} onClick={() => setOpenInfo((value) => value === infoKey ? null : infoKey)} /></div>
          {openInfo === infoKey ? <QuinielonV2DelayPanel results={results} ranking={ranking} session={session} referenceDate={referenceDate} /> : null}
          <NumberGridCard title={group.key === "nosotros" ? "Selección de La Casa" : group.key === "inversionistas" ? (investors ? "30 números" : "40 números de respaldo") : (investors ? "40 números restantes" : "20 números restantes")} ranking={ranking} winningNumbers={weeklyWinningNumbers[session]} frozenByNumber={frozen(ranking, session)} frozenMonths={6} tone={group.tone} separateRows={!investors && ranking.length > 20} session={session} selectionDate={today} movementByNumber={movements[session]} />
        </div>;
      })}</div>
    </section>)}
    <p className="weeklyCrownNote quinielonCrownNote">Las coronas y rotaciones corresponden a la semana actual y se reinician cada lunes.</p>
  </main>;
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
  const [historyPage, setHistoryPage] = useState(1);
  const scoped = useMemo(() => results.filter((draw) => draw.session === session), [results, session]);
  const latest = scoped[0] ?? null;
  const targetDate = latest ? nextDateAfter(latest.date) : "";
  const positionTops = useMemo(() => quinielaTopByPosition(scoped), [scoped]);
  const suggestionInput = useMemo<QuinielaPaleDraw[]>(() => scoped.map((draw) => ({ date: draw.date, numbers: draw.numbers, source: draw.source })), [scoped]);
  const suggestions = useMemo(() => targetDate ? buildQuinielaSuggestions(suggestionInput, targetDate, 5) : [], [suggestionInput, targetDate]);
  const historyPageSize = 5;
  const historyPageCount = Math.max(1, Math.ceil(scoped.length / historyPageSize));
  const history = scoped.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

  function changeQuinielaSession(value: LaPrimeraSession) {
    setSession(value);
    setHistoryPage(1);
  }

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
          {(["dia", "noche"] as LaPrimeraSession[]).map((option) => <button key={option} className={session === option ? "active" : ""} onClick={() => changeQuinielaSession(option)}>{formatSession(option)}</button>)}
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

      <section className="card primeraCard primeraQuinielaHistory">
        <div className="sectionHeader">
          <div>
            <h2>Histórico de Quiniela · {formatSession(session)}</h2>
            <p>{scoped.length} sorteos · mostrando 5 por página.</p>
          </div>
          <div className="pagination">
            <button className="miniButton" disabled={historyPage === 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>Anterior</button>
            <span>Página {historyPage} de {historyPageCount}</span>
            <button className="miniButton" disabled={historyPage === historyPageCount} onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}>Siguiente</button>
          </div>
        </div>
        <div className="primeraHistory">
          {history.map((draw) => <article className="historyRow" key={`${draw.date}-${draw.session}-${draw.drawId ?? draw.numbers.join("-")}`}>
            <div className="historyDate"><strong>{formatShortDate(draw.date)} · {formatSession(draw.session)}</strong><span>{formatLongDate(draw.date)} · Sorteo #{draw.drawId ?? "N/D"}</span></div>
            <div className="primeraQuinielaBalls">{draw.numbers.map((number, position) => <PrimeraQuinielaBall key={position} number={number} position={position} />)}</div>
          </article>)}
        </div>
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
  const historyPageSize = 5;
  const pageCount = Math.max(1, Math.ceil(results.length / historyPageSize));
  const history = results.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);
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

type WeeklyTandaResult = {
  session: LaPrimeraSession;
  status: "nosotros" | "inversionistas" | "banca" | "pendiente";
  matches: Array<{ number: number; source: "Quinielón" }>;
};

type WeeklyRosterGroup = "nosotrosDia" | "nosotrosNoche" | "inversionistasDia" | "inversionistasNoche" | "banca";

type WeeklyRotation = {
  date: string;
  session: LaPrimeraSession;
  number: number;
  from: WeeklyRosterGroup;
  to: WeeklyRosterGroup;
};

const weeklyRosterLabels: Record<WeeklyRosterGroup, string> = {
  nosotrosDia: "Nosotros Día",
  nosotrosNoche: "Nosotros Noche",
  inversionistasDia: "Inversionistas Día",
  inversionistasNoche: "Inversionistas Noche",
  banca: "Banca"
};

function buildWeeklyRosterMap(results: LaPrimeraDraw[]) {
  const rankings = buildLaPrimeraExclusiveRankings(results);
  const roster = new Map<number, WeeklyRosterGroup>();
  rankings.hotDay.forEach(({ number }) => roster.set(number, "nosotrosDia"));
  rankings.hotNight.forEach(({ number }) => roster.set(number, "nosotrosNoche"));
  rankings.investorDay.forEach(({ number }) => roster.set(number, "inversionistasDia"));
  rankings.investorNight.forEach(({ number }) => roster.set(number, "inversionistasNoche"));
  rankings.bank.forEach(({ number }) => roster.set(number, "banca"));
  return roster;
}

function buildWeeklyRotations(results: LaPrimeraDraw[], monday: string, rankingBase: LaPrimeraDraw[]) {
  const sunday = addDays(monday, 6);
  const weeklyDraws = results
    .filter((draw) => draw.date >= monday && draw.date <= sunday)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.session === b.session ? 0 : a.session === "dia" ? -1 : 1));
  const accumulatedResults = [...rankingBase];
  let previousRoster = buildWeeklyRosterMap(accumulatedResults);
  const rotations: WeeklyRotation[] = [];

  for (const draw of weeklyDraws) {
    accumulatedResults.push(draw);
    const nextRoster = buildWeeklyRosterMap(accumulatedResults);

    for (let number = 0; number <= 99; number += 1) {
      const from = previousRoster.get(number);
      const to = nextRoster.get(number);
      if (from && to && from !== to) rotations.push({ date: draw.date, session: draw.session, number, from, to });
    }

    previousRoster = nextRoster;
  }

  return rotations;
}

function getWeekMonday(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const weekday = value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return value.toISOString().slice(0, 10);
}

function WeeklyTopChallenge({
  results,
  rankingOffset = 0,
  variant = "default"
}: {
  results: LaPrimeraDraw[];
  rankingOffset?: number;
  variant?: "default" | "investor" | "bank";
}) {
  const [showTotal, setShowTotal] = useState(false);
  const today = getDominicanClock().date;
  const monday = getWeekMonday(today);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const rankingResults = results.filter((draw) => draw.date < monday);
  const rankingBase = rankingResults.length ? rankingResults : results;
  const weeklyRotations = rankingResults.length ? buildWeeklyRotations(results, monday, rankingBase) : [];
  const exclusiveRankings = buildLaPrimeraExclusiveRankings(rankingBase);
  const selectedRanking = variant === "bank"
    ? exclusiveRankings.bank
    : variant === "investor"
      ? [...exclusiveRankings.investorDay, ...exclusiveRankings.investorNight]
      : [...exclusiveRankings.hotDay, ...exclusiveRankings.hotNight];
  const topPool = new Set(selectedRanking.map((item) => item.number));
  const hotPool = new Set([...exclusiveRankings.hotDay, ...exclusiveRankings.hotNight].map((item) => item.number));
  const investorPool = new Set([...exclusiveRankings.investorDay, ...exclusiveRankings.investorNight].map((item) => item.number));

  const days = weekDates.map((date) => {
    const tandas: WeeklyTandaResult[] = (["dia", "noche"] as const).map((currentSession) => {
      const quinielon = results.find((draw) => draw.date === date && draw.session === currentSession);
      const matches: WeeklyTandaResult["matches"] = [];
      if (quinielon) {
        matches.push({ number: quinielon.number, source: "Quinielón" });
      }
      return {
        session: currentSession,
        status: !quinielon ? "pendiente" : hotPool.has(quinielon.number) ? "nosotros" : investorPool.has(quinielon.number) ? "inversionistas" : "banca",
        matches
      };
    });
    return { date, tandas };
  });

  const resolved = days.flatMap((day) => day.tandas).filter((tanda) => tanda.status !== "pendiente");
  const ours = resolved.filter((tanda) => tanda.status === "nosotros").length;
  const investors = resolved.filter((tanda) => tanda.status === "inversionistas").length;
  const bank = resolved.filter((tanda) => tanda.status === "banca").length;
  const pending = 14 - resolved.length;
  const oursPercentage = resolved.length ? Math.round((ours / resolved.length) * 100) : 0;
  const investorsPercentage = resolved.length ? Math.round((investors / resolved.length) * 100) : 0;
  const bankPercentage = resolved.length ? Math.max(0, 100 - oursPercentage - investorsPercentage) : 0;
  const lastResolvedDate = days.filter((day) => day.tandas.some((tanda) => tanda.status !== "pendiente")).at(-1)?.date;

  return (
    <section className={`card weeklyTopChallenge ${variant === "investor" ? "weeklyInvestorChallenge" : variant === "bank" ? "weeklyBankChallenge" : ""}`}>
      <header className="weeklyTopHeader">
        <div>
          <span className="panelLabel primeraLabel">Puja semanal · 14 tandas</span>
          <h2>{variant === "investor" ? "Inversionistas contra la banca" : variant === "bank" ? "Banca contra Nosotros e Inversionistas" : "Top 40 contra la banca"}</h2>
          <p>{variant === "bank" ? "Los 20 números restantes se comparan con cada resultado semanal del Quinielón." : `Los puestos ${rankingOffset + 1} al ${rankingOffset + 20} de Día y Noche se evalúan juntos contra cada resultado del Quinielón.`}</p>
        </div>
        <div className="weeklyRoster">
          <strong>{topPool.size} puestos</strong>
          <span>{topPool.size} números únicos · alineación al {formatShortDate(monday)}</span>
        </div>
      </header>

      <div className="weeklyDayGrid">
        {days.map((day) => {
          const dayResolved = day.tandas.filter((tanda) => tanda.status !== "pendiente");
          const dayWins = dayResolved.filter((tanda) => tanda.status === "nosotros").length;
          const dayInvestorWins = dayResolved.filter((tanda) => tanda.status === "inversionistas").length;
          const dayBankWins = dayResolved.filter((tanda) => tanda.status === "banca").length;
          const dayScore = dayResolved.length ? `${dayWins}N · ${dayInvestorWins}I · ${dayBankWins}B` : "Pendiente";
          return <article className={`weeklyDayCard ${day.date === today ? "today" : ""}`} key={day.date}>
            <header><div><strong>{new Intl.DateTimeFormat("es-DO", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`))}</strong><span>{formatShortDate(day.date)}</span></div><b>{dayScore}</b></header>
            <div className="weeklyTandas">{day.tandas.map((tanda) => <div className={`weeklyTanda ${tanda.status}`} key={tanda.session}>
              <span>{formatSession(tanda.session)}</span>
              <strong>{tanda.status === "nosotros" ? "Nosotros" : tanda.status === "inversionistas" ? "Inversionistas" : tanda.status === "banca" ? "Banca" : "Pendiente"}</strong>
              <small>{tanda.matches.length ? tanda.matches.map((match) => `${formatQuinielonNumber(match.number)} · ${match.source}`).join(" / ") : "Esperando resultado"}</small>
            </div>)}</div>
          </article>;
        })}
      </div>

      <aside className="weeklyRotations" aria-live="polite">
        <header>
          <div><span>Rotaciones</span><strong>{weeklyRotations.length}</strong></div>
          <small>Se reinician cada lunes</small>
        </header>
        {weeklyRotations.length ? (
          <div className="weeklyRotationList">
            {weeklyRotations.map((rotation, index) => (
              <div className="weeklyRotationItem" key={`${rotation.date}-${rotation.session}-${rotation.number}-${index}`}>
                <b>{formatQuinielonNumber(rotation.number)}</b>
                <span>{weeklyRosterLabels[rotation.from]} <i aria-hidden="true">→</i> {weeklyRosterLabels[rotation.to]}</span>
                <small>{formatShortDate(rotation.date)} · {formatSession(rotation.session)}</small>
              </div>
            ))}
          </div>
        ) : <p>Sin cambios de plantilla esta semana.</p>}
      </aside>

      <div className="weeklyTopActions">
        <button className="primaryButton weeklyCalculateButton" onClick={() => setShowTotal((visible) => !visible)}>{showTotal ? "Ocultar total semanal" : "Calcular total semanal"}</button>
        {showTotal ? <div className="weeklyTopSummary"><strong>{oursPercentage}% Nosotros · {investorsPercentage}% Inversionistas · {bankPercentage}% Banca</strong><p>Marcador actual: <b>{ours}–{investors}–{bank}</b> en {resolved.length} tandas resueltas{lastResolvedDate ? `, desde el lunes hasta el ${formatShortDate(lastResolvedDate)}` : ""}. {pending ? `Quedan ${pending} tandas pendientes.` : "La semana está completa."}</p></div> : <p className="weeklySummaryHint">Calcula el ponderado entre Nosotros, Inversionistas y Banca con las tandas disponibles.</p>}
      </div>
    </section>
  );
}

type NumberMovement = { direction: "up" | "down"; label: string };

function buildNumberMovements(rotations: Array<{ number: number; date: string; from: WeeklyRosterGroup | QuinielonV2Group; to: WeeklyRosterGroup | QuinielonV2Group }>) {
  const movements = new Map<number, NumberMovement>();
  const level = (group: string) => group.startsWith("nosotros") ? 0 : group.startsWith("inversionistas") ? 1 : 2;
  const label = (group: WeeklyRosterGroup | QuinielonV2Group) => group in quinielonV2GroupLabels
    ? quinielonV2GroupLabels[group as QuinielonV2Group]
    : weeklyRosterLabels[group as WeeklyRosterGroup];
  for (const rotation of rotations) {
    const difference = level(rotation.from) - level(rotation.to);
    // A transfer between day and night within the same group is not a promotion.
    if (!difference) {
      movements.delete(rotation.number);
      continue;
    }
    const direction = difference > 0 ? "up" : "down";
    movements.set(rotation.number, {
      direction,
      label: `${direction === "up" ? "Ascendió" : "Descendió"}: ${label(rotation.from)} → ${label(rotation.to)} · ${formatShortDate(rotation.date)}`
    });
  }
  return movements;
}

function NumberGridCard({
  title,
  ranking,
  winningNumbers = [],
  frozenByNumber = new Map(),
  tone = "red",
  frozenMonths = 6,
  separateRows = false,
  session,
  selectionDate,
  movementByNumber = new Map()
}: {
  title: string;
  ranking: Array<{ number: number; count: number }>;
  winningNumbers?: readonly number[];
  frozenByNumber?: ReadonlyMap<number, readonly LaPrimeraSession[]>;
  tone?: "red" | "gold" | "dark";
  frozenMonths?: number;
  separateRows?: boolean;
  session?: LaPrimeraSession;
  selectionDate?: string;
  movementByNumber?: ReadonlyMap<number, NumberMovement>;
}) {
  return (
    <article className={`card primeraCard numberGridCard ${session ? `v2SelectionCard v2SelectionCard-${session}` : ""} ${tone === "gold" ? "investorCard" : tone === "dark" ? "bankCard" : ""}`}>
      <h3>{title}</h3>
      {session && selectionDate ? <div className="v2SelectionStamp"><span>{formatSession(session)} · {laPrimeraSchedules[session].time}</span><time dateTime={selectionDate}>{new Intl.DateTimeFormat("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Santo_Domingo" }).format(new Date(`${selectionDate}T12:00:00-04:00`))}</time></div> : null}
      <div className="bankNumberGrid">
        {ranking.map((item, index) => {
          const movement = movementByNumber.get(item.number);
          const frozenSessions = frozenByNumber.get(item.number) ?? [];
          const frozenLabel = frozenSessions.length
            ? `${frozenMonths} meses o más sin salir en ${frozenSessions.map(formatSession).join(" y ")}`
            : "";
          return (
            <Fragment key={item.number}>
              {separateRows && index > 0 && index % 10 === 0 ? <span className={`numberGridDivider${index % 20 !== 0 ? " numberGridDividerMobile" : ""}`} aria-hidden="true" /> : null}
            <span className="rosterBallWrap" title={frozenLabel || undefined}>
              {frozenSessions.length ? <span className="frozenBallBadge" aria-label={frozenLabel}>🧊</span> : null}
              <QuinielonBall number={item.number} tone={tone} winner={winningNumbers.includes(item.number)} />
              {movement ? <span className="rosterMovementBadge" role="img" aria-label={movement.label} title={movement.label}>{movement.direction === "up" ? "↑" : "↓"}</span> : null}
            </span>
            </Fragment>
          );
        })}
      </div>
    </article>
  );
}

function RosterDelayButton({
  label,
  isOpen,
  onClick
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rosterInfoButton"
      aria-label={`${isOpen ? "Ocultar" : "Mostrar"} números con seis meses o más sin salir de ${label}`}
      aria-expanded={isOpen}
      onClick={onClick}
    >
      i
    </button>
  );
}

function RosterDelayPanel({
  results,
  ranking,
  referenceDate,
  months = 6
}: {
  results: LaPrimeraDraw[];
  ranking: Array<{ number: number }>;
  referenceDate: string;
  months?: number;
}) {
  const delayedBySession = (["dia", "noche"] as const).map((session) => ({
    session,
    numbers: referenceDate ? getDelayedRosterNumbers(results, ranking, session, referenceDate, months) : []
  }));

  return (
    <aside className="rosterDelayPanel" role="status">
      <strong>{months} meses o más sin salir</strong>
      <small>Calculado hasta {referenceDate ? formatShortDate(referenceDate) : "la última fecha disponible"}, por tanda.</small>
      <div className="rosterDelayColumns">
        {delayedBySession.map(({ session, numbers }) => (
          <div key={session}>
            <b>{formatSession(session)}</b>
            {numbers.length ? (
              <div className="rosterDelayList">
                {numbers.map((item) => (
                  <span key={item.number} title={item.lastDate ? `Última salida: ${formatShortDate(item.lastDate)}` : "Sin salida en el historial disponible"}>
                    {formatQuinielonNumber(item.number)}
                    <small>{item.lastDate ? formatShortDate(item.lastDate) : "Sin registro"}</small>
                  </span>
                ))}
              </div>
            ) : <p>Ninguno.</p>}
          </div>
        ))}
      </div>
    </aside>
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
