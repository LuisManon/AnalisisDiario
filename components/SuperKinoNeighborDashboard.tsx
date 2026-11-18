"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalysisWorkspace } from "./AnalysisWorkspace";
import { Ball } from "./Ball";
import { publicationWindow } from "../lib/draw-schedule";
import { kinoClock, kinoExpectedDate, kinoTargetDate, shiftKinoDate } from "../lib/super-kino-clock";
import { evaluateNeighbor, neighborDayState, KINO_NEIGHBOR_START, type KinoNeighborSnapshot } from "../lib/super-kino-neighbor";
import type { KinoDraw } from "../lib/super-kino";

type Payload = { current: KinoNeighborSnapshot | null; snapshots: KinoNeighborSnapshot[]; results: KinoDraw[]; expectedDate: string; startDate: string };
const money = (n: number) => `RD$${n.toLocaleString("en-US")}`;
const shortDate = (date: string) => new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
function monday(date: string) { const d = new Date(`${date}T12:00:00Z`).getUTCDay(); return shiftKinoDate(date, d === 0 ? -6 : 1 - d); }
function Balls({ numbers, matches = [] }: { numbers: number[]; matches?: number[] }) { return <div className="kinoBalls">{numbers.map(n => <Ball key={n} value={n} winner={matches.includes(n)} />)}</div>; }

