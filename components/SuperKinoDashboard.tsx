"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "./Ball";
import {
  evaluateKinoSnapshot, formatKinoPortfolioText, getKinoStaleNumbers, kinoGroups, kinoStats, kinoPrizes, kinoProfiles, kinoProfileLabels, summarizeKinoPrizes,
  KINO_OFFICIAL, KINO_ANALYSIS_START, type KinoDraw, type KinoSnapshot
} from "../lib/super-kino";
import { kinoNoDraws, isKinoNoDraw, kinoClock, kinoExpectedDate, kinoTargetDate, kinoYearStart, kinoDates, shiftKinoDate } from "../lib/super-kino-clock";

const money = (n: number) => `RD$${n.toLocaleString("en-US")}`;
const weekDayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const shortDate = (date: string) => new Intl.DateTimeFormat("es-DO", {day: "2-digit", month: "short", timeZone: "UTC"}).format(new Date(`${date}T12:00:00Z`));
function mondayOf(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return shiftKinoDate(date, day === 0 ? -6 : 1 - day);
}
const profileDescriptions = {
  fuerte: "7 calientes · 2 intermedios · 1 frío",
  equilibrada: "4 calientes · 4 intermedios · 2 fríos",
  exploratoria: "3 calientes · 3 intermedios · 4 fríos"
};
function Balls({numbers, matches = []}: {numbers: number[]; matches?: number[]}) {
  return <div className="kinoBalls">{numbers.map(n => <Ball key={n} value={n} winner={matches.includes(n)} />)}</div>;
}
type PortfolioData = {current: KinoSnapshot | null; snapshots: KinoSnapshot[]; waitingForResult?: boolean};

