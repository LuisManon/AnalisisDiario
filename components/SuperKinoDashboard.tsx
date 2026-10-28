"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "./Ball";
import {
  buildKinoPostgame, evaluateKinoSnapshot, formatKinoPortfolioText, getKinoStaleNumbers, kinoAlgorithmForDate, kinoGroups, kinoStats, kinoPrizes, kinoProfiles, kinoProfileLabels, summarizeKinoPrizes,
  KINO_OFFICIAL, KINO_ANALYSIS_START, type KinoDraw, type KinoSnapshot
} from "../lib/super-kino";
import { kinoNoDraws, isKinoNoDraw, kinoClock, kinoExpectedDate, kinoTargetDate, kinoDates, shiftKinoDate } from "../lib/super-kino-clock";

const money = (n: number) => `RD$${n.toLocaleString("en-US")}`;
const weekDayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const shortDate = (date: string) => new Intl.DateTimeFormat("es-DO", {day: "2-digit", month: "short", timeZone: "UTC"}).format(new Date(`${date}T12:00:00Z`));
const historyDate = (date: string) => new Intl.DateTimeFormat("es-DO", {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"}).format(new Date(`${date}T12:00:00Z`));
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
  const [portfolioPage, setPortfolioPage] = useState(0);
  const [previewMode, setPreviewMode] = useState<"before"|"after">("before");
  const [portfolioError, setPortfolioError] = useState("");
  const [awardDate, setAwardDate] = useState("");
  const [showAwardPlays, setShowAwardPlays] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
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
    if (!resultsRef.current.some(d => d.date === kinoExpectedDate())) void update();
    const timer = window.setInterval(() => {
      const expected = kinoExpectedDate();
      setClock(kinoClock());
      setExpectedDate(expected);
      if (!resultsRef.current.some(d => d.date === expected)) void update();
      if (portfolioRef.current?.current?.targetDate !== kinoTargetDate()) void loadPortfolio();
    }, 60_000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, [loadPortfolio, update]);

  const history = useMemo(() => results.filter(d => d.date >= KINO_ANALYSIS_START && d.date <= clock.date), [results, clock.date]);
  const missingCount = useMemo(() => {
    const known = new Set(history.map(d => d.date));
    return kinoDates(KINO_ANALYSIS_START, expectedDate).filter(d => !known.has(d) && !isKinoNoDraw(d)).length;
  }, [history, expectedDate]);
  const sample = useMemo(() => history.slice(0, windowSize), [history, windowSize]);
  const groups = useMemo(() => kinoGroups(sample), [sample]);
  const stats = useMemo(() => kinoStats(sample), [sample]);
  const fullHistoryStats = useMemo(() => kinoStats(history), [history]);
  const latest = results[0];
  const pages = Math.max(1, Math.ceil(history.length / 10));
  const activePage = Math.min(page, pages);
  const waiting = !results.some(d => d.date === expectedDate);
  const current = portfolio?.current;
  const previewSnapshot = current;
  const postgameSnapshot = portfolio?.snapshots.filter(snapshot=>results.some(draw=>draw.date===snapshot.targetDate)).sort((a,b)=>b.targetDate.localeCompare(a.targetDate))[0];
  const postgameDraw = postgameSnapshot ? results.find(draw=>draw.date===postgameSnapshot.targetDate) : undefined;
  const postgame = useMemo(()=>postgameSnapshot&&postgameDraw?buildKinoPostgame(postgameSnapshot,postgameDraw):null,[postgameDraw,postgameSnapshot]);
  const tomorrow=shiftKinoDate(clock.date,1);
  const yesterday=shiftKinoDate(clock.date,-1);
  const previewWhen=previewSnapshot?.targetDate===clock.date?"hoy":previewSnapshot?.targetDate===tomorrow?"mañana":previewSnapshot?.targetDate;
  const postgameWhen=postgameSnapshot?.targetDate===clock.date?"esta noche":postgameSnapshot?.targetDate===yesterday?"anoche":postgameSnapshot?.targetDate;
  const pendingDraw=current&&!results.some(draw=>draw.date===current.targetDate);
  const portfolioPageCount = Math.max(1, Math.ceil((current?.plays.length ?? 0) / 30));
  const activePortfolioPage = Math.min(portfolioPage, portfolioPageCount - 1);
  const currentAlgorithmLabel = (current?.algorithm ?? kinoAlgorithmForDate(kinoTargetDate())).replace("kino-", "").toUpperCase();
  const currentIsV9 = current?.algorithm === "kino-v9" || current?.algorithm === "kino-v9.1" || current?.algorithm === "kino-v9.3" || current?.algorithm === "kino-v9.4" || current?.algorithm === "kino-v10";
  const currentIsHybrid = current?.algorithm === "kino-v9.3" || current?.algorithm === "kino-v9.4" || current?.algorithm === "kino-v10";
  const currentComposition = currentIsHybrid ? `la mezcla híbrida ${current?.algorithm.replace("kino-", "").toUpperCase()}` : currentIsV9 ? "5 calientes, 3 intermedios y 2 fríos" : "3 calientes, 3 intermedios y 4 fríos";
  const currentStaleNumbers = current ? (current.excludedByDelay ?? getKinoStaleNumbers(results, current.targetDate)) : [];
  const currentRecoveryNumbers = current?.algorithm === "kino-v9.4" || current?.algorithm === "kino-v10" ? current.recoveryNumbers ?? [] : [];
  const currentDominantRanges = current?.algorithm === "kino-v9.4" || current?.algorithm === "kino-v10" ? current.rangeModel?.filter(range=>range.dominant).sort((a,b)=>b.score-a.score) ?? [] : [];
  const rangeBands = [[1,9],[10,19],[20,29],[30,39],[40,49],[50,59],[60,69],[70,79],[80,84]] as const;
  const rangeSample = current ? results.filter(draw=>draw.date<current.targetDate).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10) : [];
  const currentRangeCoverage = current ? rangeBands.map(([from,to])=>({from,to,perPlay:current.plays.reduce((sum,play)=>sum+play.numbers.filter(number=>number>=from&&number<=to).length,0)/current.plays.length,perDraw:rangeSample.length?rangeSample.reduce((sum,draw)=>sum+draw.numbers.filter(number=>number>=from&&number<=to).length,0)/rangeSample.length:0})) : [];
  const awardDates = [...new Set([expectedDate, ...(portfolio?.snapshots.filter(s => s.targetDate <= expectedDate).map(s => s.targetDate) ?? [])])].sort().reverse();
  const selectedAwardDate = awardDates.includes(awardDate) ? awardDate : awardDates[0];
  const savedAward = portfolio?.snapshots.find(s => s.targetDate === selectedAwardDate);
  const awardDraw = results.find(d => d.date === selectedAwardDate);
  const recordedAwardDraw = awardDraw && savedAward?.prizeDrawNumbers ? {...awardDraw, numbers: savedAward.prizeDrawNumbers} : awardDraw;
  const awards = savedAward && recordedAwardDraw ? evaluateKinoSnapshot(savedAward, recordedAwardDraw) : null;
  const awardProfiles = savedAward ? kinoProfiles.filter(profile => savedAward.plays.some(play => play.profile === profile)) : kinoProfiles;
  const currentColumns = current ? Array.from({length:3},(_,columnIndex)=>{
    const start=activePortfolioPage*30+columnIndex*10;
    const plays=current.plays.slice(start,start+10);
    return {key:`portfolio-${activePortfolioPage}-${columnIndex}`,className:"exploratoria",title:`Jugadas ${start+1}–${Math.min(start+10,current.plays.length)}`,description:currentComposition,plays};
  }).filter(column=>column.plays.length) : [];
  const awardColumns = awards?.flatMap(evaluation => Array.from({length: Math.ceil(evaluation.plays.length / 10)}, (_, index) => ({...evaluation, key: `${evaluation.profile}-${index}`, plays: evaluation.plays.slice(index * 10, index * 10 + 10)}))) ?? [];
  const currentWeekMonday = mondayOf(clock.date);
  const calendarMonday = shiftKinoDate(currentWeekMonday, weekOffset * 7);
  const earliestCalendarMonday = useMemo(() => {
    const earliest = portfolio?.snapshots.map(snapshot => snapshot.targetDate).sort()[0];
    return earliest ? mondayOf(earliest) : currentWeekMonday;
  }, [currentWeekMonday, portfolio?.snapshots]);
  const weeklyPrizes = useMemo(() => {
    return weekDayNames.map((day, index) => {
      const date = shiftKinoDate(calendarMonday, index);
      const snapshot = portfolio?.snapshots.find(item => item.targetDate === date);
      const draw = results.find(item => item.date === date);
      return {
        day,
        date,
        prizes: snapshot?.prizes ?? kinoPrizes,
        summary: snapshot?.prizeSummary ?? (snapshot && draw ? summarizeKinoPrizes(snapshot, draw) : null),
        status: !snapshot && date < clock.date ? "missing" as const : "pending" as const
      };
    });
  }, [calendarMonday, clock.date, portfolio?.snapshots, results]);
  const previewNumbers = useMemo(() => {
    if (!previewSnapshot) return [];
    const exposure=new Map<number,number>();
    previewSnapshot.plays.forEach(play=>play.numbers.forEach(number=>exposure.set(number,(exposure.get(number)??0)+1)));
    return [...exposure].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,20).map(([number,count])=>({number,count}));
  },[previewSnapshot]);
  const previewRanges = useMemo(() => [...(previewSnapshot?.rangeModel??[])].sort((a,b)=>b.recentAverage-a.recentAverage||a.range-b.range).slice(0,5),[previewSnapshot]);
  const previewExcluded = previewSnapshot?.excludedByDelay ?? [];

  function download() {
    if (!current) return;
    const text = formatKinoPortfolioText(current);
    const url = URL.createObjectURL(new Blob([`\ufeff${text}`], {type: "text/plain;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = `super-kino-${current.plays.length}-jugadas-${current.targetDate}.txt`; a.click(); URL.revokeObjectURL(url);
  }

  const totalPlayCount = current?.plays.length ?? 120;
  const reinforcedCount = current?.plays.filter(play => play.quickHot).length ?? 30;

  return <main className="lotoTheme kinoTheme">
    <section className="hero">
      <div><p className="eyebrow">LEIDSA · Sorteo diario</p><h1>Super Kino TV</h1><span className="kinoAlgorithmLabel">Algoritmo activo · {currentAlgorithmLabel}</span><p>84 números · 20 extraídos · 10 por jugada</p><p>{current?.plays.length ?? 120} jugadas exploratorias por sorteo.</p></div>
      <div className="heroPanel kinoLatest"><span className="panelLabel">Último sorteo cargado · {latest?.date ?? "Sin datos"}</span>{latest ? <Balls numbers={latest.numbers} /> : <p>No hay resultados disponibles.</p>}</div>
    </section>
    <section className="toolbar"><button disabled={busy} onClick={() => void update()}>{busy ? "Actualizando…" : "Actualizar historial"}</button><span className="status" role="status">{status}</span></section>
    <p className={`kinoPolling ${waiting ? "waiting" : ""}`}>{waiting ? `Esperando resultado del ${expectedDate} · revisión automática cada 60 segundos.` : `Resultado del ${expectedDate} cargado.`} Consulta desde las 9:00 p. m.; domingos, 4:00 p. m. (hora dominicana), mientras esta sección esté abierta.</p>
    <section className="metricsGrid">
      <article className="metric"><span>Formato de 84 números · sorteos</span><strong>{history.length}</strong></article>
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
      <div className="kinoSectionHead"><div><p className="eyebrow">Lunes a domingo</p><h2>Premios de las jugadas guardadas</h2></div><div className="kinoWeekNavigation"><button disabled={calendarMonday <= earliestCalendarMonday} onClick={() => setWeekOffset(offset => offset - 1)}>← Anterior</button><button disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>Actual</button><small>{shortDate(weeklyPrizes[0].date)} – {shortDate(weeklyPrizes[6].date)}</small><button disabled={weekOffset === 0} onClick={() => setWeekOffset(offset => Math.min(0, offset + 1))}>Siguiente →</button></div></div>
      <div className="kinoWeekScroll" tabIndex={0} aria-label="Calendario semanal de premios; desplaza horizontalmente en pantallas pequeñas"><div className="kinoWeekGrid">{weeklyPrizes.map(item => <article className={item.date === clock.date ? "today" : ""} key={item.date}><header><strong>{item.day}</strong><span>{shortDate(item.date)}</span></header>{item.summary ? item.summary.groups.length ? <><div className="kinoWeekPrizeGroups">{item.summary.groups.map(group => {
        const hits = item.prizes.find(prize => prize.amount === group.amount)?.hits;
        return <p key={group.amount}><strong>{group.count} {group.count === 1 ? "jugada" : "jugadas"}{hits === undefined ? "" : ` · ${hits} ${hits === 1 ? "acierto" : "aciertos"}`}</strong><span>Premio {money(group.amount)} c/u</span></p>;
      })}</div><footer>Total ganado <strong>{money(item.summary.total)}</strong></footer></> : <p className="kinoWeekStatus">Sin premios</p> : <p className="kinoWeekStatus">{item.status === "missing" ? "Sin registro" : "Pendiente"}</p>}</article>)}</div></div>
      <p className="muted">El resumen cuenta las jugadas premiadas por monto e indica sus aciertos. No muestra los números sorteados ni las combinaciones.</p>
    </section>

    <section className="card kinoPreview">
      <div className="kinoSectionHead"><div><p className="eyebrow">Análisis de la cartera</p><h2>{previewMode==="before"?`Previa para ${previewWhen??"el próximo sorteo"} · ${previewSnapshot?.targetDate??""}`:`Postgame de ${postgameWhen??"el sorteo más reciente"} · ${postgameSnapshot?.targetDate??""}`}</h2></div><div className="kinoPreviewTabs" role="tablist" aria-label="Momento del análisis"><button className={previewMode==="before"?"active":""} aria-selected={previewMode==="before"} role="tab" onClick={()=>setPreviewMode("before")}>Antes del sorteo</button><button className={previewMode==="after"?"active":""} aria-selected={previewMode==="after"} role="tab" onClick={()=>setPreviewMode("after")}>Después del sorteo</button></div></div>
      {previewMode==="before"?(!previewSnapshot?<p>La previa aparecerá cuando la cartera quede guardada.</p>:<><span className="kinoPreviewStatus">{previewSnapshot.plays.length} jugadas guardadas para {previewWhen}</span><div className="kinoPreviewGrid"><article><h3>Descartados</h3><p>{previewSnapshot.strategyVersion?"≤7 apariciones y más de 5 días sin salir":"Filtro activo de la cartera"}</p><div className="kinoPreviewChips">{previewExcluded.length?previewExcluded.map(item=><span className="excluded" key={item.number}>{String(item.number).padStart(2,"0")}</span>):<small>Sin descartes</small>}</div></article><article><h3>Rangos esperados</h3><p>Ordenados por promedio en los 10 sorteos recientes</p><div className="kinoPreviewRanges">{previewRanges.map(range=><span key={range.range}><strong>{range.from}–{range.to}</strong><small>{range.recentAverage.toFixed(1)} por sorteo</small></span>)}</div></article></div><article className="kinoPreviewCoverage"><h3>Mayor cobertura en nuestra cartera</h3><p>Los 20 números presentes en más jugadas; la cifra indica cuántas veces aparecen.</p><div className="kinoPreviewChips">{previewNumbers.map(item=><span key={item.number}><strong>{String(item.number).padStart(2,"0")}</strong><small>{item.count}</small></span>)}</div></article><p className="muted">Esta previa describe la estrategia guardada antes del sorteo. Cuando llegue el resultado, el postgame evaluará aciertos, premios, rangos reales y el comportamiento de los descartados.</p></>):(!postgameSnapshot||!postgame?<div className="kinoPostgameWaiting"><strong>El sorteo aún no ha ocurrido.</strong><p>Esta vista se completará automáticamente cuando exista un resultado con cartera guardada.</p></div>:<>{pendingDraw&&postgameSnapshot.targetDate!==current?.targetDate?<div className="kinoPostgameNotice">El sorteo de {previewWhen} aún no ha ocurrido. Mostrando el postgame de {postgameWhen}.</div>:null}<div className="kinoPostgameResult"><div><h3>Resultado oficial de {postgameWhen}</h3><Balls numbers={postgameDraw!.numbers}/></div><span className="kinoPreviewStatus">Postgame completo</span></div><div className="kinoPostgameMetrics"><article><span>Máximo de aciertos</span><strong>{postgame.maximumHits}/10</strong></article><article><span>Jugadas premiadas</span><strong>{postgame.awardedPlays}</strong></article><article><span>Premio total</span><strong>{money(postgame.totalPrize)}</strong></article><article><span>Balance</span><strong>{money(postgame.net)}</strong></article></div><div className="kinoPreviewGrid"><article><h3>Resultado por rangos</h3><div className="kinoPostgameRanges">{postgame.ranges.map(range=><span key={range.range}><strong>{range.from}–{range.to}</strong><small>Real {range.actual} · previsto {range.expected.toFixed(1)}</small></span>)}</div></article><article><h3>Cobertura del resultado</h3><p>{postgame.coveredWinningNumbers.length} de 20 números ganadores estaban presentes en la cartera.</p><div className="kinoPreviewChips">{postgame.coveredWinningNumbers.map(number=><span key={number}>{String(number).padStart(2,"0")}</span>)}</div></article></div><div className="kinoPostgameBreakdown"><article><h3>Esperados que salieron</h3><div className="kinoPreviewChips">{postgame.expectedHits.length?postgame.expectedHits.map(number=><span key={number}>{String(number).padStart(2,"0")}</span>):<small>Ninguno</small>}</div></article><article><h3>Descartados que salieron</h3><div className="kinoPreviewChips">{postgame.excludedHits.length?postgame.excludedHits.map(number=><span className="excluded" key={number}>{String(number).padStart(2,"0")}</span>):<small>Ninguno</small>}</div></article><article><h3>Top 20 que salieron</h3><div className="kinoPreviewChips">{postgame.persistentHits.length?postgame.persistentHits.map(number=><span key={number}>{String(number).padStart(2,"0")}</span>):<small>Ninguno</small>}</div></article><article><h3>Recuperación que salió</h3><div className="kinoPreviewChips">{postgame.recoveryHits.length?postgame.recoveryHits.map(number=><span key={number}>{String(number).padStart(2,"0")}</span>):<small>Ninguno</small>}</div></article></div></>)}
    </section>

    <section className="card">
      <div className="kinoSectionHead"><div><h2>Las {current?.plays.length ?? 120} jugadas para el {current?.targetDate ?? "próximo sorteo"}</h2><p>Vista {activePortfolioPage+1} de {portfolioPageCount} · 30 jugadas por vista · tres columnas de 10</p></div><button disabled={!current} onClick={download}>Descargar las {current?.plays.length ?? 120} en TXT</button></div>
      {portfolioError ? <p role="alert">{portfolioError} <button onClick={() => void loadPortfolio()}>Reintentar jugadas</button></p> : null}
      {current ? <><p className="kinoSaved">Guardadas antes del sorteo · Base: {current.analysisFrom} a {current.analysisTo} ({current.sampleSize} sorteos). {currentIsV9 ? `Las ${current.plays.length} jugadas usan exclusivamente el historial observado con 84 números y el top 20 persistente.${current.algorithm === "kino-v9.4" || current.algorithm === "kino-v10" ? ` ${current.algorithm.replace("kino-","").toUpperCase()} exige exactamente 2 números del 1–10 por jugada.` : current.algorithm === "kino-v9.3" ? " V9.3 combina 70 coberturas de grupo con 50 jugadas híbridas, exige entre uno y tres números del 1 al 9 y balancea los demás rangos según los últimos 10 sorteos." : current.algorithm === "kino-v9.1" ? " V9.1 conserva 115 jugadas base y aplica 5 rotaciones intermedias antirredundancia." : ""}` : `${reinforcedCount} jugadas están reforzadas con calientes cuyo promedio de los tres intervalos recientes es de 1 a 2 sorteos.`} Estas jugadas no cambian con los filtros ni al recibir el resultado.</p>{currentIsV9 && current.persistentTopNumbers?.length ? <div className="kinoDelayFilter"><strong>Top 20 persistente</strong><span>Ordenados de menor a mayor:</span><div>{[...current.persistentTopNumbers].sort((a,b)=>a-b).map(number => <span key={number}>{String(number).padStart(2,"0")}</span>)}</div></div> : current.quickHotNumbers?.length ? <div className="kinoDelayFilter"><strong>Calientes rápidos usados en el refuerzo</strong><span>Promedio reciente entre paréntesis:</span><div>{current.quickHotNumbers.map(item => <span key={item.number} title={`Intervalos recientes: ${item.recentIntervals.join(", ")} sorteos`}>{String(item.number).padStart(2,"0")} · {item.averageInterval.toFixed(2)}</span>)}</div></div> : null}{currentIsHybrid?<div className="kinoDelayFilter"><strong>Cobertura por rangos</strong><span>Promedio por jugada · promedio observado por sorteo:</span><div>{currentRangeCoverage.map(range=><span key={range.from}>{range.from}–{range.to} · {range.perPlay.toFixed(2)} / {range.perDraw.toFixed(2)}</span>)}</div></div>:null}<div className="kinoDelayFilter"><strong>{current.strategyVersion?"Descartes estratégicos · ≤7 salidas y >5 días":currentIsHybrid?"Filtro adaptativo":"Filtro de atraso de un mes"}</strong>{currentStaleNumbers.length ? <><span>{currentStaleNumbers.length} excluidos de las {current.plays.length} jugadas:</span><div>{currentStaleNumbers.map(item => <span key={item.number} title={item.lastDate ? `Última salida: ${item.lastDate}` : "Sin salida registrada"}>{String(item.number).padStart(2,"0")}</span>)}</div></> : <span>Ningún número quedó fuera para este sorteo.</span>}</div><div className="kinoPortfolioCarousel"><div className="kinoPortfolioScroll" tabIndex={0} aria-label={`Jugadas ${activePortfolioPage*30+1} a ${Math.min((activePortfolioPage+1)*30,current.plays.length)} de ${current.plays.length}`}><div className="kinoPortfolioGrid">{currentColumns.map(column => <article className={`kinoPlayColumn ${column.className}`} key={column.key}><header><h3>{column.title}</h3><small>{column.description}</small></header>{column.plays.map(p => <div className="kinoPlayRow" key={p.id}><span className="kinoPlayNumber" title={p.quickHot ? "Reforzada con calientes rápidos" : undefined}>{p.quickHot ? "⚡" : ""}{String(p.id).padStart(3,"0")}</span><Balls numbers={p.numbers} /></div>)}<footer>{column.plays.length} jugadas × RD$25 = {money(column.plays.length*25)}</footer></article>)}</div></div><div className="kinoPortfolioNavigation"><button disabled={activePortfolioPage===0} onClick={()=>setPortfolioPage(page=>Math.max(0,page-1))}>← Anteriores</button><div aria-label="Seleccionar grupo de jugadas">{Array.from({length:portfolioPageCount},(_,index)=><button className={index===activePortfolioPage?"active":""} aria-current={index===activePortfolioPage?"page":undefined} aria-label={`Ver jugadas ${index*30+1} a ${Math.min((index+1)*30,current.plays.length)}`} key={index} onClick={()=>setPortfolioPage(index)}>{index+1}</button>)}</div><button disabled={activePortfolioPage===portfolioPageCount-1} onClick={()=>setPortfolioPage(page=>Math.min(portfolioPageCount-1,page+1))}>Siguientes →</button></div></div></> : <p>{portfolioError ? "Las jugadas aparecerán cuando se confirme su guardado." : portfolio?.waitingForResult ? "Esperando el resultado pendiente antes de preparar las próximas jugadas." : "Cargando y guardando las jugadas…"}</p>}
      {currentIsHybrid ? <div className="kinoDelayFilter"><strong>Ajuste {current?.algorithm.replace("kino-", "").toUpperCase()} adaptativo</strong><span>Cada jugada lleva exactamente 2 números del 1–10 y conserva cobertura en 21–30 y 81–84. La cartera pondera rangos recientes, escenarios de concentración y recuperación elegible.</span>{currentDominantRanges.length?<div>{currentDominantRanges.map(range=><span key={range.range}>{range.from}–{range.to} · {range.recentAverage.toFixed(1)} recientes</span>)}</div>:null}{currentRecoveryNumbers.length ? <div>{currentRecoveryNumbers.map(number=><span key={number}>{String(number).padStart(2,"0")}</span>)}</div> : null}</div> : null}
      <p className="muted">{currentIsHybrid ? "La cartera principal usa 25 jugadas calientes, 35 intermedias con un ancla caliente o fría, 10 frías y 50 híbridas: 20 de 4/3/3, 15 de 5/3/2 y 15 de 3/3/4." : `Las 120 jugadas usan la composición exploratoria ${currentIsV9 ? "5/3/2" : "3/3/4"}.`} El carrusel permite revisar la cartera completa en grupos de 30. Cada sorteo es independiente; esta distribución no garantiza ni aumenta la probabilidad de una jugada individual.</p>
    </section>

    <section className="card kinoNote"><div className="kinoSectionHead"><h2>Análisis de números</h2><label>Analizar últimos <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))}><option value={10}>10 sorteos</option><option value={30}>30 sorteos</option><option value={90}>90 sorteos</option><option value={100000}>Todos desde el corte</option></select></label></div><p>{sample.length ? `${sample.at(-1)?.date} a ${sample[0]?.date} · ${sample.length} sorteos disponibles.` : "Sin sorteos para analizar."}</p><details><summary>Cómo se calcula</summary><p>Calientes, intermedios y fríos se calculan entre los números elegibles. V9.4 exige más de tres apariciones desde el comienzo del formato de 84 números. Las primeras 105 jugadas usan números vistos durante los últimos nueve días; las 15 finales recuperan números más atrasados que cumplen la frecuencia global.</p><p>Cada jugada conserva exactamente 2 números de 1–10 y cobertura en 21–30 y 81–84. Los demás espacios se asignan por el promedio de los últimos 10 sorteos y pueden concentrar hasta cuatro números en un mismo rango. El historial visible usa solamente el formato observado de 84 números desde el 15/09/2026, y la generación toma los últimos 30 sorteos anteriores.</p></details></section>
    {sample.length ? <section className="kinoColumns">{[
      {title: "Números calientes", rows: groups.hot.slice(0,10), kind: "hot"},
      {title: "Números fríos", rows: groups.cold.slice(0,10), kind: "cold"},
      {title: "Mayor ausencia", rows: [...stats].sort((a,b) => b.gap-a.gap || a.number-b.number).slice(0,10), kind: "gap"}
    ].map(group => <article className={`card kinoRank ${group.kind}`} key={group.title}><h2>{group.title}</h2>{group.rows.map(r => <div className="kinoRankRow" key={r.number}><Ball value={r.number} /><div><strong>{r.count} salidas · {r.percent.toFixed(1)}%</strong><small>{r.lastDate ? `Última: ${r.lastDate} · ${r.gap} sin salir` : `Sin aparición en ${sample.length} sorteos`}</small></div></div>)}</article>)}</section> : null}

    <section className="kinoColumns kinoBottom"><section className="card"><h2>Tabla de premios</h2><p>Por una jugada de RD$25 · Verificada el 06/10/2026.</p><table><thead><tr><th>Aciertos</th><th>Premio</th></tr></thead><tbody>{kinoPrizes.map(p => <tr key={p.hits}><td>{p.hits} de 10</td><td>{money(p.amount)}</td></tr>)}<tr><td>1–4</td><td>Sin premio</td></tr></tbody></table><p><a href={KINO_OFFICIAL} target="_blank" rel="noreferrer">Reglas y tabla oficial de LEIDSA</a></p></section><section className="card"><h2>Frecuencia de los 84 números</h2><p>Número · apariciones en todo el historial desde el {KINO_ANALYSIS_START} ({history.length} sorteos)</p><div className="kinoNumberGrid">{fullHistoryStats.map(s => <div key={s.number} title={`${s.percent.toFixed(1)}% · ${s.lastDate ?? "Sin aparición"}`}><strong>{String(s.number).padStart(2,"0")}</strong><span>{s.count}</span></div>)}</div></section></section>
    <section className="card kinoHistoryCard"><div className="kinoSectionHead"><div><p className="eyebrow">Formato actual</p><h2>Historial desde los 84 números</h2><p>{KINO_ANALYSIS_START} a {clock.date} · {history.length} sorteos cargados.{missingCount ? ` Faltan ${missingCount} fechas por recuperar.` : " Todas las fechas esperadas están cargadas."}</p></div><div className="kinoHistoryKey"><span><i className="low" />1–29</span><span><i className="middle" />30–59</span><span><i className="high" />60–84</span></div></div><p className="muted">Cada fila separa los 20 números por decenas para identificar rápidamente dónde se concentró el sorteo. La fecha abre la fuente consultada.</p><details><summary>Días sin sorteo documentados</summary><div className="kinoNoDraws">{kinoNoDraws.filter(d => d.date >= KINO_ANALYSIS_START && d.date <= clock.date).map(d => <a key={d.date} href={d.source} target="_blank" rel="noreferrer">{d.date} · Sin sorteo</a>)}</div></details><div className="kinoHistory">{history.slice((activePage-1)*10,activePage*10).map(d => <article key={d.date}><header><a href={d.source} target="_blank" rel="noreferrer">{historyDate(d.date)}</a><small>{d.date} · 20 números</small></header><div className="kinoHistoryRanges">{rangeBands.map(([from,to]) => { const rangeNumbers = [...d.numbers].filter(number => number >= from && number <= to).sort((a,b) => a-b); return <section className={to <= 29 ? "low" : to <= 59 ? "middle" : "high"} key={from}><span>{from}–{to}</span><div>{rangeNumbers.map(number => <Ball key={number} value={number} />)}<small>{rangeNumbers.length}</small></div></section>; })}</div></article>)}</div><div className="toolbar kinoHistoryPagination"><button disabled={activePage===1} onClick={() => setPage(activePage-1)}>← Más recientes</button><span>Página {activePage} de {pages}</span><button disabled={activePage===pages} onClick={() => setPage(activePage+1)}>Más antiguos →</button><button disabled={activePage===pages} onClick={() => setPage(pages)}>Ir al inicio del formato</button></div></section>
  </main>;
}
