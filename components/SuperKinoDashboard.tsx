"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "./Ball";
import {
  evaluateKinoSnapshot, kinoGroups, kinoStats, kinoPrizes, kinoProfiles, kinoProfileLabels,
  KINO_OFFICIAL, KINO_ANALYSIS_START, type KinoDraw, type KinoSnapshot
} from "../lib/super-kino";
import { kinoNoDraws, isKinoNoDraw, kinoClock, kinoExpectedDate, kinoTargetDate, kinoYearStart, kinoDates } from "../lib/super-kino-clock";

const money = (n: number) => `RD$${n.toLocaleString("en-US")}`;
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
  const awardDates = [...new Set([expectedDate, ...(portfolio?.snapshots.filter(s => s.targetDate <= expectedDate).map(s => s.targetDate) ?? [])])].sort().reverse();
  const selectedAwardDate = awardDates.includes(awardDate) ? awardDate : awardDates[0];
  const savedAward = portfolio?.snapshots.find(s => s.targetDate === selectedAwardDate);
  const awardDraw = results.find(d => d.date === selectedAwardDate);
  const awards = savedAward && awardDraw ? evaluateKinoSnapshot(savedAward, awardDraw) : null;

  function download() {
    if (!current) return;
    const csv = ["Fecha,Perfil,Jugada,Calientes,Intermedios,Frios,Numeros", ...current.plays.map(p => `${current.targetDate},${kinoProfileLabels[p.profile]},${p.id},${p.hot},${p.middle},${p.cold},${p.numbers.map(n => String(n).padStart(2,"0")).join(" ")}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = `super-kino-30-jugadas-${current.targetDate}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return <main className="lotoTheme kinoTheme">
    <section className="hero">
      <div><p className="eyebrow">LEIDSA · Sorteo diario</p><h1>Super Kino TV</h1><p>84 números · 20 extraídos · 10 por jugada</p><p>Fuertes, equilibradas y exploratorias: 30 jugadas por sorteo.</p></div>
      <div className="heroPanel kinoLatest"><span className="panelLabel">Último sorteo cargado · {latest?.date ?? "Sin datos"}</span>{latest ? <Balls numbers={latest.numbers} /> : <p>No hay resultados disponibles.</p>}</div>
    </section>
    <section className="toolbar"><button disabled={busy} onClick={() => void update()}>{busy ? "Actualizando…" : "Actualizar historial"}</button><span className="status" role="status">{status}</span></section>
    <p className={`kinoPolling ${waiting ? "waiting" : ""}`}>{waiting ? `Esperando resultado del ${expectedDate} · revisión automática cada 60 segundos.` : `Resultado del ${expectedDate} cargado.`} Consulta desde las 9:00 p. m.; domingos, 4:00 p. m. (hora dominicana), mientras esta sección esté abierta.</p>
    <section className="metricsGrid">
      <article className="metric"><span>Último año · sorteos cargados</span><strong>{history.length}</strong></article>
      <article className="metric"><span>Sorteos analizados</span><strong>{sample.length}</strong></article>
      <article className="metric"><span>10 jugadas por perfil</span><strong>RD$250</strong></article>
      <article className="metric"><span>30 jugadas en total</span><strong>RD$750</strong></article>
    </section>

    <section className="card kinoAwards">
      <div className="kinoSectionHead"><div><p className="eyebrow">Evaluación de jugadas guardadas</p><h2>Premios obtenidos</h2></div><label>Sorteo evaluado <select value={selectedAwardDate} onChange={e => setAwardDate(e.target.value)}>{awardDates.map(date => <option key={date} value={date}>{date}</option>)}</select></label></div>
      {!portfolio ? <p>{portfolioError || "Cargando jugadas guardadas…"}</p> : !savedAward ? <p>No hay jugadas guardadas antes del sorteo del {selectedAwardDate}. La evaluación comenzará con el primer sorteo que tenga sus 30 jugadas guardadas; no se reconstruyen premios retrospectivos.</p> : !awardDraw ? <p>Las 30 jugadas del {selectedAwardDate} están guardadas. Esperando el resultado para calcular sus premios.</p> : <p>Resultado del {selectedAwardDate} comparado con las 30 jugadas guardadas antes del cierre.</p>}
      <div className="kinoAwardsGrid">{kinoProfiles.map(profile => {
        const evaluation = awards?.find(a => a.profile === profile);
        return <article className={`kinoAward ${profile}`} key={profile}><span>10 {kinoProfileLabels[profile]}</span><strong>{evaluation ? money(evaluation.total) : "—"}</strong><small>{evaluation ? `${evaluation.winners} premiadas · costo ${money(evaluation.cost)} · balance ${money(evaluation.net)}` : savedAward ? "Pendiente de resultado" : "Sin evaluación"}</small></article>;
      })}</div>
      {awards ? <><p>Total premiado: <strong>{money(awards.reduce((sum,a) => sum+a.total,0))}</strong> · Costo total: RD$750 · Balance: <strong>{money(awards.reduce((sum,a) => sum+a.net,0))}</strong></p><button onClick={() => setShowAwardPlays(v => !v)}>{showAwardPlays ? "Ocultar detalle" : "Ver aciertos y premios por jugada"}</button>{showAwardPlays ? <div className="kinoPortfolioScroll"><div className="kinoPortfolioGrid">{awards.map(a => <article key={a.profile} className={`kinoPlayColumn ${a.profile}`}><h3>{kinoProfileLabels[a.profile]}</h3>{a.plays.map(p => <div className="kinoPlayRow" key={p.id}><small>#{String(p.id).padStart(2,"0")} · {p.hits} aciertos · {money(p.prize)}</small><Balls numbers={p.numbers} matches={p.matches} /></div>)}</article>)}</div></div> : null}</> : null}
    </section>

    <section className="card">
      <div className="kinoSectionHead"><div><h2>30 jugadas para el {current?.targetDate ?? "próximo sorteo"}</h2><p>10 fuertes · 10 equilibradas · 10 exploratorias</p></div><button disabled={!current} onClick={download}>Descargar 30 jugadas CSV</button></div>
      {portfolioError ? <p role="alert">{portfolioError} <button onClick={() => void loadPortfolio()}>Reintentar jugadas</button></p> : null}
      {current ? <><p className="kinoSaved">Guardadas antes del sorteo · Base: {current.analysisFrom} a {current.analysisTo} ({current.sampleSize} sorteos). Estas jugadas no cambian con los filtros ni al recibir el resultado.</p><div className="kinoPortfolioScroll" tabIndex={0} aria-label="Tres columnas de diez jugadas; desplaza horizontalmente en pantallas pequeñas"><div className="kinoPortfolioGrid">{kinoProfiles.map(profile => <article className={`kinoPlayColumn ${profile}`} key={profile}><header><h3>10 {kinoProfileLabels[profile]}</h3><small>{profileDescriptions[profile]}</small></header>{current.plays.filter(p => p.profile === profile).map(p => <div className="kinoPlayRow" key={p.id}><span className="kinoPlayNumber">{String(p.id).padStart(2,"0")}</span><Balls numbers={p.numbers} /></div>)}<footer>10 jugadas × RD$25 = RD$250</footer></article>)}</div></div></> : <p>{portfolioError ? "Las jugadas aparecerán cuando se confirme su guardado." : portfolio?.waitingForResult ? "Esperando el resultado pendiente antes de preparar las próximas 30 jugadas." : "Cargando y guardando las 30 jugadas…"}</p>}
      <p className="muted">“Fuertes” describe una mayor presencia de números frecuentes. Cada sorteo es independiente; los perfiles no garantizan ni aumentan la probabilidad de una jugada individual.</p>
    </section>

    <section className="card kinoNote"><div className="kinoSectionHead"><h2>Análisis de números</h2><label>Analizar últimos <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))}><option value={10}>10 sorteos</option><option value={30}>30 sorteos</option><option value={90}>90 sorteos</option><option value={100000}>Todos desde el corte</option></select></label></div><p>{sample.length ? `${sample.at(-1)?.date} a ${sample[0]?.date} · ${sample.length} sorteos disponibles.` : "Sin sorteos para analizar."}</p><details><summary>Cómo se calcula</summary><p>Calientes: los 28 más frecuentes; fríos: los 28 menos frecuentes; intermedios: los otros 28. Empates por número; en la lista de fríos, la ausencia desempata la presentación. La ausencia cuenta sorteos de la muestra desde la última aparición.</p><p>El historial cubre un año. El análisis para el formato de 84 números conserva el corte prudente del 15/09/2026, primera aparición observada de números mayores de 80 en el archivo inicial; no confirma la fecha oficial del cambio. Las jugadas guardadas usan los últimos 30 sorteos disponibles desde ese corte, anteriores al sorteo objetivo.</p></details></section>
    {sample.length ? <section className="kinoColumns">{[
      {title: "Números calientes", rows: groups.hot.slice(0,10), kind: "hot"},
      {title: "Números fríos", rows: groups.cold.slice(0,10), kind: "cold"},
      {title: "Mayor ausencia", rows: [...stats].sort((a,b) => b.gap-a.gap || a.number-b.number).slice(0,10), kind: "gap"}
    ].map(group => <article className={`card kinoRank ${group.kind}`} key={group.title}><h2>{group.title}</h2>{group.rows.map(r => <div className="kinoRankRow" key={r.number}><Ball value={r.number} /><div><strong>{r.count} salidas · {r.percent.toFixed(1)}%</strong><small>{r.lastDate ? `Última: ${r.lastDate} · ${r.gap} sin salir` : `Sin aparición en ${sample.length} sorteos`}</small></div></div>)}</article>)}</section> : null}

    <section className="kinoColumns kinoBottom"><section className="card"><h2>Tabla de premios</h2><p>Por una jugada de RD$25 · Verificada el 06/10/2026.</p><table><thead><tr><th>Aciertos</th><th>Premio</th></tr></thead><tbody>{kinoPrizes.map(p => <tr key={p.hits}><td>{p.hits} de 10</td><td>{money(p.amount)}</td></tr>)}<tr><td>1–4</td><td>Sin premio</td></tr></tbody></table><p><a href={KINO_OFFICIAL} target="_blank" rel="noreferrer">Reglas y tabla oficial de LEIDSA</a></p></section><section className="card"><h2>Frecuencia de los 84 números</h2><p>Número · apariciones en {sample.length} sorteos</p><div className="kinoNumberGrid">{stats.map(s => <div key={s.number} title={`${s.percent.toFixed(1)}% · ${s.lastDate ?? "Sin aparición"}`}><strong>{String(s.number).padStart(2,"0")}</strong><span>{s.count}</span></div>)}</div></section></section>
    <section className="card"><h2>Historial · último año</h2><p>{yearStart} a {clock.date} · {history.length} sorteos cargados.{missingCount ? ` Faltan ${missingCount} fechas por recuperar.` : " Todas las fechas esperadas están cargadas."}</p><p>Fuentes: Lotería Hoy RD, EnLoteria y Diario Libre. Cada fecha enlaza al archivo consultado.</p><details><summary>Días sin sorteo documentados</summary><div className="kinoNoDraws">{kinoNoDraws.filter(d => d.date >= yearStart && d.date <= clock.date).map(d => <a key={d.date} href={d.source} target="_blank" rel="noreferrer">{d.date} · Sin sorteo</a>)}</div></details><div className="kinoHistory">{history.slice((activePage-1)*10,activePage*10).map(d => <article key={d.date}><a href={d.source} target="_blank" rel="noreferrer">{d.date}</a><Balls numbers={[...d.numbers].sort((a,b) => a-b)} />{d.date < KINO_ANALYSIS_START ? <small>Historial anterior al corte de análisis de 84 números</small> : null}</article>)}</div><div className="toolbar"><button disabled={activePage===1} onClick={() => setPage(activePage-1)}>Anterior</button><span>Página {activePage} de {pages}</span><button disabled={activePage===pages} onClick={() => setPage(activePage+1)}>Siguiente</button><button disabled={activePage===pages} onClick={() => setPage(pages)}>Hace un año</button></div></section>
  </main>;
}