export function SuperKinoDashboard({initialResults}: {initialResults: KinoDraw[]}) {
  const [results, setResults] = useState(initialResults);
  const [windowSize, setWindowSize] = useState(30);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Historial local disponible.");
  const [clock, setClock] = useState(() => kinoClock());
  const [expectedDate, setExpectedDate] = useState(() => kinoExpectedDate());
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [portfolioError, setPortfolioError] = useState("");
  const [awardDate, setAwardDate] = useState("");
  const [showAwardPlays, setShowAwardPlays] = useState(false);
  const resultsRef = useRef(results);
  const portfolioRef = useRef<PortfolioData | null>(null);
  const mounted = useRef(false);
  const updating = useRef(false);
  const loadingPortfolio = useRef(false);

  const loadPortfolio = useCallback(async () => {
    if (loadingPortfolio.current) return;
    loadingPortfolio.current = true;
    try {
      const response = await fetch("/api/super-kino/portfolio", {cache: "no-store"});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      if (mounted.current) { setPortfolio(payload); portfolioRef.current = payload; setPortfolioError(""); }
    } catch {
      if (mounted.current) setPortfolioError("No se pudieron cargar o guardar las jugadas. Reintenta para usar las combinaciones definitivas.");
    } finally { loadingPortfolio.current = false; }
  }, []);

  const update = useCallback(async () => {
    if (updating.current) return;
    updating.current = true;
    if (mounted.current) { setBusy(true); setStatus("Consultando resultados publicados…"); }
    try {
      const response = await fetch("/api/super-kino/update", {cache: "no-store"});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      if (!mounted.current) return;
      resultsRef.current = payload.results;
      setResults(payload.results);
      setStatus(payload.message);
      setExpectedDate(payload.expectedDate);
      await loadPortfolio();
    } catch {
      if (mounted.current) setStatus("La fuente está tardando. Si falta el sorteo esperado, reintentaremos en 60 segundos. El historial local sigue disponible.");
    } finally {
      updating.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [loadPortfolio]);

  useEffect(() => {
    mounted.current = true;
    void loadPortfolio();
    void update();
    const timer = window.setInterval(() => {
      const expected = kinoExpectedDate();
      setClock(kinoClock());
      setExpectedDate(expected);
      if (!resultsRef.current.some(d => d.date === expected)) void update();
      if (portfolioRef.current?.current?.targetDate !== kinoTargetDate()) void loadPortfolio();
    }, 60_000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, [loadPortfolio, update]);

  const yearStart = kinoYearStart(clock.date);
  const history = useMemo(() => results.filter(d => d.date >= yearStart && d.date <= clock.date), [results, yearStart, clock.date]);
  const missingCount = useMemo(() => {
    const known = new Set(history.map(d => d.date));
    return kinoDates(yearStart, expectedDate).filter(d => !known.has(d) && !isKinoNoDraw(d)).length;
  }, [history, yearStart, expectedDate]);
  const eligible = useMemo(() => history.filter(d => d.date >= KINO_ANALYSIS_START), [history]);
  const sample = useMemo(() => eligible.slice(0, windowSize), [eligible, windowSize]);
  const groups = useMemo(() => kinoGroups(sample), [sample]);
  const stats = useMemo(() => kinoStats(sample), [sample]);
  const latest = results[0];
  const pages = Math.max(1, Math.ceil(history.length / 10));
  const activePage = Math.min(page, pages);
  const waiting = !results.some(d => d.date === expectedDate);
  const current = portfolio?.current;
  const currentStaleNumbers = current ? (current.excludedByDelay ?? getKinoStaleNumbers(results, current.targetDate)) : [];
  const awardDates = [...new Set([expectedDate, ...(portfolio?.snapshots.filter(s => s.targetDate <= expectedDate).map(s => s.targetDate) ?? [])])].sort().reverse();
  const selectedAwardDate = awardDates.includes(awardDate) ? awardDate : awardDates[0];
  const savedAward = portfolio?.snapshots.find(s => s.targetDate === selectedAwardDate);
  const awardDraw = results.find(d => d.date === selectedAwardDate);
  const recordedAwardDraw = awardDraw && savedAward?.prizeDrawNumbers ? {...awardDraw, numbers: savedAward.prizeDrawNumbers} : awardDraw;
  const awards = savedAward && recordedAwardDraw ? evaluateKinoSnapshot(savedAward, recordedAwardDraw) : null;
  const awardProfiles = savedAward ? kinoProfiles.filter(profile => savedAward.plays.some(play => play.profile === profile)) : kinoProfiles;
  const currentColumns = current ? (current.algorithm === "kino-v4" || current.algorithm === "kino-v5"
    ? [0, 10, 20].map((start, index) => ({key: `exploratoria-${index}`, className: "exploratoria", title: `Exploratorias ${start + 1}–${start + 10}`, description: profileDescriptions.exploratoria, plays: current.plays.slice(start, start + 10)}))
    : kinoProfiles.map(profile => ({key: profile, className: profile, title: `10 ${kinoProfileLabels[profile]}`, description: profileDescriptions[profile], plays: current.plays.filter(play => play.profile === profile)}))) : [];
  const awardColumns = awards?.flatMap(evaluation => Array.from({length: Math.ceil(evaluation.plays.length / 10)}, (_, index) => ({...evaluation, key: `${evaluation.profile}-${index}`, plays: evaluation.plays.slice(index * 10, index * 10 + 10)}))) ?? [];
  const weeklyPrizes = useMemo(() => {
    const monday = mondayOf(clock.date);
    return weekDayNames.map((day, index) => {
      const date = shiftKinoDate(monday, index);
      const snapshot = portfolio?.snapshots.find(item => item.targetDate === date);
      const draw = results.find(item => item.date === date);
      return {day, date, summary: snapshot?.prizeSummary ?? (snapshot && draw ? summarizeKinoPrizes(snapshot, draw) : null), status: !snapshot && date < clock.date ? "missing" as const : "pending" as const};
    });
  }, [clock.date, portfolio?.snapshots, results]);

  function download() {
    if (!current) return;
    const text = formatKinoPortfolioText(current);
    const url = URL.createObjectURL(new Blob([`\ufeff${text}`], {type: "text/plain;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = `super-kino-120-jugadas-${current.targetDate}.txt`; a.click(); URL.revokeObjectURL(url);
  }

  const totalPlayCount = current?.plays.length ?? 120;
  const reinforcedCount = current?.plays.filter(play => play.quickHot).length ?? 30;

  return <main className="lotoTheme kinoTheme">
    <section className="hero">
      <div><p className="eyebrow">LEIDSA · Sorteo diario</p><h1>Super Kino TV</h1><p>84 números · 20 extraídos · 10 por jugada</p><p>120 jugadas exploratorias por sorteo.</p></div>
      <div className="heroPanel kinoLatest"><span className="panelLabel">Último sorteo cargado · {latest?.date ?? "Sin datos"}</span>{latest ? <Balls numbers={latest.numbers} /> : <p>No hay resultados disponibles.</p>}</div>
    </section>
    <section className="toolbar"><button disabled={busy} onClick={() => void update()}>{busy ? "Actualizando…" : "Actualizar historial"}</button><span className="status" role="status">{status}</span></section>
    <p className={`kinoPolling ${waiting ? "waiting" : ""}`}>{waiting ? `Esperando resultado del ${expectedDate} · revisión automática cada 60 segundos.` : `Resultado del ${expectedDate} cargado.`} Consulta desde las 9:00 p. m.; domingos, 4:00 p. m. (hora dominicana), mientras esta sección esté abierta.</p>
    <section className="metricsGrid">
      <article className="metric"><span>Último año · sorteos cargados</span><strong>{history.length}</strong></article>
      <article className="metric"><span>Sorteos analizados</span><strong>{sample.length}</strong></article>
      <article className="metric"><span>10 jugadas por columna</span><strong>RD$250</strong></article>
      <article className="metric"><span>{totalPlayCount} jugadas en total</span><strong>{money(totalPlayCount * 25)}</strong></article>
    </section>

    <section className="card kinoAwards">
      <div className="kinoSectionHead"><div><p className="eyebrow">Evaluación de jugadas guardadas</p><h2>Premios obtenidos</h2></div><label>Sorteo evaluado <select value={selectedAwardDate} onChange={e => setAwardDate(e.target.value)}>{awardDates.map(date => <option key={date} value={date}>{date}</option>)}</select></label></div>
      {!portfolio ? <p>{portfolioError || "Cargando jugadas guardadas…"}</p> : !savedAward ? <p>No hay jugadas guardadas antes del sorteo del {selectedAwardDate}. La evaluación comenzará con el primer sorteo que tenga su cartera guardada; no se reconstruyen premios retrospectivos.</p> : !awardDraw ? <p>Las {savedAward.plays.length} jugadas del {selectedAwardDate} están guardadas. Esperando el resultado para calcular sus premios.</p> : <p>Resultado del {selectedAwardDate} comparado con las {savedAward.plays.length} jugadas guardadas antes del cierre.</p>}
      <div className="kinoAwardsGrid">{awardProfiles.map(profile => {
        const evaluation = awards?.find(a => a.profile === profile);
        const playCount = savedAward?.plays.filter(play => play.profile === profile).length ?? 10;
        return <article className={`kinoAward ${profile}`} key={profile}><span>{playCount} {kinoProfileLabels[profile]}</span><strong>{evaluation ? money(evaluation.total) : "—"}</strong><small>{evaluation ? `${evaluation.winners} premiadas · costo ${money(evaluation.cost)} · balance ${money(evaluation.net)}` : savedAward ? "Pendiente de resultado" : "Sin evaluación"}</small></article>;
      })}</div>
      {awards ? <><p>Total premiado: <strong>{money(awards.reduce((sum,a) => sum+a.total,0))}</strong> · Costo total: {money(awards.reduce((sum,a) => sum+a.cost,0))} · Balance: <strong>{money(awards.reduce((sum,a) => sum+a.net,0))}</strong></p><button onClick={() => setShowAwardPlays(v => !v)}>{showAwardPlays ? "Ocultar detalle" : "Ver aciertos y premios por jugada"}</button>{showAwardPlays ? <div className="kinoPortfolioScroll"><div className="kinoPortfolioGrid">{awardColumns.map(a => <article key={a.key} className={`kinoPlayColumn ${a.profile}`}><h3>{kinoProfileLabels[a.profile]}</h3>{a.plays.map(p => <div className="kinoPlayRow" key={p.id}><small>#{String(p.id).padStart(2,"0")} · {p.hits} aciertos · {money(p.prize)}</small><Balls numbers={p.numbers} matches={p.matches} /></div>)}</article>)}</div></div> : null}</> : null}
    </section>

    <section className="card kinoWeekAwards">
      <div className="kinoSectionHead"><div><p className="eyebrow">Lunes a domingo</p><h2>Premios de las jugadas guardadas</h2></div><small>{shortDate(weeklyPrizes[0].date)} – {shortDate(weeklyPrizes[6].date)}</small></div>
      <div className="kinoWeekScroll" tabIndex={0} aria-label="Calendario semanal de premios; desplaza horizontalmente en pantallas pequeñas"><div className="kinoWeekGrid">{weeklyPrizes.map(item => <article className={item.date === clock.date ? "today" : ""} key={item.date}><header><strong>{item.day}</strong><span>{shortDate(item.date)}</span></header>{item.summary ? item.summary.groups.length ? <><div className="kinoWeekPrizeGroups">{item.summary.groups.map(group => <p key={group.amount}><strong>{group.count} {group.count === 1 ? "jugada" : "jugadas"}</strong><span>Premio {money(group.amount)} c/u</span></p>)}</div><footer>Total ganado <strong>{money(item.summary.total)}</strong></footer></> : <p className="kinoWeekStatus">Sin premios</p> : <p className="kinoWeekStatus">{item.status === "missing" ? "Sin registro" : "Pendiente"}</p>}</article>)}</div></div>
      <p className="muted">El resumen cuenta las jugadas premiadas por monto. No muestra los números sorteados ni las combinaciones.</p>
    </section>

    <section className="card">
      <div className="kinoSectionHead"><div><h2>Muestra de 30 de las 120 jugadas para el {current?.targetDate ?? "próximo sorteo"}</h2><p>Tres columnas de 10 · cada jugada combina 3 calientes, 3 intermedios y 4 fríos</p></div><button disabled={!current} onClick={download}>Descargar las 120 en TXT</button></div>
      {portfolioError ? <p role="alert">{portfolioError} <button onClick={() => void loadPortfolio()}>Reintentar jugadas</button></p> : null}
      {current ? <><p className="kinoSaved">Guardadas antes del sorteo · Base: {current.analysisFrom} a {current.analysisTo} ({current.sampleSize} sorteos). {reinforcedCount} jugadas están reforzadas con calientes cuyo promedio de los tres intervalos recientes es de 1 a 2 sorteos. Estas jugadas no cambian con los filtros ni al recibir el resultado.</p>{current.quickHotNumbers?.length ? <div className="kinoDelayFilter"><strong>Calientes rápidos usados en el refuerzo</strong><span>Promedio reciente entre paréntesis:</span><div>{current.quickHotNumbers.map(item => <span key={item.number} title={`Intervalos recientes: ${item.recentIntervals.join(", ")} sorteos`}>{String(item.number).padStart(2,"0")} · {item.averageInterval.toFixed(2)}</span>)}</div></div> : null}<div className="kinoDelayFilter"><strong>Filtro de atraso de un mes</strong>{currentStaleNumbers.length ? <><span>{currentStaleNumbers.length} excluidos de las {current.plays.length} jugadas:</span><div>{currentStaleNumbers.map(item => <span key={item.number} title={item.lastDate ? `Última salida: ${item.lastDate}` : "Sin salida registrada"}>{String(item.number).padStart(2,"0")}</span>)}</div></> : <span>Ningún número superaba un mes sin salir para este sorteo.</span>}</div><div className="kinoPortfolioScroll" tabIndex={0} aria-label="Muestra de tres columnas de diez jugadas; desplaza horizontalmente en pantallas pequeñas"><div className="kinoPortfolioGrid">{currentColumns.map(column => <article className={`kinoPlayColumn ${column.className}`} key={column.key}><header><h3>{column.title}</h3><small>{column.description}</small></header>{column.plays.map(p => <div className="kinoPlayRow" key={p.id}><span className="kinoPlayNumber" title={p.quickHot ? "Reforzada con calientes rápidos" : undefined}>{p.quickHot ? "⚡" : ""}{String(p.id).padStart(3,"0")}</span><Balls numbers={p.numbers} /></div>)}<footer>10 jugadas × RD$25 = RD$250</footer></article>)}</div></div></> : <p>{portfolioError ? "Las jugadas aparecerán cuando se confirme su guardado." : portfolio?.waitingForResult ? "Esperando el resultado pendiente antes de preparar las próximas 120 jugadas." : "Cargando y guardando las 120 jugadas…"}</p>}
      <p className="muted">Las 120 jugadas usan la composición exploratoria 3/3/4. La página muestra una muestra de 30; el TXT contiene la cartera completa. Cada sorteo es independiente; esta distribución no garantiza ni aumenta la probabilidad de una jugada individual.</p>
    </section>

    <section className="card kinoNote"><div className="kinoSectionHead"><h2>Análisis de números</h2><label>Analizar últimos <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))}><option value={10}>10 sorteos</option><option value={30}>30 sorteos</option><option value={90}>90 sorteos</option><option value={100000}>Todos desde el corte</option></select></label></div><p>{sample.length ? `${sample.at(-1)?.date} a ${sample[0]?.date} · ${sample.length} sorteos disponibles.` : "Sin sorteos para analizar."}</p><details><summary>Cómo se calcula</summary><p>Calientes, intermedios y fríos se calculan entre los números elegibles. Antes de generar las 120 jugadas se excluye todo número cuya última salida sea anterior a un mes calendario antes del sorteo objetivo. Los números restantes se vuelven a ordenar por frecuencia y se dividen en tres grupos equilibrados. Cada jugada exploratoria toma 3 calientes, 3 intermedios y 4 fríos. Las primeras 30 se refuerzan usando, en sus tres posiciones calientes, números del grupo caliente cuyo promedio de los tres intervalos de aparición más recientes esté entre 1 y 2 sorteos. Los empates se ordenan por número; la ausencia cuenta sorteos desde la última aparición.</p><p>El historial cubre un año. El análisis para el formato de 84 números conserva el corte prudente del 15/09/2026, primera aparición observada de números mayores de 80 en el archivo inicial; no confirma la fecha oficial del cambio. Las jugadas guardadas usan los últimos 30 sorteos disponibles desde ese corte, anteriores al sorteo objetivo.</p></details></section>
    {sample.length ? <section className="kinoColumns">{[
      {title: "Números calientes", rows: groups.hot.slice(0,10), kind: "hot"},
      {title: "Números fríos", rows: groups.cold.slice(0,10), kind: "cold"},
      {title: "Mayor ausencia", rows: [...stats].sort((a,b) => b.gap-a.gap || a.number-b.number).slice(0,10), kind: "gap"}
    ].map(group => <article className={`card kinoRank ${group.kind}`} key={group.title}><h2>{group.title}</h2>{group.rows.map(r => <div className="kinoRankRow" key={r.number}><Ball value={r.number} /><div><strong>{r.count} salidas · {r.percent.toFixed(1)}%</strong><small>{r.lastDate ? `Última: ${r.lastDate} · ${r.gap} sin salir` : `Sin aparición en ${sample.length} sorteos`}</small></div></div>)}</article>)}</section> : null}

    <section className="kinoColumns kinoBottom"><section className="card"><h2>Tabla de premios</h2><p>Por una jugada de RD$25 · Verificada el 06/10/2026.</p><table><thead><tr><th>Aciertos</th><th>Premio</th></tr></thead><tbody>{kinoPrizes.map(p => <tr key={p.hits}><td>{p.hits} de 10</td><td>{money(p.amount)}</td></tr>)}<tr><td>1–4</td><td>Sin premio</td></tr></tbody></table><p><a href={KINO_OFFICIAL} target="_blank" rel="noreferrer">Reglas y tabla oficial de LEIDSA</a></p></section><section className="card"><h2>Frecuencia de los 84 números</h2><p>Número · apariciones en {sample.length} sorteos</p><div className="kinoNumberGrid">{stats.map(s => <div key={s.number} title={`${s.percent.toFixed(1)}% · ${s.lastDate ?? "Sin aparición"}`}><strong>{String(s.number).padStart(2,"0")}</strong><span>{s.count}</span></div>)}</div></section></section>
    <section className="card"><h2>Historial · último año</h2><p>{yearStart} a {clock.date} · {history.length} sorteos cargados.{missingCount ? ` Faltan ${missingCount} fechas por recuperar.` : " Todas las fechas esperadas están cargadas."}</p><p>Fuentes: Lotería Hoy RD, EnLoteria y Diario Libre. Cada fecha enlaza al archivo consultado.</p><details><summary>Días sin sorteo documentados</summary><div className="kinoNoDraws">{kinoNoDraws.filter(d => d.date >= yearStart && d.date <= clock.date).map(d => <a key={d.date} href={d.source} target="_blank" rel="noreferrer">{d.date} · Sin sorteo</a>)}</div></details><div className="kinoHistory">{history.slice((activePage-1)*10,activePage*10).map(d => <article key={d.date}><a href={d.source} target="_blank" rel="noreferrer">{d.date}</a><Balls numbers={[...d.numbers].sort((a,b) => a-b)} />{d.date < KINO_ANALYSIS_START ? <small>Historial anterior al corte de análisis de 84 números</small> : null}</article>)}</div><div className="toolbar"><button disabled={activePage===1} onClick={() => setPage(activePage-1)}>Anterior</button><span>Página {activePage} de {pages}</span><button disabled={activePage===pages} onClick={() => setPage(activePage+1)}>Siguiente</button><button disabled={activePage===pages} onClick={() => setPage(pages)}>Hace un año</button></div></section>
  </main>;
}
