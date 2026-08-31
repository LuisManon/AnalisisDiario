"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Ball } from "./Ball";
import { DrawBalls } from "./DrawBalls";
import { NumberSearch } from "./NumberSearch";
import { buildStats } from "../lib/stats";
import { buildRecommendedPlays, formatMoney, getDrawDay, getLatestExpectedDrawDate, getNextGameDate, getVirtualPrize, virtualPrizeTable, type VirtualTicket } from "../lib/game";
import type { DayFilter, DrawResult, Play, RecommendedPlay, SimulationResult } from "../lib/types";

type ApiState = {
  results: DrawResult[];
};

type DashboardClientProps = {
  initialData: ApiState;
};

const defaultHistoryPageSize = 5;
type HistoryPageSize = 5 | 10 | 25 | 50 | "todos";
type VirtualEvaluation = {
  draw: DrawResult;
  results: Array<SimulationResult & { prize: { amount: number; label: string } }>;
  total: number;
} | null;
type RecommendationSnapshot = {
  drawDate: string;
  day: "miercoles" | "sabado";
  generatedAt: string;
  plays: RecommendedPlay[];
};
type PreviousRecommendations = RecommendationSnapshot & { draw: DrawResult };

const positionColors = ["#0e7c66", "#1e88a8", "#7357a6", "#d79b25", "#7f8c3a", "#242720"];
const plusColor = "#ee1f2d";

function formatDay(day: string) {
  return day === "miercoles" ? "Miercoles" : day === "sabado" ? "Sabado" : "Todos";
}

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

