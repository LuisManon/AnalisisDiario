"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Ball } from "./Ball";
import { AnalysisWorkspace } from "./AnalysisWorkspace";
import { DrawPublicationStatus } from "./DrawPublicationStatus";
import { LotoTopFive } from "./LotoTopFive";
import { LotoPrizeInfo } from "./LotoPrizeInfo";
import { publicationWindow } from "../lib/draw-schedule";
import { DrawBalls } from "./DrawBalls";
import { NumberSearch } from "./NumberSearch";
import { buildStats } from "../lib/stats";
import { formatMoney, getDrawDay, getLatestExpectedDrawDate, getNextGameDate, getVirtualPrize } from "../lib/game";
import type { DayFilter, DrawResult, PortfolioPlay, ThirtyPlayPortfolio, ThirtyPlayPrizeSummary } from "../lib/types";

type ApiState = {
  results: DrawResult[];
};

type DashboardClientProps = {
  initialData: ApiState;
};

const defaultHistoryPageSize = 5;
type PortfolioCalendarEntry = {
  date: string;
  day: "miercoles" | "sabado";
  summary: ThirtyPlayPrizeSummary | null;
  status: "missing" | "pending";
};

const positionColors = ["#0e7c66", "#1e88a8", "#7357a6", "#d79b25", "#7f8c3a", "#242720"];

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

