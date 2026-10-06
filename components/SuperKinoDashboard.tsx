"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "./Ball";
import { buildKinoPlays, kinoGroups, kinoStats, kinoPrizes, KINO_OFFICIAL, KINO_ANALYSIS_START, type KinoDraw } from "../lib/super-kino";
const money = (n:number) => `RD$${n.toLocaleString("en-US")}`;
function Balls({numbers}:{numbers:number[]}) { return <div className="kinoBalls">{numbers.map(n=><Ball key={n} value={n}/>)}</div>; }
export function SuperKinoDashboard({initialResults}:{initialResults:KinoDraw[]}) {
  const [results,setResults] = useState(initialResults);
  const [windowSize,setWindowSize] = useState(30);
  const [page,setPage] = useState(1);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("Historial local disponible.");
  const started = useRef(false);
  const eligible = useMemo(()=>results.filter(d=>d.date>=KINO_ANALYSIS_START),[results]);
  const sample = useMemo(()=>eligible.slice(0,windowSize),[eligible,windowSize]);
  const groups = useMemo(()=>kinoGroups(sample),[sample]);
  const stats = useMemo(()=>kinoStats(sample),[sample]);
  const plays = useMemo(()=>buildKinoPlays(sample),[sample]);
  const latest = results[0];
  const pages = Math.max(1,Math.ceil(results.length/10));
  async function update() {
    setBusy(true);setStatus("Consultando resultados publicados…");
    try {
      const response = await fetch("/api/super-kino/update");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setResults(payload.results);setStatus(payload.message);setPage(1);
    } catch { setStatus("No se pudo actualizar. El historial local sigue disponible; revisa la fecha del último sorteo."); }
    finally {setBusy(false);}
  }
  useEffect(()=>{if(!started.current){started.current=true;void update();}},[]);
  function download() {
    const csv = ["Jugada,Calientes,Intermedios,Frios,Numeros",...plays.map(p=>`${p.id},${p.hot},${p.middle},${p.cold},${p.numbers.map(n=>String(n).padStart(2,"0")).join(" ")}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=`super-kino-exploratorias-base-${latest?.date ?? "sin-datos"}.csv`;a.click();URL.revokeObjectURL(url);
  }
  return <main className="lotoTheme kinoTheme">
    <section className="hero"><div><p className="eyebrow">LEIDSA · Sorteo diario</p><h1>Super Kino TV</h1><p>84 números · 20 extraídos · 10 por jugada</p><p>Explora frecuencias, ausencias y combinaciones del historial.</p></div><div className="heroPanel"><span className="panelLabel">Último sorteo cargado · {latest?.date ?? "Sin datos"}</span>{latest ? <Balls numbers={latest.numbers}/> : <p>No hay resultados disponibles.</p>}</div></section>
    <section className="toolbar"><button disabled={busy} onClick={()=>void update()}>{busy ? "Actualizando…" : "Actualizar historial"}</button><label>Analizar últimos <select value={windowSize} onChange={e=>setWindowSize(Number(e.target.value))}><option value={10}>10 sorteos</option><option value={30}>30 sorteos</option><option value={90}>90 sorteos</option><option value={100000}>Todos desde el corte</option></select></label><span className="status" role="status">{status}</span></section>
    <section className="metricsGrid"><article className="metric"><span>Sorteos en historial</span><strong>{results.length}</strong></article><article className="metric"><span>Sorteos analizados</span><strong>{sample.length}</strong></article><article className="metric"><span>Precio por jugada</span><strong>RD$25</strong></article><article className="metric"><span>10 jugadas exploratorias</span><strong>RD$250</strong></article></section>
    <section className="card kinoNote"><h2>Base del análisis</h2><p>{sample.length ? `${sample.at(-1)?.date} a ${sample[0]?.date} · ${sample.length} sorteos disponibles para la ventana seleccionada.` : "Sin sorteos para analizar."}</p><p>El corte conservador es el 15/09/2026: primera aparición observada de números mayores de 80 en este archivo. No confirma la fecha oficial del cambio a 84. Los sorteos anteriores permanecen en el historial, pero se excluyen de las frecuencias y jugadas.</p><p>Calientes: los 28 más frecuentes; fríos: los 28 menos frecuentes; intermedios: los otros 28. Los empates se ordenan por número. La ausencia cuenta sorteos de la muestra desde la última aparición.</p></section>
    {sample.length > 0 ? <><section className="kinoColumns">{([{title:"Números calientes",rows:groups.hot.slice(0,10),kind:"hot"},{title:"Números fríos",rows:groups.cold.slice(0,10),kind:"cold"},{title:"Mayor ausencia",rows:[...stats].sort((a,b)=>b.gap-a.gap||a.number-b.number).slice(0,10),kind:"gap"}]).map(group=><article className={`card kinoRank ${group.kind}`} key={group.title}><h2>{group.title}</h2>{group.rows.map(r=><div className="kinoRankRow" key={r.number}><Ball value={r.number}/><div><strong>{r.count} salidas · {r.percent.toFixed(1)}%</strong><small>{r.lastDate ? `Última: ${r.lastDate} · ${r.gap} sin salir` : `Sin aparición en ${sample.length} sorteos`}</small></div></div>)}</article>)}</section>
    <section className="card"><div className="kinoSectionHead"><div><h2>10 jugadas exploratorias</h2><p>Base histórica hasta {sample[0]?.date}. Combinaciones para explorar después de esa fecha.</p></div><button onClick={download}>Descargar jugadas CSV</button></div><p>Mezclan los tres grupos y priorizan números menos usados en las demás jugadas para ampliar la cobertura. Se mantienen iguales con la misma muestra; cambiar la ventana o actualizar resultados las recalcula.</p><div className="kinoPlays">{plays.map(p=><article className="kinoPlay" key={p.id}><strong>Exploratoria {String(p.id).padStart(2,"0")}</strong><Balls numbers={p.numbers}/><small>{p.hot} calientes · {p.middle} intermedios · {p.cold} fríos</small></article>)}</div><p className="muted">Las frecuencias describen el pasado. Cada sorteo es independiente: estas combinaciones no predicen ni aumentan la probabilidad de una jugada individual.</p></section></> : null}
    <section className="kinoColumns kinoBottom"><section className="card"><h2>Tabla de premios</h2><p>Por una jugada de RD$25 · Verificada el 06/10/2026.</p><table><thead><tr><th>Aciertos</th><th>Premio</th></tr></thead><tbody>{kinoPrizes.map(p=><tr key={p.hits}><td>{p.hits} de 10</td><td>{money(p.amount)}</td></tr>)}<tr><td>1–4</td><td>Sin premio</td></tr></tbody></table><p><a href={KINO_OFFICIAL} target="_blank" rel="noreferrer">Reglas y tabla oficial de LEIDSA</a></p></section><section className="card"><h2>Frecuencia de los 84 números</h2><p>Número · apariciones en {sample.length} sorteos</p><div className="kinoNumberGrid">{stats.map(s=><div key={s.number} title={`${s.percent.toFixed(1)}% · ${s.lastDate ?? "Sin aparición"}`}><strong>{String(s.number).padStart(2,"0")}</strong><span>{s.count}</span></div>)}</div></section></section>
    <section className="card"><h2>Historial de resultados</h2><p>Fuente secundaria: Lotería Hoy RD. Cada fecha enlaza al archivo consultado. Números ordenados para facilitar la lectura.</p><div className="kinoHistory">{results.slice((page-1)*10,page*10).map(d=><article key={d.date}><a href={d.source} target="_blank" rel="noreferrer">{d.date}</a><Balls numbers={[...d.numbers].sort((a,b)=>a-b)}/>{d.date<KINO_ANALYSIS_START ? <small>Fuera del período de análisis</small> : null}</article>)}</div><div className="toolbar"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page} de {pages}</span><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div></section>
  </main>;
}