function getProfileExplanation(profile: RecommendedPlay["profile"], day: string) {
  if (profile === "fuerte") {
    return `Prioriza números con alta afinidad para el ${formatDay(day)}, frecuencia por posición, retraso y combinaciones históricas frecuentes. Evita números con apoyo bajo para ese día.`;
  }
  if (profile === "equilibrada") {
    return `Combina la afinidad del ${formatDay(day)} con el historial general, equilibrando frecuencia, posiciones, pares, rangos, suma típica y diversidad frente a las demás jugadas.`;
  }
  return `Incluye de forma controlada uno o dos números con baja afinidad para el ${formatDay(day)}, sin abandonar los rangos, posiciones y combinaciones respaldados por el historial.`;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [day, setDay] = useState<DayFilter>("todos");
  const [data, setData] = useState<ApiState>(initialData);
  const [status, setStatus] = useState(`Datos listos: ${initialData.results.length} sorteos cargados.`);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSeconds, setUpdateSeconds] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<HistoryPageSize>(defaultHistoryPageSize);
  const [scatterYear, setScatterYear] = useState(initialData.results[0]?.date.slice(0, 4) ?? "todos");
  const [scatterDay, setScatterDay] = useState<DayFilter>("todos");
  const [scatterSeries, setScatterSeries] = useState(["P1", "P2", "P3", "P4", "P5", "P6", "Mas"]);
  const [rangeYear, setRangeYear] = useState(initialData.results[0]?.date.slice(0, 4) ?? "todos");
  const [rangeDay, setRangeDay] = useState<DayFilter>("todos");
  const [rangeSeries, setRangeSeries] = useState(["P1", "P2", "P3", "P4", "P5", "P6"]);
  const [ticket, setTicket] = useState<VirtualTicket>({
    drawDate: getNextGameDate(),
    day: getDrawDay(getNextGameDate()),
    plays: buildRecommendedPlays(initialData.results, getDrawDay(getNextGameDate()), 5),
    submittedAt: null
  });
  const [ticketMessage, setTicketMessage] = useState("Cargando juego virtual...");
  const [ticketEditable, setTicketEditable] = useState(true);
  const [ticketEvaluation, setTicketEvaluation] = useState<VirtualEvaluation>(null);
  const [recommendations, setRecommendations] = useState<RecommendedPlay[]>(() =>
    buildRecommendedPlays(initialData.results.filter((result) => result.date < getNextGameDate()), getDrawDay(getNextGameDate()), 5)
  );
  const [previousRecommendations, setPreviousRecommendations] = useState<PreviousRecommendations | null>(null);
  const automaticUpdateStarted = useRef(false);

  useEffect(() => {
    if (automaticUpdateStarted.current) return;
    automaticUpdateStarted.current = true;
    const expectedDate = getLatestExpectedDrawDate();
    if (expectedDate && (!initialData.results[0]?.date || initialData.results[0].date < expectedDate)) {
      void checkUpdate();
      return;
    }
    const timeout = window.setTimeout(() => setIsPageLoading(false), 500);
    return () => window.clearTimeout(timeout);
  }, []);

  const stats = useMemo(() => buildStats(data.results, day), [data.results, day]);
  const latest = stats.latest;
  const filteredHistory = useMemo(() => {
    return day === "todos" ? data.results : data.results.filter((result) => result.day === day);
  }, [data.results, day]);
  const availableYears = useMemo(() => {
    return [...new Set(data.results.map((result) => result.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  }, [data.results]);
  const scatterResults = useMemo(() => {
    const byYear = scatterYear === "todos" ? data.results : data.results.filter((result) => result.date.startsWith(scatterYear));
    return scatterDay === "todos" ? byYear : byYear.filter((result) => result.day === scatterDay);
  }, [data.results, scatterDay, scatterYear]);
  const rangeResults = useMemo(() => {
    const byYear = rangeYear === "todos" ? data.results : data.results.filter((result) => result.date.startsWith(rangeYear));
    return rangeDay === "todos" ? byYear : byYear.filter((result) => result.day === rangeDay);
  }, [data.results, rangeDay, rangeYear]);
  const activePageSize = historyPageSize === "todos" ? filteredHistory.length || defaultHistoryPageSize : historyPageSize;
  const historyPageCount = Math.max(1, Math.ceil(filteredHistory.length / activePageSize));
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * activePageSize, historyPage * activePageSize);

  useEffect(() => {
    fetch(`/api/virtual-ticket?drawDate=${ticket.drawDate}`)
      .then((response) => response.json())
      .then((payload) => {
        setTicket(payload.ticket);
        setTicketEditable(payload.window.isEditable);
        setTicketEvaluation(payload.evaluation);
        setRecommendations(payload.recommendations?.plays ?? []);
        setPreviousRecommendations(payload.previousRecommendations ?? null);
        setTicketMessage(
          payload.window.isEditable
            ? "Puedes editar y reenviar hasta las 5:00 PM del dia del sorteo."
            : "Jugadas bloqueadas. El cierre de edicion fue a las 5:00 PM."
        );
      })
      .catch(() => setTicketMessage("No se pudo cargar el juego virtual."));
  }, [ticket.drawDate]);

  useEffect(() => {
    if (!isUpdating) return;
    const interval = window.setInterval(() => setUpdateSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isUpdating]);

  function changeDay(option: DayFilter) {
    setDay(option);
    setHistoryPage(1);
  }

  function changeHistoryPageSize(value: string) {
    setHistoryPageSize(value === "todos" ? "todos" : (Number(value) as HistoryPageSize));
    setHistoryPage(1);
  }

  async function checkUpdate() {
    setIsUpdating(true);
    setIsPageLoading(true);
    setUpdateSeconds(0);
    setStatus("Revisando data disponible...");
    const minimumLoading = new Promise((resolve) => window.setTimeout(resolve, 500));
    try {
      const response = await fetch("/api/update");
      const payload = await response.json();
      await minimumLoading;
      if (!response.ok) throw new Error(payload.message);
      if (Array.isArray(payload.results)) setData({ results: payload.results });
      setStatus(`${payload.message} Total: ${payload.total}. Ultimo sorteo: ${payload.latest?.date ?? "N/D"}.`);
    } catch {
      await minimumLoading;
      setStatus("No se pudo consultar la fuente remota. La data local permanece disponible.");
    } finally {
      setIsUpdating(false);
      setIsPageLoading(false);
    }
  }

  function downloadHistory() {
    const blob = new Blob([`${JSON.stringify(data.results, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loto-mas-historial-${data.results[0]?.date ?? "sin-fecha"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Historial JSON preparado: ${data.results.length} sorteos.`);
  }

  function updateTicketPlay(playId: number, key: "numbers" | "plus", value: string) {
    if (!ticketEditable) return;
    setTicket((current) => ({
      ...current,
      plays: current.plays.map((play) => {
        if (play.id !== playId) return play;
        if (key === "plus") return { ...play, plus: Number(value) };
        return {
          ...play,
          numbers: value
            .split(",")
            .map((item) => Number(item.trim()))
            .filter(Boolean)
            .slice(0, 6)
        };
      })
    }));
  }

  function useRecommendedPlay(play: Play) {
    updateTicketPlay(play.id, "numbers", play.numbers.join(", "));
    updateTicketPlay(play.id, "plus", String(play.plus));
  }

  async function submitTicket() {
    const response = await fetch("/api/virtual-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawDate: ticket.drawDate, plays: ticket.plays })
    });
    const payload = await response.json();
    if (!response.ok) {
      setTicketMessage(payload.error ?? "No se pudieron enviar las jugadas.");
      return;
    }
    setTicket(payload.ticket);
    setTicketEditable(payload.window.isEditable);
    setTicketMessage(
      payload.window.isEditable
        ? "Jugadas enviadas. Puedes editarlas y reenviarlas hasta las 5:00 PM."
        : "Jugadas enviadas. Quedan bloqueadas para este sorteo virtual."
    );
  }

  if (isPageLoading) {
    return <DashboardSkeleton message={isUpdating ? `Revisando data disponible... ${updateSeconds}s` : "Cargando resultados locales..."} />;
  }

  return (
    <main className="lotoTheme">
      <section className="hero">
        <div>
          <p className="eyebrow">Loto Mas Lab local</p>
          <h1>Analisis, frecuencia y simulacion de jugadas</h1>
          <p className="subcopy">
            Dashboard privado para revisar resultados, comparar miercoles contra sabado y probar 5 jugadas contra el ultimo sorteo cargado.
          </p>
        </div>
        <div className="heroPanel">
          <span className="panelLabel">Ultimo sorteo</span>
          {latest ? (
            <>
              <strong>{latest.date} · {formatDay(latest.day)}</strong>
              <DrawBalls numbers={latest.numbers} plus={latest.plus} />
              <details className="latestPrizeTable">
                <summary>Ver tabla de premios</summary>
                <table>
                  <tbody>
                    {virtualPrizeTable.map((prize) => (
                      <tr key={`${prize.matches}-${prize.plus}`}>
                        <td>{prize.label}</td>
                        <th>{formatMoney(prize.amount)}</th>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small>Premios mínimos usados para la evaluación virtual.</small>
              </details>
            </>
          ) : (
            <strong>Sin datos</strong>
          )}
        </div>
      </section>

      <section className="toolbar">
        <div className="segmented">
          {(["todos", "miercoles", "sabado"] as DayFilter[]).map((option) => (
            <button key={option} className={day === option ? "active" : ""} onClick={() => changeDay(option)}>
              {formatDay(option)}
            </button>
          ))}
        </div>
        <button className="secondaryButton" onClick={checkUpdate} disabled={isUpdating}>
          {isUpdating ? "Revisando..." : "Revisar actualizacion"}
        </button>
        <button className="downloadButton" onClick={downloadHistory}>
          <span aria-hidden="true">↓</span> Descargar JSON
        </button>
        <span className="status">{isUpdating ? `${status} ${updateSeconds}s` : status}</span>
      </section>

      <section className="metricsGrid">
        <div className="metric">
          <span>Sorteos analizados</span>
          <strong>{stats.drawCount}</strong>
        </div>
        <div className="metric">
          <span>Filtro activo</span>
          <strong>{formatDay(stats.day)}</strong>
        </div>
        <div className="metric">
          <span>Numero caliente</span>
          <strong>{stats.totalTop[0]?.number ?? "N/D"}</strong>
        </div>
        <div className="metric">
          <span>Mas frecuente</span>
          <strong className="redText">{stats.plusTop[0]?.number ?? "N/D"}</strong>
        </div>
      </section>

      <details className="topPositionsAccordion" open>
        <summary>
          <span>Top 5 por posicion</span>
          <small>Cada columna calcula repeticion respetando la posicion exacta del sorteo.</small>
        </summary>
        <section className="topPositionsBoard">
          <div className="topPositionsGuide">
            <span><i className="guideRank">#</i> Orden por frecuencia</span>
            <span><i className="guideBar" /> La barra compara con el lider de cada posicion</span>
            <span><b>{stats.drawCount}</b> sorteos en el filtro actual</span>
          </div>
          <div className="topPositionsGrid">
            {stats.byPosition.map((position, positionIndex) => {
              const maxCount = Math.max(1, ...position.top.map((entry) => entry.count));
              const color = positionColors[positionIndex];
              return (
                <article className="positionRankingCard" key={position.position} style={{ borderTopColor: color }}>
                  <header className="positionRankingHeader">
                    <span className="positionColorDot" style={{ backgroundColor: color }} />
                    <div>
                      <span>P{position.position}</span>
                      <h3>Posicion {position.position}</h3>
                    </div>
                  </header>
                  <div className="positionRankingList">
                    {position.top.map((entry, rank) => (
                      <div className="positionRankingItem" key={entry.number}>
                        <span className={`rankNumber rankNumber${rank + 1}`}>{rank + 1}</span>
                        <Ball value={entry.number} winner={latest?.numbers.includes(entry.number)} />
                        <div className="positionFrequency">
                          <div className="positionFrequencyMeta">
                            <span>{rank === 0 ? "Lider" : `Top ${rank + 1}`}</span>
                            <strong>{entry.count} salidas</strong>
                          </div>
                          <div className="positionBar">
                            <span style={{ backgroundColor: color, width: `${(entry.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
            <article className="positionRankingCard positionRankingPlus" style={{ borderTopColor: plusColor }}>
              <header className="positionRankingHeader">
                <span className="positionColorDot" style={{ backgroundColor: plusColor }} />
                <div>
                  <span>MAS</span>
                  <h3>Numero Mas</h3>
                </div>
              </header>
              <div className="positionRankingList">
                {stats.plusTop.map((entry, rank) => {
                  const maxCount = Math.max(1, ...stats.plusTop.map((item) => item.count));
                  return (
                    <div className="positionRankingItem" key={entry.number}>
                      <span className={`rankNumber rankNumber${rank + 1}`}>{rank + 1}</span>
                      <Ball value={entry.number} plus winner={entry.number === latest?.plus} />
                      <div className="positionFrequency">
                        <div className="positionFrequencyMeta">
                          <span>{rank === 0 ? "Lider" : `Top ${rank + 1}`}</span>
                          <strong>{entry.count} salidas</strong>
                        </div>
                        <div className="positionBar positionBarPlus">
                          <span style={{ width: `${(entry.count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        </section>
      </details>

      <section className="sectionHeader">
        <h2>Simulador de 5 jugadas</h2>
        <p>5 jugadas remotas para el proximo sorteo. Se bloquean al enviarlas o despues de las 5:00 PM.</p>
      </section>
      <section className="ticketPanel">
        <article className="card">
          <div className="gameHeader">
            <div>
              <span className="panelLabel">Sorteo virtual</span>
              <h3>{ticket.drawDate} · {formatDay(ticket.day)}</h3>
              <p className="muted">{ticketMessage}</p>
            </div>
            <strong className={ticketEditable ? "openBadge" : "lockedBadge"}>{ticketEditable ? "Editable" : "Bloqueado"}</strong>
          </div>
          <div className="plays">
            {ticket.plays.map((play) => (
              <div className="playRow ticketRow" key={play.id}>
                <span>#{play.id}</span>
                <input disabled={!ticketEditable} value={play.numbers.join(", ")} onChange={(event) => updateTicketPlay(play.id, "numbers", event.target.value)} />
                <input disabled={!ticketEditable} className="plusInput" type="number" min="1" max="12" value={play.plus} onChange={(event) => updateTicketPlay(play.id, "plus", event.target.value)} />
              </div>
            ))}
          </div>
          <button className="primaryButton" onClick={submitTicket} disabled={!ticketEditable}>Enviar jugadas virtuales</button>
        </article>
      </section>

      <section className="recommendationComparison">
        <RecommendationSnapshotCard
          snapshot={previousRecommendations}
          results={data.results}
          title="Recomendaciones del sorteo anterior"
        />
        <article className="card">
          <div className="recommendationTitleRow">
            <h2>Recomendaciones del próximo sorteo</h2>
            <details className="recommendationPrizeInfo">
              <summary aria-label="Consultar tabla de premios">i</summary>
              <div className="recommendationPrizePanel">
                <strong>Tabla de premios Loto Más</strong>
                <small>Premios mínimos informados para cada combinación.</small>
                <table>
                  <tbody>
                    {virtualPrizeTable.map((prize) => (
                      <tr key={`${prize.matches}-${prize.plus}`}>
                        <td>{prize.label}</td>
                        <th>{formatMoney(prize.amount)}</th>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small>Los premios de 6 aciertos y 6 + Más se muestran como montos garantizados.</small>
              </div>
            </details>
          </div>
          <p className="muted">Analisis inclinado al proximo sorteo del {formatDay(ticket.day)} {formatShortDate(ticket.drawDate)}: afinidad por dia, rangos por posicion, frecuencia, retraso y diversidad.</p>
          <div className="recommendationList">
            {recommendations.map((play) => {
              const currentDraw = data.results.find((result) => result.date === ticket.drawDate);
              const matches = currentDraw ? play.numbers.filter((number) => currentDraw.numbers.includes(number)).length : 0;
              const plusMatched = Boolean(currentDraw && play.plus === currentDraw.plus);
              const prize = getVirtualPrize(matches, plusMatched);
              return (
                <div className="recommendationItem" key={play.id}>
                  <span>#{play.id}</span>
                  <div className="recommendationNumbers">
                    <div className="recommendationProfileRow">
                      <span
                        className={`recommendationProfile ${play.profile}`}
                        tabIndex={0}
                        title={getProfileExplanation(play.profile, ticket.day)}
                        aria-label={getProfileExplanation(play.profile, ticket.day)}
                      >
                        {play.profile === "fuerte" ? "Inclinacion fuerte" : play.profile === "equilibrada" ? "Jugada equilibrada" : "Jugada exploratoria"}
                      </span>
                      <small>{play.profile === "fuerte" ? `${play.daySupportCount}/6 con respaldo del ${formatDay(ticket.day)}` : play.profile === "equilibrada" ? `Balance ${formatDay(ticket.day)} + historial general` : `${6 - play.daySupportCount} de baja afinidad del ${formatDay(ticket.day)}`}</small>
                    </div>
                    <RecommendationBalls play={play} results={data.results} dayFilter={ticket.day} winningDraw={currentDraw} />
                    <span className={prize.amount ? "recommendationPrize won" : "recommendationPrize"}>
                      {!currentDraw ? "Pendiente de resultado" : prize.amount ? `Ganó ${formatMoney(prize.amount)} · ${prize.label}` : `Sin premio · ${matches} ${matches === 1 ? "acierto" : "aciertos"}${plusMatched ? " + Más" : ""}`}
                    </span>
                  </div>
                  <div className="recommendationActions">
                    <span className="scoreBadge" title="Puntaje relativo dentro de los candidatos analizados">{play.score} pts</span>
                    <button className="miniButton" disabled={!ticketEditable} onClick={() => useRecommendedPlay(play)}>Usar</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="recommendationDisclaimer">
            Recomendaciones basadas en patrones historicos. No predicen ni garantizan resultados.
          </p>
        </article>
      </section>

      <section className="card virtualResults">
        <h2>Resultado del juego virtual</h2>
        {ticketEvaluation ? (
          <>
            <div className="drawSummary">
              <span>{ticketEvaluation.draw.date}</span>
              <DrawBalls numbers={ticketEvaluation.draw.numbers} plus={ticketEvaluation.draw.plus} winningNumbers={latest?.numbers} winningPlus={latest?.plus} />
            </div>
            <strong className="totalPrize">Premio virtual total: {formatMoney(ticketEvaluation.total)}</strong>
            <div className="simulation">
              {ticketEvaluation.results.map((result) => (
                <div className="simRow" key={result.play.id}>
                  <strong>Jugada {result.play.id}</strong>
                  <span>{result.matchedNumbers.length} aciertos {result.plusMatched ? "+ Mas" : ""} · {result.prize.label} · {formatMoney(result.prize.amount)}</span>
                  <div className="ballsRow small">
                    {result.play.numbers.map((number) => (
                      <Ball key={number} value={number} muted={!result.matchedNumbers.includes(number)} winner={result.matchedNumbers.includes(number)} />
                    ))}
                    <Ball value={result.play.plus} plus muted={!result.plusMatched} winner={result.plusMatched} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">Cuando el resultado del sorteo este cargado, aqui se calcula el premio virtual. La tabla de premios es configurable y no representa una apuesta real.</p>
        )}
      </section>

      <NumberSearch results={data.results} />

      <section className="sectionHeader">
        <h2>Diagrama de dispersion</h2>
        <p>Distribucion de numeros por sorteo. Los puntos rojos representan el numero Mas.</p>
      </section>
      <section className="card scatterSection">
        <div className="scatterControls">
          <label htmlFor="scatterYear">Año</label>
          <select id="scatterYear" value={scatterYear} onChange={(event) => setScatterYear(event.target.value)}>
            <option value="todos">Todos</option>
            {availableYears.map((year) => (
              <option value={year} key={year}>{year}</option>
            ))}
          </select>
          <label htmlFor="scatterDay">Dia</label>
          <select id="scatterDay" value={scatterDay} onChange={(event) => setScatterDay(event.target.value as DayFilter)}>
            <option value="todos">Todos</option>
            <option value="miercoles">Miercoles</option>
            <option value="sabado">Sabado</option>
          </select>
          <span>{scatterResults.length} sorteos graficados</span>
        </div>
        <SeriesFilter selected={scatterSeries} onChange={setScatterSeries} />
        <ScatterPlot results={scatterResults} selectedSeries={scatterSeries} />
      </section>

      <section className="sectionHeader">
        <h2>Mapa de rangos</h2>
        <p>Rango normal por posicion, ignorando salidas poco comunes para no deformar el analisis.</p>
      </section>
      <section className="card rangeMapSection">
        <div className="scatterControls">
          <label htmlFor="rangeYear">Año</label>
          <select id="rangeYear" value={rangeYear} onChange={(event) => setRangeYear(event.target.value)}>
            <option value="todos">Todos</option>
            {availableYears.map((year) => (
              <option value={year} key={year}>{year}</option>
            ))}
          </select>
          <label htmlFor="rangeDay">Dia</label>
          <select id="rangeDay" value={rangeDay} onChange={(event) => setRangeDay(event.target.value as DayFilter)}>
            <option value="todos">Todos</option>
            <option value="miercoles">Miercoles</option>
            <option value="sabado">Sabado</option>
          </select>
          <span>{rangeResults.length} sorteos analizados</span>
        </div>
        <SeriesFilter selected={rangeSeries} onChange={setRangeSeries} options={["P1", "P2", "P3", "P4", "P5", "P6"]} />
        <RangeMap results={rangeResults} selectedSeries={rangeSeries} />
      </section>

      <section className="sectionHeader">
        <h2>Historial cargado</h2>
        <p>{filteredHistory.length} sorteos en el filtro actual. Mostrando {paginatedHistory.length} por pagina.</p>
      </section>
      <section className="historyControls">
        <label htmlFor="historyPageSize">Mostrar</label>
        <select id="historyPageSize" value={historyPageSize} onChange={(event) => changeHistoryPageSize(event.target.value)}>
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="todos">Todos</option>
        </select>
        <span>resultados del historial</span>
      </section>
      <section className="history">
        {paginatedHistory.map((result) => (
          <article className="historyRow" key={result.date}>
            <div className="historyDate">
              <strong>{result.date}</strong>
              <span>{formatLongDate(result.date)}</span>
            </div>
            <DrawBalls numbers={result.numbers} plus={result.plus} winningNumbers={latest?.numbers} winningPlus={latest?.plus} />
          </article>
        ))}
      </section>
      <nav className="pagination" aria-label="Paginacion del historial">
        <button
          className="secondaryButton"
          disabled={historyPage === 1 || historyPageSize === "todos"}
          onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
        >
          Anterior
        </button>
        <span>{historyPageSize === "todos" ? "Todos visibles" : `Pagina ${historyPage} de ${historyPageCount}`}</span>
        <button
          className="secondaryButton"
          disabled={historyPage === historyPageCount || historyPageSize === "todos"}
          onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}
        >
          Siguiente
        </button>
      </nav>
    </main>
  );
}

function RecommendationSnapshotCard({
  snapshot,
  results,
  title
}: {
  snapshot: PreviousRecommendations | null;
  results: DrawResult[];
  title: string;
}) {
  if (!snapshot) {
    return (
      <article className="card recommendationHistoryCard">
        <h2>{title}</h2>
        <p className="muted">Todavía no hay un sorteo anterior disponible para comparar.</p>
      </article>
    );
  }

  const analysisResults = results.filter((result) => result.date < snapshot.drawDate);
  return (
    <article className="card recommendationHistoryCard">
      <div className="recommendationTitleRow">
        <div>
          <span className="panelLabel">Sorteo anterior evaluado</span>
          <h2>{title}</h2>
        </div>
        <strong className="reviewedBadge">Revisado</strong>
      </div>
      <p className="muted">{formatDay(snapshot.day)} {formatShortDate(snapshot.drawDate)} · recomendaciones congeladas antes del sorteo.</p>
      <div className="recommendationList">
        {snapshot.plays.map((play) => {
          const matches = play.numbers.filter((number) => snapshot.draw.numbers.includes(number)).length;
          const plusMatched = play.plus === snapshot.draw.plus;
          const prize = getVirtualPrize(matches, plusMatched);
          return (
            <div className="recommendationItem" key={play.id}>
              <span>#{play.id}</span>
              <div className="recommendationNumbers">
                <div className="recommendationProfileRow">
                  <span
                    className={`recommendationProfile ${play.profile}`}
                    tabIndex={0}
                    title={getProfileExplanation(play.profile, snapshot.day)}
                    aria-label={getProfileExplanation(play.profile, snapshot.day)}
                  >
                    {play.profile === "fuerte" ? "Inclinacion fuerte" : play.profile === "equilibrada" ? "Jugada equilibrada" : "Jugada exploratoria"}
                  </span>
                </div>
                <RecommendationBalls play={play} results={analysisResults} dayFilter={snapshot.day} winningDraw={snapshot.draw} />
                <span className={prize.amount ? "recommendationPrize won" : "recommendationPrize"}>
                  {prize.amount ? `Ganó ${formatMoney(prize.amount)} · ${prize.label}` : `Sin premio · ${matches} ${matches === 1 ? "acierto" : "aciertos"}${plusMatched ? " + Más" : ""}`}
                </span>
              </div>
              <div className="recommendationActions">
                <span className="scoreBadge">{play.score} pts</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="recommendationDisclaimer">Este registro no cambia cuando se agregan resultados posteriores.</p>
    </article>
  );
}

function RecommendationBalls({
  play,
  results,
  dayFilter,
  winningDraw
}: {
  play: RecommendedPlay;
  results: DrawResult[];
  dayFilter: DayFilter;
  winningDraw?: DrawResult;
}) {
  const analysisYear = results[0]?.date.slice(0, 4) ?? String(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<null | {
    x: number;
    y: number;
    date: string | null;
    day: string | null;
    position: string;
  }>(null);

  function findLastResult(number: number, position: number | "plus") {
    return results.find((result) => {
      if (!result.date.startsWith(analysisYear)) return false;
      if (dayFilter !== "todos" && result.day !== dayFilter) return false;
      return position === "plus" ? result.plus === number : result.numbers[position] === number;
    }) ?? null;
  }

  function showTooltip(event: ReactMouseEvent<HTMLElement>, number: number, position: number | "plus") {
    const width = 190;
    const height = 106;
    const gap = 12;
    const edge = 8;
    const lastResult = findLastResult(number, position);
    const preferredX = event.clientX + gap + width > window.innerWidth ? event.clientX - width - gap : event.clientX + gap;
    const preferredY = event.clientY + gap + height > window.innerHeight ? event.clientY - height - gap : event.clientY + gap;

    setTooltip({
      x: Math.min(Math.max(preferredX, edge), window.innerWidth - width - edge),
      y: Math.min(Math.max(preferredY, edge), window.innerHeight - height - edge),
      date: lastResult?.date ?? null,
      day: lastResult?.day ?? null,
      position: position === "plus" ? "Numero Mas" : `Posicion ${position + 1}`
    });
  }

  return (
    <div className="ballsRow recommendationBalls" onMouseLeave={() => setTooltip(null)}>
      {play.numbers.map((number, position) => (
        <span
          className="recommendationBallTarget"
          key={`${position}-${number}`}
          onMouseEnter={(event) => showTooltip(event, number, position)}
          onMouseMove={(event) => showTooltip(event, number, position)}
        >
          <Ball value={number} winner={winningDraw?.numbers.includes(number)} />
        </span>
      ))}
      <span
        className="recommendationBallTarget"
        onMouseEnter={(event) => showTooltip(event, play.plus, "plus")}
        onMouseMove={(event) => showTooltip(event, play.plus, "plus")}
      >
        <Ball value={play.plus} plus winner={play.plus === winningDraw?.plus} />
      </span>
      {tooltip ? (
        <div className="recommendationTooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.position}</strong>
          {tooltip.date ? (
            <>
              <span>Fecha: <b>{formatShortDate(tooltip.date)}</b></span>
              <span>Dia: <b>{formatDay(tooltip.day ?? "")}</b></span>
            </>
          ) : (
            <span>
              No ha salido en {analysisYear}
              {dayFilter === "todos" ? "" : ` en sorteos de ${formatDay(dayFilter)}`}
              {" "}en esta posicion.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SeriesFilter({
  selected,
  onChange,
  options = ["P1", "P2", "P3", "P4", "P5", "P6", "Mas"]
}: {
  selected: string[];
  onChange: (series: string[]) => void;
  options?: string[];
}) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }
    onChange([...selected, option]);
  }

  return (
    <div className="seriesFilter" aria-label="Filtro de posiciones del diagrama">
      {options.map((option) => (
        <label key={option} className={selected.includes(option) ? "seriesChip active" : "seriesChip"}>
          <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
          {option}
        </label>
      ))}
    </div>
  );
}

function ScatterPlot({ results, selectedSeries }: { results: DrawResult[]; selectedSeries: string[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollMaximum, setScrollMaximum] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<null | {
    x: number;
    y: number;
    date: string;
    day: string;
    number: number;
    position: string;
  }>(null);
  const width = Math.max(960, results.length * 18 + 110);
  const height = 530;
  const padding = { top: 34, right: 54, bottom: 120, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const pointInset = 14;
  const ordered = [...results].sort((a, b) => a.date.localeCompare(b.date));
  const xFor = (index: number) => padding.left + (ordered.length <= 1
    ? plotWidth / 2
    : pointInset + (index / (ordered.length - 1)) * (plotWidth - pointInset * 2));
  const yFor = (number: number) => padding.top + ((40 - number) / 39) * plotHeight;
  const yTicks = [1, 5, 10, 15, 20, 25, 30, 35, 40];
  const dateTicks = ordered
    .map((result, index) => ({ result, index }))
    .filter((_, index, source) => index === 0 || index === source.length - 1 || index % Math.max(1, Math.floor(source.length / 6)) === 0);
  const firstDate = ordered[0]?.date;
  const lastDate = ordered[ordered.length - 1]?.date;
  const visiblePositions = [0, 1, 2, 3, 4, 5].filter((position) => selectedSeries.includes(`P${position + 1}`));
  const showPlus = selectedSeries.includes("Mas");
  const normalPointCount = ordered.length * visiblePositions.length;
  const plusPointCount = showPlus ? ordered.length : 0;

  useEffect(() => {
    function measureScroll() {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      setScrollMaximum(maximum);
      setScrollPosition(Math.min(viewport.scrollLeft, maximum));
    }

    measureScroll();
    window.addEventListener("resize", measureScroll);
    return () => window.removeEventListener("resize", measureScroll);
  }, [width]);

  function moveScroll(value: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = value;
    setScrollPosition(value);
  }

  function showTooltip(
    event: ReactMouseEvent<SVGCircleElement>,
    info: { date: string; day: string; number: number; position: string }
  ) {
    const wrapper = event.currentTarget.closest<HTMLElement>(".scatterViewport");
    if (!wrapper) return;

    const box = wrapper.getBoundingClientRect();
    const tooltipWidth = 180;
    const tooltipHeight = 126;
    const gap = 12;
    const edge = 8;
    const pointX = event.clientX - box.left + wrapper.scrollLeft;
    const pointY = event.clientY - box.top + wrapper.scrollTop;
    const visibleLeft = wrapper.scrollLeft + edge;
    const visibleRight = wrapper.scrollLeft + wrapper.clientWidth - tooltipWidth - edge;
    const visibleTop = wrapper.scrollTop + edge;
    const visibleBottom = wrapper.scrollTop + wrapper.clientHeight - tooltipHeight - edge;
    const preferredX = pointX + gap + tooltipWidth > wrapper.scrollLeft + wrapper.clientWidth
      ? pointX - tooltipWidth - gap
      : pointX + gap;
    const preferredY = pointY + gap + tooltipHeight > wrapper.scrollTop + wrapper.clientHeight
      ? pointY - tooltipHeight - gap
      : pointY + gap;

    setHoverInfo({
      ...info,
      x: Math.min(Math.max(preferredX, visibleLeft), Math.max(visibleLeft, visibleRight)),
      y: Math.min(Math.max(preferredY, visibleTop), Math.max(visibleTop, visibleBottom))
    });
  }

  if (!ordered.length) {
    return <div className="emptyChart">No hay sorteos para este filtro.</div>;
  }

  return (
    <div className="scatterWrap">
      <div className="chartSummary">
        <span>Rango: <strong>{firstDate}</strong> a <strong>{lastDate}</strong></span>
        <span>Sorteos: <strong>{ordered.length}</strong></span>
        <span>Puntos: <strong>{normalPointCount + plusPointCount}</strong></span>
      </div>
      <div
        className="scatterViewport"
        ref={viewportRef}
        onScroll={(event) => setScrollPosition(event.currentTarget.scrollLeft)}
      >
        {hoverInfo ? (
          <div className="chartTooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
            <strong>{hoverInfo.position}</strong>
            <span>Fecha: {hoverInfo.date}</span>
            <span>Dia: {hoverInfo.day}</span>
            <span>Numero: {String(hoverInfo.number).padStart(2, "0")}</span>
          </div>
        ) : null}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Diagrama de dispersion de resultados">
        <rect className="chartPlotBg" x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} rx="8" />
        {yTicks.map((tick) => (
          <g key={tick}>
            <line className="chartGrid" x1={padding.left} x2={width - padding.right} y1={yFor(tick)} y2={yFor(tick)} />
            <text className="chartTick" x={padding.left - 12} y={yFor(tick) + 4} textAnchor="end">{tick}</text>
          </g>
        ))}
        {dateTicks.map(({ result, index }) => (
          <g key={result.date}>
            <line className="chartGrid vertical" x1={xFor(index)} x2={xFor(index)} y1={padding.top} y2={height - padding.bottom} />
            <text className="chartDate angled" x={xFor(index)} y={height - 92} textAnchor="end" transform={`rotate(-38 ${xFor(index)} ${height - 92})`}>
              {result.date.slice(5)}
            </text>
          </g>
        ))}
        <line className="chartAxis" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />
        <line className="chartAxis" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
        <text className="chartAxisLabel" x="18" y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}>
          Numero sorteado
        </text>
        <text className="chartAxisLabel" x={padding.left + plotWidth / 2} y={height - 16} textAnchor="middle">
          Sorteos en orden cronologico
        </text>
        {ordered.map((result, index) => {
          const x = xFor(index);
          return (
            <g key={result.date}>
              {result.numbers.map((number, numberIndex) => (
                selectedSeries.includes(`P${numberIndex + 1}`) ? (
                  <circle
                    className="scatterPoint"
                    cx={x + (numberIndex - 2.5) * 4}
                    cy={yFor(number)}
                  fill={positionColors[numberIndex]}
                  r="4.4"
                  key={`${result.date}-${numberIndex}`}
                  onMouseEnter={(event) =>
                    showTooltip(event, {
                      date: formatShortDate(result.date),
                      day: formatDay(result.day),
                      number,
                      position: `Posicion ${numberIndex + 1}`
                    })
                  }
                  onMouseMove={(event) =>
                    showTooltip(event, {
                      date: formatShortDate(result.date),
                      day: formatDay(result.day),
                      number,
                      position: `Posicion ${numberIndex + 1}`
                    })
                  }
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  <title>{`${result.date} · ${formatDay(result.day)} · Posicion ${numberIndex + 1}: ${String(number).padStart(2, "0")}`}</title>
                </circle>
              ) : null
            ))}
              {showPlus ? (
                <circle
                  className="scatterPlus"
                  cx={x}
                  cy={yFor(result.plus)}
                  r="6.2"
                  onMouseEnter={(event) =>
                    showTooltip(event, {
                      date: formatShortDate(result.date),
                      day: formatDay(result.day),
                      number: result.plus,
                      position: "Numero Mas"
                    })
                  }
                  onMouseMove={(event) =>
                    showTooltip(event, {
                      date: formatShortDate(result.date),
                      day: formatDay(result.day),
                      number: result.plus,
                      position: "Numero Mas"
                    })
                  }
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  <title>{`${result.date} · ${formatDay(result.day)} · Mas: ${String(result.plus).padStart(2, "0")}`}</title>
                </circle>
              ) : null}
            </g>
          );
        })}
        <text className="chartDate endpoint" x={padding.left} y={height - 52}>{firstDate}</text>
        <text className="chartDate endpoint" x={width - padding.right} y={height - 52} textAnchor="end">{lastDate}</text>
        </svg>
      </div>
      <div className="scatterScrollControl">
        <span>Inicio</span>
        <input
          aria-label="Desplazar horizontalmente el diagrama"
          type="range"
          min="0"
          max={Math.max(1, scrollMaximum)}
          step="1"
          value={Math.min(scrollPosition, Math.max(1, scrollMaximum))}
          disabled={scrollMaximum === 0}
          onChange={(event) => moveScroll(Number(event.target.value))}
        />
        <span>Final</span>
      </div>
      <div className="chartLegend">
        {positionColors.map((color, index) => selectedSeries.includes(`P${index + 1}`) ? (
          <span key={color}><i className="legendDot" style={{ background: color }} /> P{index + 1}</span>
        ) : null)}
        {showPlus ? (
          <span><i className="legendDot red" /> Mas</span>
        ) : (
          <span className="muted">Sin series visibles de Mas</span>
        )}
      </div>
    </div>
  );
}

function shortestCoverageRange(values: number[], coverage = 0.8) {
  if (!values.length) return { low: 0, high: 0 };
  if (values.length < 10) return { low: values[0], high: values[values.length - 1] };

  const sampleSize = Math.max(1, Math.ceil(values.length * coverage));
  let low = values[0];
  let high = values[sampleSize - 1];

  for (let start = 1; start + sampleSize <= values.length; start += 1) {
    const candidateLow = values[start];
    const candidateHigh = values[start + sampleSize - 1];
    if (candidateHigh - candidateLow < high - low) {
      low = candidateLow;
      high = candidateHigh;
    }
  }

  return { low, high };
}

function buildRangeRows(results: DrawResult[], selectedSeries: string[]) {
  return [0, 1, 2, 3, 4, 5]
    .filter((position) => selectedSeries.includes(`P${position + 1}`))
    .map((position) => {
      const values = results.map((result) => result.numbers[position]).sort((a, b) => a - b);
      const { low, high } = shortestCoverageRange(values);
      const omitted = values.filter((value) => value < low || value > high).length;
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return {
        key: `P${position + 1}`,
        label: `Posicion ${position + 1}`,
        shortLabel: `P${position + 1}`,
        color: positionColors[position],
        low,
        high,
        omitted,
        samples: values.length,
        average
      };
    });
}

function RangeMap({ results, selectedSeries }: { results: DrawResult[]; selectedSeries: string[] }) {
  const rows = buildRangeRows(results, selectedSeries);
  const maxNumber = 40;
  const ticks = [1, 5, 10, 15, 20, 25, 30, 35, 40];

  if (!results.length) {
    return <div className="emptyChart rangeMapEmpty">No hay sorteos suficientes para calcular rangos.</div>;
  }

  if (!rows.length) {
    return <div className="emptyChart rangeMapEmpty">Selecciona al menos una posicion para ver el mapa de rangos.</div>;
  }

  return (
    <section className="rangeMap" aria-label="Mapa de rangos por posicion">
      <div className="rangeMapHeader">
        <div>
          <span className="panelLabel">Mapa de rangos</span>
          <h3>Rango normal de salida por posicion</h3>
        </div>
        <p>
          Calcula por posicion el intervalo mas compacto que concentra el 80% de sus apariciones.
        </p>
        <div className="rangeInfo">
          <button type="button" aria-label="Informacion del mapa de rangos">i</button>
          <div className="rangeInfoTooltip" role="tooltip">
            <strong>Como se calcula el mapa de rangos</strong>
            <span>Cada posicion se calcula por separado usando solamente sus propias salidas.</span>
            <span>Busca el intervalo numerico mas corto que contiene al menos el 80% de las apariciones de esa posicion.</span>
            <span>Una bola frecuente se mantiene aunque este en un extremo, como el 40 en P6.</span>
            <span>Las salidas aisladas quedan fuera y se cuentan como fuera del rango, pero no deforman la linea.</span>
            <span>Ejemplo: si P1 se concentra entre 01 y 10, una salida aislada del 18 no extiende su rango normal.</span>
            <span>Esto solo afecta el analisis visual del mapa. Todavia no altera el algoritmo de Jugadas recomendadas.</span>
          </div>
        </div>
      </div>

      <div className="rangeAxis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ left: `${((tick - 1) / (maxNumber - 1)) * 100}%` }}>{String(tick).padStart(2, "0")}</span>
        ))}
      </div>

      <div className="rangeRows">
        {rows.map((row) => {
          const left = ((row.low - 1) / (maxNumber - 1)) * 100;
          const right = ((Math.min(row.high, maxNumber) - 1) / (maxNumber - 1)) * 100;
          return (
            <article className="rangeRow" key={row.key}>
              <div className="rangeLabel">
                <i style={{ background: row.color }} />
                <strong>{row.shortLabel}</strong>
                <span>{row.label}</span>
              </div>
              <div className="rangeTrack">
                <div
                  className="rangeBandGlow"
                  style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, background: row.color }}
                />
                <div
                  className="rangeBand"
                  style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, background: row.color }}
                />
                <span className="rangeStart" style={{ left: `${left}%` }}>{String(row.low).padStart(2, "0")}</span>
                <span className="rangeEnd" style={{ left: `${right}%` }}>{String(row.high).padStart(2, "0")}</span>
              </div>
              <div className="rangeStats">
                <strong>{String(row.low).padStart(2, "0")} - {String(row.high).padStart(2, "0")}</strong>
                <span>Prom. {row.average.toFixed(1)} · {row.omitted} fuera del rango · {row.samples} sorteos</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DashboardSkeleton({ message }: { message: string }) {
  return (
    <main>
      <section className="hero">
        <div>
          <div className="skeletonLine tiny" />
          <div className="skeletonBlock heroTitleSkeleton" />
          <div className="skeletonLine wide" />
          <div className="skeletonLine medium" />
        </div>
        <div className="heroPanel skeletonPanel">
          <div className="skeletonLine tiny" />
          <div className="skeletonLine medium" />
          <div className="skeletonBalls">
            {Array.from({ length: 7 }, (_, index) => (
              <span className="skeletonBall" key={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div className="skeletonButton" />
        <div className="skeletonButton short" />
        <span className="status">{message}</span>
      </section>

      <section className="metricsGrid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="metric skeletonPanel" key={index}>
            <div className="skeletonLine medium" />
            <div className="skeletonLine number" />
          </div>
        ))}
      </section>

      <section className="positionGrid">
        {Array.from({ length: 7 }, (_, cardIndex) => (
          <article className="card skeletonPanel" key={cardIndex}>
            <div className="skeletonLine medium" />
            <div className="rankList">
              {Array.from({ length: 5 }, (_, rowIndex) => (
                <div className="rankItem" key={rowIndex}>
                  <span className="skeletonBall" />
                  <div className="bar skeletonBar"><span /></div>
                  <div className="skeletonLine count" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