export function SuperKinoNeighborDashboard({ initialResults }: { initialResults: KinoDraw[] }) {
  const [data, setData] = useState<Payload | null>(null), [error, setError] = useState(""), [reload, setReload] = useState(0);
  const [now, setNow] = useState(() => new Date()), [weekOffset, setWeekOffset] = useState(0), [page, setPage] = useState(0), [selected, setSelected] = useState("");
  useEffect(() => {
    let alive = true, pending = false;
    const refresh = async () => {
      if (pending) return; pending = true;
      const currentTime = new Date();
      try {
        const response = await fetch("/api/super-kino-neighbor/portfolio", { cache: "no-store" });
        let payload: Payload & { message?: string } = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "No se pudieron cargar las carteras ±1.");
        if (alive) { setData(payload); setNow(currentTime); }
        const expected = kinoExpectedDate(currentTime);
        let sourceWarning = "";
        if (expected >= KINO_NEIGHBOR_START && !payload.results.some(r => r.date === expected) && !publicationWindow("kino", currentTime)) {
          const update = await fetch("/api/super-kino/update", { cache: "no-store" });
          if (!update.ok) sourceWarning = "La fuente de resultados no respondió. Conservamos los datos guardados y volveremos a intentar.";
        }
        const target = [KINO_NEIGHBOR_START, kinoTargetDate(currentTime)].sort().at(-1)!;
        const prepared = await fetch("/api/super-kino-neighbor/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: target }), cache: "no-store" });
        payload = await prepared.json();
        if (!prepared.ok) throw new Error(payload.message ?? "No se pudo confirmar el guardado de la cartera ±1.");
        if (alive) { setData(payload); setError(sourceWarning); setNow(new Date()); }
      } catch (failure) { if (alive) setError(failure instanceof Error ? failure.message : "No se pudo actualizar Super Kino TV ±1."); }
      finally { pending = false; }
    };
    void refresh(); const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [reload]);
  const clock = kinoClock(now), current = data?.current;
  const snapshots = data?.snapshots ?? [], results = data?.results ?? initialResults;
  const weekStart = shiftKinoDate(monday(clock.date), weekOffset * 7), earliestWeek = monday(shiftKinoDate(KINO_NEIGHBOR_START, -2));
  const calendar = days.map((day, i) => {
    const date = shiftKinoDate(weekStart, i), snapshot = snapshots.find(s => s.targetDate === date);
    const state = neighborDayState(date, snapshot, now);
    return { date, day, snapshot, state: !data && state.kind !== "not-scheduled" ? { kind: "pending" as const, label: error ? "No se pudo verificar" : "Cargando…" } : state };
  });
  const dates = [...snapshots].sort((a, b) => b.targetDate.localeCompare(a.targetDate));
  const selectedDate = dates.some(s => s.targetDate === selected) ? selected : dates[0]?.targetDate ?? "";
  const detail = snapshots.find(s => s.targetDate === selectedDate);
  const evaluation = useMemo(() => detail?.prizeDrawNumbers ? evaluateNeighbor(detail, detail.prizeDrawNumbers) : null, [detail]);
  const corrected = Boolean(detail?.prizeDrawNumbers && results.find(r => r.date === detail.targetDate)?.numbers.some(n => !detail.prizeDrawNumbers!.includes(n)));
  const activePage = Math.min(page, Math.max(0, Math.ceil((current?.plays.length ?? 0) / 10) - 1));
  const download = () => {
    if (!current) return;
    const text = `Super Kino TV ±1 · ${current.targetDate}\n200 jugadas derivadas de Super Kino TV\n\n` + current.plays.map(p => `${String(p.id).padStart(3, "0")}: ${p.numbers.map(n => String(n).padStart(2, "0")).join(" ")}`).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${text}`], { type: "text/plain;charset=utf-8" })), link = document.createElement("a");
    link.href = url; link.download = `super-kino-tv-mas-menos-1-${current.targetDate}.txt`; link.click(); URL.revokeObjectURL(url);
  };
  return <main className="lotoTheme analysisDashboard kinoTheme kinoNeighborTheme">
    <section className="hero"><div><p className="eyebrow">LEIDSA · Cartera paralela</p><h1>Super Kino TV ±1</h1><p>200 jugadas nuevas a partir de Super Kino TV. Cada número se desplaza −1 o +1 y la cartera queda fija antes del sorteo.</p><span className="kinoAlgorithmLabel">Inicio · 18 de noviembre de 2026</span></div><div className="heroPanel"><span className="panelLabel">Evaluación de resultados</span><strong>Solo aciertos exactos</strong><p>Los vecinos no cuentan como ganadores. Esta variante no garantiza mejores resultados.</p></div></section>
    {error ? <div className="card kinoNeighborError" role="alert">{error} <button onClick={() => setReload(n => n + 1)}>Reintentar</button></div> : null}
    <AnalysisWorkspace panels={[
      { id: "resultados", label: "Resultados", description: "Calendario de premios de las carteras ±1 guardadas.", content: <>
        <section className="card kinoWeekAwards"><div className="kinoSectionHead"><div><p className="eyebrow">Lunes a domingo</p><h2>Calendario Super Kino TV ±1</h2></div><div className="kinoWeekNavigation"><button disabled={weekStart <= earliestWeek} onClick={() => setWeekOffset(n => n - 1)}>← Anterior</button><button disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>Actual</button><small>{shortDate(calendar[0].date)} – {shortDate(calendar[6].date)}</small><button disabled={weekOffset === 0} onClick={() => setWeekOffset(n => Math.min(0, n + 1))}>Siguiente →</button></div></div>
          <div className="kinoWeekScroll" tabIndex={0} aria-label="Calendario semanal Super Kino TV ±1; desplaza horizontalmente en pantallas pequeñas"><div className="kinoWeekGrid">{calendar.map(item => <article key={item.date} className={item.date === clock.date ? "today" : ""}><header><strong>{item.day}</strong><span>{shortDate(item.date)}</span></header>{item.snapshot?.prizeSummary ? <><div className="kinoWeekPrizeGroups">{item.snapshot.prizeSummary.groups.length ? item.snapshot.prizeSummary.groups.map(g => <p key={g.hits}><strong>{g.count} {g.count === 1 ? "jugada" : "jugadas"} · {g.hits} aciertos</strong><span>{money(g.amount)} c/u</span></p>) : <p>Sin premios</p>}</div><footer>Total calculado <strong>{money(item.snapshot.prizeSummary.total)}</strong><button className="kinoNeighborDetailButton" onClick={() => setSelected(item.date)}>Ver jugadas</button></footer></> : <p className={`kinoWeekStatus neighborStatus-${item.state.kind}`}>{item.state.label}{item.snapshot ? <small>Cartera guardada · {item.snapshot.plays.length} jugadas</small> : null}</p>}</article>)}</div></div>
          <p className="muted">El 16 y 17 de noviembre no tienen resultados programados para esta variante. El calendario comienza el 18; los premios se registran al llegar el resultado y se conservan después.</p>
        </section>
        <section className="card"><div className="kinoSectionHead"><h2>Detalle del sorteo</h2><label>Fecha <select aria-label="Fecha evaluada de Super Kino TV ±1" disabled={!dates.length} value={selectedDate} onChange={e => setSelected(e.target.value)}>{dates.length ? dates.map(s => <option key={s.targetDate} value={s.targetDate}>{s.targetDate}</option>) : <option value="">Desde el 18 de noviembre</option>}</select></label></div>
          {!detail ? <p>Sin Resultados Programados antes del 18 de noviembre. Las nuevas carteras aparecerán cuando se guarde su origen en Super Kino TV.</p> : !evaluation ? <p>La cartera del {detail.targetDate} tiene 200 jugadas guardadas. Esperando el resultado para calcular premios.</p> : <>
            {corrected ? <p className="kinoPostgameNotice" role="status">La fuente cambió este resultado. Se conserva el resultado congelado usado en esta cartera.</p> : null}
            <Balls numbers={detail.prizeDrawNumbers!} /><div className="kinoPostgameMetrics"><article><span>Máximo exacto</span><strong>{detail.prizeSummary!.maxHits}/10</strong></article><article><span>Jugadas premiadas</span><strong>{detail.prizeSummary!.winningPlays}</strong></article><article><span>Premio calculado</span><strong>{money(detail.prizeSummary!.total)}</strong></article><article><span>Balance modelado</span><strong>{money(detail.prizeSummary!.total - 5000)}</strong></article></div>
            <details><summary>Aciertos y premios por jugada</summary><div className="kinoNeighborPlayGrid">{evaluation.plays.map(p => <article className="kinoNeighborPlay" key={p.id}><strong>#{String(p.id).padStart(3, "0")} · {p.hits} aciertos · {money(p.prize)}</strong><Balls numbers={p.numbers} matches={p.matches} /></article>)}</div></details>
          </>}
        </section>
      </> },
      { id: "jugadas", label: "Jugadas", description: "Las 200 combinaciones ±1 guardadas antes del sorteo.", content: <section className="card"><div className="kinoSectionHead"><div><h2>{current ? `200 jugadas para el ${current.targetDate}` : "Próxima cartera Super Kino TV ±1"}</h2><p>Numeración igual a su cartera de origen · RD$25 por jugada</p></div><button disabled={!current} onClick={download}>Descargar cartera TXT</button></div>
        {!data ? <p>Cargando carteras guardadas…</p> : !current ? <p>Esperando la cartera original del próximo sorteo habilitado. No se reconstruyen fechas cerradas.</p> : <><p className="kinoSaved">Guardadas antes del sorteo. Cada jugada conserva su referencia de Super Kino TV y cambia sus diez números en −1 o +1, sin repetidos ni salida del rango 1–84.</p><div className="kinoNeighborPlayGrid">{current.plays.slice(activePage * 10, activePage * 10 + 10).map(p => <article className="kinoNeighborPlay" key={p.id}><strong>Jugada #{String(p.id).padStart(3, "0")}</strong><Balls numbers={p.numbers} /><details><summary>Ver jugada original</summary><Balls numbers={p.sourceNumbers} /></details></article>)}</div><div className="kinoPortfolioNavigation"><button disabled={activePage === 0} onClick={() => setPage(n => Math.max(0, n - 1))}>← Anteriores</button><span>Jugadas {activePage * 10 + 1}–{Math.min(activePage * 10 + 10, 200)} de 200</span><button disabled={activePage >= 19} onClick={() => setPage(n => Math.min(19, n + 1))}>Siguientes →</button></div><p className="muted">Costo modelado de la cartera completa: RD$5,000. Es una variante independiente; no representa compra ni cobro confirmado.</p></>}
      </section> }
    ]} />
  </main>;
}