async function downloadThirtyPlayPortfolioPdf(portfolio: ThirtyPlayPortfolio, winningDraw?: DrawResult) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const profileStyle: Record<PortfolioPlay["profile"], { label: string; color: [number, number, number] }> = {
    fuerte: { label: "Fuerte", color: [0, 132, 61] },
    equilibrada: { label: "Equilibrada", color: [33, 73, 154] },
    exploratoria: { label: "Exploratoria", color: [199, 119, 0] }
  };
  const columns = Array.from({ length: 3 }, (_, index) => portfolio.plays.slice(index * 10, index * 10 + 10));
  const margin = 10;
  const gap = 4;
  const columnWidth = (297 - margin * 2 - gap * 2) / 3;

  pdf.setFillColor(24, 38, 67);
  pdf.rect(0, 0, 297, 25, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("Loto Mas - Cartera de 30 jugadas", margin, 11);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Objetivo: ${formatLongDate(portfolio.targetDate)} | Algoritmo: ${portfolio.algorithmVersion ?? "v1"}`, margin, 18);
  if (winningDraw) pdf.text(`Sorteo evaluado: ${winningDraw.numbers.map((number) => String(number).padStart(2, "0")).join("-")} + ${String(winningDraw.plus).padStart(2, "0")}`, 287, 18, { align: "right" });

  columns.forEach((plays, columnIndex) => {
    const x = margin + columnIndex * (columnWidth + gap);
    pdf.setFillColor(244, 246, 249);
    pdf.roundedRect(x, 31, columnWidth, 169, 2, 2, "F");
    pdf.setTextColor(24, 38, 67);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`Columna ${columnIndex + 1}`, x + 4, 39);

    plays.forEach((play, rowIndex) => {
      const y = 45 + rowIndex * 15;
      const style = profileStyle[play.profile];
      pdf.setDrawColor(...style.color);
      pdf.setLineWidth(1.2);
      pdf.line(x + 2, y - 4, x + 2, y + 8);
      pdf.setFillColor(...style.color);
      pdf.roundedRect(x + 5, y - 4, 20, 5, 1, 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(style.label, x + 15, y - 0.5, { align: "center" });
      pdf.setTextColor(24, 38, 67);
      pdf.setFontSize(7.5);
      pdf.text(`#${rowIndex + 1}`, x + 28, y);
      pdf.setFontSize(9);
      const numbers = play.numbers.map((number) => String(number).padStart(2, "0")).join("  ");
      pdf.text(numbers, x + 37, y);
      pdf.setTextColor(205, 31, 43);
      pdf.text(`+ ${String(play.plus).padStart(2, "0")}`, x + columnWidth - 4, y, { align: "right" });
      pdf.setTextColor(102, 109, 122);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      const scope = play.scope === "mismo-dia" ? `Solo ${formatDay(portfolio.targetDay)}` : "Mie. + sab.";
      pdf.text(`${scope} | ${play.score} pts`, x + 28, y + 5);
    });
  });

  pdf.setTextColor(102, 109, 122);
  pdf.setFontSize(7);
  pdf.text("Analisis estadistico. Estas jugadas no predicen ni garantizan resultados.", margin, 207);
  pdf.save(`loto-mas-30-jugadas-${portfolio.targetDate}.pdf`);
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [day, setDay] = useState<DayFilter>("todos");
  const [data, setData] = useState<ApiState>(initialData);
  const [status, setStatus] = useState(`Datos listos: ${initialData.results.length} sorteos cargados.`);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSeconds, setUpdateSeconds] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [scatterYear, setScatterYear] = useState(initialData.results[0]?.date.slice(0, 4) ?? "todos");
  const [scatterDay, setScatterDay] = useState<DayFilter>("todos");
  const [scatterSeries, setScatterSeries] = useState(["P1", "P2", "P3", "P4", "P5", "P6", "Mas"]);
  const [rangeYear, setRangeYear] = useState(initialData.results[0]?.date.slice(0, 4) ?? "todos");
  const [rangeDay, setRangeDay] = useState<DayFilter>("todos");
  const [rangeSeries, setRangeSeries] = useState(["P1", "P2", "P3", "P4", "P5", "P6"]);
  const [portfolioTargetDate] = useState(() => getNextGameDate());
  const portfolioTargetDay = getDrawDay(portfolioTargetDate);
  const [thirtyPlayPortfolio, setThirtyPlayPortfolio] = useState<ThirtyPlayPortfolio | null>(null);
  const [previousPortfolio, setPreviousPortfolio] = useState<(ThirtyPlayPortfolio & { draw: DrawResult }) | null>(null);
  const [portfolioCalendar, setPortfolioCalendar] = useState<PortfolioCalendarEntry[]>([]);
  const [portfolioMessage, setPortfolioMessage] = useState("Cargando las jugadas guardadas.");
  const automaticUpdateStarted = useRef(false);
  const resultsRevision = useRef(initialData.results[0]?.date);

  useEffect(() => {
    const expectedDate = getLatestExpectedDrawDate();
    if (expectedDate && (!initialData.results[0]?.date || initialData.results[0].date < expectedDate)) {
      if (!automaticUpdateStarted.current) {
        automaticUpdateStarted.current = true;
        void checkUpdate();
      }
    }
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
  const activePageSize = defaultHistoryPageSize;
  const historyPageCount = Math.max(1, Math.ceil(filteredHistory.length / activePageSize));
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * activePageSize, historyPage * activePageSize);
  useEffect(() => {
    void loadPortfolioData();
  }, [portfolioTargetDate]);

  useEffect(() => {
    let mounted = true;
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy || publicationWindow("loto")) return;
      busy = true;
      try {
        // Read the scheduler's saved results; do not refetch external sources from every open tab.
        const response = await fetch("/api/results", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (mounted && Array.isArray(payload.results)) {
          setData({ results: payload.results });
          if (resultsRevision.current !== payload.results[0]?.date) {
            resultsRevision.current = payload.results[0]?.date;
            void loadPortfolioData();
          }
        }
      } catch { /* Keep the last valid local results visible. */ }
      finally { busy = false; }
    }, 60_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!isUpdating) return;
    const interval = window.setInterval(() => setUpdateSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isUpdating]);

  function changeDay(option: DayFilter) {
    setDay(option);
    setHistoryPage(1);
  }


  async function checkUpdate() {
    if (publicationWindow("loto")) return;
    setIsUpdating(true);
    setUpdateSeconds(0);
    setStatus("Revisando data disponible...");
    try {
      const response = await fetch("/api/update");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      if (Array.isArray(payload.results)) setData({ results: payload.results });
      await loadPortfolioData();
      setStatus(`${payload.message} Total: ${payload.total}. Ultimo sorteo: ${payload.latest?.date ?? "N/D"}.`);
    } catch {
      setStatus("No se pudo consultar la fuente remota. La data local permanece disponible.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function loadPortfolioData() {
    setPortfolioMessage("Cargando o creando la fotografía de este sorteo…");
    try {
      const response = await fetch(`/api/portfolio?drawDate=${portfolioTargetDate}`);
      if (!response.ok) throw new Error("No se pudo cargar el portafolio.");
      const payload = await response.json();
      setThirtyPlayPortfolio(payload.current ?? null);
      setPreviousPortfolio(payload.previous ?? null);
      setPortfolioCalendar(payload.calendar ?? []);
      setPortfolioMessage("");
    } catch {
      setPortfolioMessage("No se pudieron cargar las jugadas guardadas.");
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

  return (
    <main className="lotoTheme analysisDashboard">
<section className="hero">
        <div>
          <p className="eyebrow">LEIDSA · Miércoles y sábados</p>
          <h1>Loto Más</h1>
          <p className="subcopy">
            Compara frecuencias y posiciones, consulta tus jugadas y revisa sus resultados.
          </p>
        </div>
        <div className="heroPanel latestDrawPanel">
          <div className="lotoLatestHeading"><span className="panelLabel">Último sorteo cargado</span><LotoPrizeInfo /></div>
          {latest ? (
            <>
              <strong>{latest.date} · {formatDay(latest.day)}</strong>
              <DrawBalls numbers={latest.numbers} plus={latest.plus} />
            </>
          ) : (
            <strong>Sin datos</strong>
          )}
        </div>
      </section>
<DrawPublicationStatus product="loto" results={data.results} />
<AnalysisWorkspace panels={[
{ id: "analizar", label: "Analizar", description: "Filtra el historial, busca un número y compara frecuencias, posiciones y rangos.", content: <>
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
<NumberSearch results={data.results} />
<LotoTopFive stats={stats} />
<section className="card rangeMapSection lotoAnalysisMap">
        <header className="lotoMapHeading">
          <span>CONCENTRACIÓN POR POSICIÓN</span>
          <h2>Mapa de rangos</h2>
          <p>Compara dónde se concentra el historial de cada posición, en una escala de 01 a 40.</p>
        </header>
        <div className="scatterControls">
          <label htmlFor="rangeYear">Año</label>
          <select id="rangeYear" value={rangeYear} onChange={(event) => setRangeYear(event.target.value)}>
            <option value="todos">Todos</option>
            {availableYears.map((year) => (
              <option value={year} key={year}>{year}</option>
            ))}
          </select>
          <label htmlFor="rangeDay">Día</label>
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
<section className="card scatterSection lotoAnalysisMap">
        <header className="lotoMapHeading">
          <span>EVOLUCIÓN EN EL TIEMPO</span>
          <h2>Mapa de dispersión</h2>
          <p>Cada punto representa un número sorteado. Activa posiciones para compararlas y desplaza el gráfico para recorrer las fechas.</p>
        </header>
        <div className="scatterControls">
          <label htmlFor="scatterYear">Año</label>
          <select id="scatterYear" value={scatterYear} onChange={(event) => setScatterYear(event.target.value)}>
            <option value="todos">Todos</option>
            {availableYears.map((year) => (
              <option value={year} key={year}>{year}</option>
            ))}
          </select>
          <label htmlFor="scatterDay">Día</label>
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
</> },
{ id: "jugadas", label: "Jugadas", description: "Consulta la cartera objetivo y compárala con el sorteo anterior.", content: <>
<details
        className="topPositionsAccordion thirtyPortfolioAccordion"
        open
      >
        <summary>
          <span><span className="lotoSectionEyebrow">Cartera guardada</span>Generador de 30 Jugadas</span>
          <small>{formatDay(portfolioTargetDay)} · {formatShortDate(portfolioTargetDate)}<span className="lotoPortfolioProfiles">10 fuertes · 10 equilibradas · 10 exploratorias</span></small>
        </summary>
        {thirtyPlayPortfolio ? (
          <div className="portfolioSnapshots">
            <ThirtyPlayPortfolioView portfolio={thirtyPlayPortfolio} />
            {previousPortfolio ? (
              <details className="portfolioPreviousAccordion">
                <summary>
                  <span>Comparar con el sorteo anterior</span>
                  <small>{formatDay(previousPortfolio.targetDay)} {formatShortDate(previousPortfolio.targetDate)}</small>
                </summary>
                <ThirtyPlayPortfolioView portfolio={previousPortfolio} winningDraw={previousPortfolio.draw} historical />
              </details>
            ) : null}
          </div>
        ) : (
          <div className="thirtyPortfolioLoading">{portfolioMessage}</div>
        )}
      </details>
</> },
{ id: "resultados", label: "Resultados", description: "Revisa los premios de las carteras guardadas de 30 jugadas.", content: <>
<section className="card lotoPortfolioCalendar">
        <div className="lotoPortfolioCalendarHeader">
          <div>
            <span className="panelLabel">Miércoles y sábados</span>
            <h2>Ganancias de las 30 jugadas</h2>
          </div>
          <small>Solo evalúa carteras guardadas antes del sorteo.</small>
        </div>
        {portfolioCalendar.length ? (
          <div className="lotoPortfolioCalendarGrid">
            {portfolioCalendar.map((entry) => (
              <article key={entry.date}>
                <header><strong>{formatDay(entry.day)}</strong><span>{formatShortDate(entry.date)}</span></header>
                {entry.summary ? entry.summary.groups.length ? (
                  <>
                    <div className="lotoPortfolioPrizeGroups">
                      {entry.summary.groups.map((group) => (
                        <p key={`${group.matches}-${group.plusMatched}-${group.amount}`}>
                          <strong>{group.count} {group.count === 1 ? "jugada" : "jugadas"} · {group.label}</strong>
                          <span>{formatMoney(group.amount)} c/u</span>
                        </p>
                      ))}
                    </div>
                    <footer>Total ganado <strong>{formatMoney(entry.summary.total)}</strong></footer>
                  </>
                ) : <p className="lotoPortfolioCalendarStatus">Sin premios</p> : (
                  <p className="lotoPortfolioCalendarStatus">{entry.status === "missing" ? "Sin cartera guardada" : "Pendiente"}</p>
                )}
              </article>
            ))}
          </div>
        ) : <p className="muted">{portfolioMessage}</p>}
      </section>

</> },
{ id: "historial", label: "Historial", description: "Consulta los sorteos cargados. El filtro de día elegido en Analizar también se aplica aquí.", content: <>
<section className="card historyCard">
        <header className="historyCardHeader">
          <div>
            <span className="lotoSectionEyebrow">Archivo de sorteos</span>
            <h2>Historial cargado</h2>
            <p>{filteredHistory.length} sorteos · {day === "todos" ? "Todos los días" : formatDay(day)} · {paginatedHistory.length} en esta página</p>
          </div>
          <span className="historyControls">5 resultados por página</span>
        </header>
        <div className="history historyList">
          {paginatedHistory.map((result) => (
            <div className="historyRow" key={result.date}>
              <div className="historyDate">
                <strong>{formatShortDate(result.date)}</strong>
                <span>{formatDay(result.day)}</span>
              </div>
              <div className="lotoHistoryNumbers"><span>Principales <b>+ Más</b></span><DrawBalls numbers={result.numbers} plus={result.plus} winningNumbers={latest?.numbers} winningPlus={latest?.plus} /></div>
            </div>
          ))}
        </div>
        <nav className="pagination" aria-label="Paginacion del historial">
          <button
            className="secondaryButton"
            disabled={historyPage === 1}
            onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
          >
            Anterior
          </button>
          <span>Página {historyPage} de {historyPageCount}</span>
          <button
            className="secondaryButton"
            disabled={historyPage === historyPageCount}
            onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}
          >
            Siguiente
          </button>
        </nav>
      </section>
</> }
]} />
</main>
  );
}



function ThirtyPlayPortfolioView({
  portfolio,
  winningDraw,
  historical = false
}: {
  portfolio: ThirtyPlayPortfolio;
  winningDraw?: DrawResult;
  historical?: boolean;
}) {
  const profiles: Array<{
    id: PortfolioPlay["profile"];
    title: string;
    description: string;
  }> = [
    { id: "fuerte", title: "Inclinación fuerte", description: "Mayor respaldo del día objetivo y de sus patrones recientes." },
    { id: "equilibrada", title: "Equilibradas", description: "Balance entre afinidad, frecuencia, retraso y diversidad." },
    { id: "exploratoria", title: "Exploratorias", description: "Más diversidad sin salir de los controles históricos." }
  ];
  const awardedPlays = winningDraw ? portfolio.plays.flatMap((play) => {
    const matches = play.numbers.filter((number) => winningDraw.numbers.includes(number)).length;
    const plusMatched = winningDraw.plus === play.plus;
    const prize = getVirtualPrize(matches, plusMatched);
    if (!prize.amount) return [];
    const profile = profiles.find((item) => item.id === play.profile);
    const row = portfolio.plays.filter((item) => item.profile === play.profile).findIndex((item) => item === play) + 1;
    return [{ play, matches, plusMatched, prize, profileTitle: profile?.title ?? play.profile, row }];
  }) : [];
  const awardedTotal = awardedPlays.reduce((sum, item) => sum + item.prize.amount, 0);
  const profileLabels: Record<PortfolioPlay["profile"], string> = {
    fuerte: "Fuerte",
    equilibrada: "Equilibrada",
    exploratoria: "Exploratoria"
  };
  const columns = Array.from({ length: 3 }, (_, index) => {
    const plays = portfolio.plays.slice(index * 10, index * 10 + 10);
    const counts = profiles.flatMap((profile) => {
      const count = plays.filter((play) => play.profile === profile.id).length;
      return count ? [`${count} ${profileLabels[profile.id].toLowerCase()}${count === 1 ? "" : "s"}`] : [];
    });
    return { index, plays, description: counts.join(" · ") };
  });

  return (
    <section className="thirtyPortfolioBody">
      <header className={`portfolioTarget ${winningDraw ? "portfolioTargetEvaluated" : ""}`}>
        <div>
          <span className="panelLabel">{historical ? "Sorteo evaluado" : "Sorteo objetivo"}</span>
          <h2>{formatLongDate(portfolio.targetDate)}</h2>
          {portfolio.plusTopFive?.length ? <div className="portfolioPlusTop"><span>Top 5 Más · 6 jugadas cada uno</span><div>{portfolio.plusTopFive.map((number) => <Ball key={number} value={number} plus />)}</div></div> : null}
        </div>
        <div className="portfolioTargetActions">
        {winningDraw ? <div className="portfolioPrizeSummary">
          <strong>{awardedPlays.length ? `${awardedPlays.length} jugadas con premio · ${formatMoney(awardedTotal)}` : "Ninguna jugada obtuvo premio"}</strong>
          {awardedPlays.length ? <div className="portfolioPrizeRows">{awardedPlays.map((item) => <span key={`${item.play.profile}-${item.play.id}`}>
            <b>{item.profileTitle} · renglón #{item.row}</b>
            <small>{item.prize.label} · {formatMoney(item.prize.amount)}</small>
          </span>)}</div> : <small>La corona indica coincidencias, aunque no todas alcanzan un renglón premiado.</small>}
        </div> : <p>En cada columna: jugadas identificadas por perfil y alcance estadístico.</p>}
          <button className="secondaryButton portfolioPdfButton" onClick={() => downloadThirtyPlayPortfolioPdf(portfolio, winningDraw)}>
            <span aria-hidden="true">↓</span> Descargar PDF
          </button>
        </div>
      </header>

      <div className="portfolioColumns">
        {columns.map((column) => (
            <article className={`portfolioColumn portfolioBatchColumn batch${column.index + 1}`} key={column.index}>
              <header>
                <div>
                  <h3>Columna {column.index + 1}</h3>
                  <p>{column.description}</p>
                </div>
                <strong>{column.plays.length}</strong>
              </header>
              <div className="portfolioPlayList">
                {column.plays.map((play, index) => (
                  <div className={`portfolioPlayRow portfolioPlayProfile ${play.profile}`} key={`${play.profile}-${play.id}`}>
                    <div className="portfolioPlayMeta">
                      <b>#{index + 1}</b>
                      <span className={`portfolioProfileTag ${play.profile}`}>{profileLabels[play.profile]}</span>
                      <span className={`portfolioScope ${play.scope}`}>
                        {play.scope === "mismo-dia" ? `Solo ${formatDay(portfolio.targetDay)}` : "Mié. + sáb."}
                      </span>
                      <span>{play.score} pts</span>
                    </div>
                    <div className="portfolioNumbers" aria-label={`Jugada ${index + 1}: ${play.numbers.join(", ")} más ${play.plus}`}>
                      {play.numbers.map((number, position) => (
                        <span className={`portfolioBall ${winningDraw?.numbers.includes(number) ? "portfolioBallWinner" : ""}`} key={`${position}-${number}`}>{String(number).padStart(2, "0")}</span>
                      ))}
                      <i>+</i>
                      <span className={`portfolioBall portfolioPlus ${winningDraw?.plus === play.plus ? "portfolioBallWinner" : ""}`}>{String(play.plus).padStart(2, "0")}</span>
                    </div>
                    <small>{winningDraw ? `${play.numbers.filter((number) => winningDraw.numbers.includes(number)).length} números acertados${winningDraw.plus === play.plus ? " · Más acertado" : ""}` : play.explanation}</small>
                  </div>
                ))}
              </div>
            </article>
        ))}
      </div>

      <p className="recommendationDisclaimer portfolioDisclaimer">
        Estas combinaciones son reproducibles para este sorteo y se basan en patrones históricos; no predicen ni garantizan resultados.
      </p>
    </section>
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
          <i className="lotoSeriesDot" style={{ background: option === "Mas" ? "#ce5263" : positionColors[Number(option.slice(1)) - 1] }} aria-hidden="true" />
          {option === "Mas" ? "Más" : option}
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
      <div className="scatterChartArea">
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
        <svg className="scatterFixedAxis" width={padding.left} height={height} viewBox={`0 0 ${padding.left} ${height}`} aria-hidden="true">
          <rect className="scatterFixedAxisBg" width={padding.left} height={height} />
          {yTicks.map((tick) => (
            <text className="chartTick" x={padding.left - 12} y={yFor(tick) + 4} textAnchor="end" key={tick}>{tick}</text>
          ))}
          <line className="chartAxis" x1={padding.left - 1} x2={padding.left - 1} y1={padding.top} y2={height - padding.bottom} />
          <text className="chartAxisLabel" x="18" y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 18 ${padding.top + plotHeight / 2})`}>
            Numero sorteado
          </text>
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
          <h3>Intervalo de concentración histórica</h3>
        </div>
        <p>
          Intervalo más corto que reúne al menos el 80% de las salidas. Con menos de 10 sorteos se muestra el rango completo. No es una predicción.
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
                <span>Media {row.average.toFixed(1)} · {row.omitted} de {row.samples} fuera</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
