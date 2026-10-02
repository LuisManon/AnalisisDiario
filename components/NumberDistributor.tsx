"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { historicalWager, assignmentInvestment, tierLabels, formatInvestment, investorNames, selectedAssignmentSlot, type AssignmentSessionChoice, type Assignment, type AssignmentNumber } from "../lib/quinielon-distributor";


type Props = { renderNumber: (number: number, source: AssignmentNumber["source"], badge: string, winner: boolean, session: Assignment["session"]) => ReactNode };
function wagerGroups(numbers: AssignmentNumber[]) {
  const groups = new Map<string, { tier: AssignmentNumber["tier"]; amount: number | undefined; numbers: AssignmentNumber[] }>();
  for (const number of numbers) {
    const key = `${number.tier ?? "unknown"}-${number.betAmount ?? "unknown"}`;
    if (!groups.has(key)) groups.set(key, {tier: number.tier, amount: number.betAmount, numbers: []});
    groups.get(key)!.numbers.push(number);
  }
  const order = {hot: 0, intermediate: 1, remaining: 2};
  return [...groups.values()].sort((a,b) => (a.tier ? order[a.tier] : 3) - (b.tier ? order[b.tier] : 3));
}

function SmartInvestorNumbers({numbers, assignment, showGroupColors}: {numbers: AssignmentNumber[]; assignment: Assignment; showGroupColors: boolean}) {
  const groups = wagerGroups(numbers);
  return <>
    <div className="distributorWagerGroups">
      {groups.map(group => <section className="distributorWagerGroup" key={`${group.tier}-${group.amount}`} aria-label={`${group.tier ? tierLabels[group.tier] : "Números"}: ${group.amount === undefined ? "sin apuesta registrada" : `${formatInvestment(group.amount)} por número`}`}>
        <header><span>{group.tier ? tierLabels[group.tier] : "Números"}</span><strong>{group.amount === undefined ? "Sin apuesta" : <>{formatInvestment(group.amount)} <small>por número</small></>}</strong></header>
        <div className="distributorBetNumbers">{group.numbers.map(item => <span key={item.number} className={showGroupColors ? `distributorSourceBall distributorSourceBall-${item.source}` : undefined} title={showGroupColors ? (item.source === "casa" ? "Casa · top 40" : "Respaldo") : undefined} aria-label={`Número ${String(item.number).padStart(2,"0")} · ${item.source === "casa" ? "Casa, top 40" : "Respaldo"}: ${item.betAmount === undefined ? "sin apuesta registrada" : formatInvestment(item.betAmount)}`}>{String(item.number).padStart(2,"0")}</span>)}</div>
      </section>)}
    </div>
    {groups.some(group => historicalWager(group.numbers[0],assignment)) ? <details className="distributorPrizes"><summary>Ver premios potenciales</summary>{groups.map(group => {
      const wager = historicalWager(group.numbers[0],assignment);
      return wager ? <p key={`${group.tier}-${group.amount}`}>{group.tier ? tierLabels[group.tier] : "Número"} · apuesta {formatInvestment(wager.betAmount)} → premio {formatInvestment(wager.potentialPrize)}</p> : null;
    })}</details> : null}
  </>;
}

export function NumberDistributor({renderNumber}: Props) {
  const [assignment,setAssignment] = useState<Assignment|null>(null);
  const [sessionChoice,setSessionChoice] = useState<AssignmentSessionChoice>("auto");
  const [showSymbols,setShowSymbols] = useState(true);
  const [showGroupColors,setShowGroupColors] = useState(false);
  const choiceRef = useRef<AssignmentSessionChoice>("auto");
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState("");
  const [copyFeedback,setCopyFeedback] = useState<{target: number | "all"; state: "pending" | "success" | "error"; message: string} | null>(null);
  const copySequence = useRef(0);
  const fallbackInput = useRef<HTMLTextAreaElement>(null);
  const [fallback,setFallback] = useState("");
  const sequence = useRef(0);
  const slotRef = useRef("");
  async function load(smart?:boolean) {
    const id=++sequence.current; setBusy(true);setError("");setCopyFeedback(null);copySequence.current++;setFallback("");
    try {
      const response=await fetch("/api/quinielon/distributor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session:choiceRef.current, ...(smart === undefined ? {} : {smart})})});
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el reparto.");
      if (id===sequence.current) {setAssignment(data);slotRef.current=`${data.date}-${data.session}`;}
    } catch(e) {if(id===sequence.current) setError(e instanceof Error ? e.message : "No se pudo cargar el reparto.");}
    finally {if(id===sequence.current) setBusy(false);}
  }
  useEffect(() => {
    void load();
    const timer=window.setInterval(()=>{const slot=selectedAssignmentSlot(choiceRef.current); const key=`${slot.date}-${slot.session}`;if(slotRef.current && slotRef.current!==key) {slotRef.current=key;setAssignment(null);void load();}},30_000);
    return ()=>{window.clearInterval(timer);sequence.current++;};
  },[]);
  useEffect(() => {
    if (copyFeedback?.state !== "success") return;
    const timer = window.setTimeout(() => setCopyFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);
  useEffect(() => {
    if (fallback) { fallbackInput.current?.focus(); fallbackInput.current?.select(); }
  }, [fallback]);
  const allocationWarning = assignment?.allocationWarning?.startsWith("Se ajustó la selección por los bloqueos históricos:") ? undefined : assignment?.allocationWarning;
  function changeSession(value: AssignmentSessionChoice) {
    choiceRef.current=value;
    setSessionChoice(value);
    setAssignment(null);
    slotRef.current="";
    void load();
  }
  function text(investor?:number) {
    if(!assignment) return "";
    const [y,m,d]=assignment.date.split("-");
    const lines=[`*El Quinielón 2.0*`, `*${d}/${m}/${y} · ${assignment.session === "dia" ? "Día · 12:00 PM" : "Noche · 7:00 PM"}*`,assignment.smart ? "Repartidor inteligente" : "Reparto Casa / Respaldo",""];
    assignment.investors.forEach((numbers,i)=>{
      if(investor !== undefined && i!==investor)return;
      lines.push(`*${investorNames[i]} · ${numbers.length} números*`);
      if (assignment.blockStarts) lines.push(`Puestos ${assignment.blockStarts[i]}–${assignment.blockStarts[i]+19}`);
      if (assignment.smart) {
        for (const group of wagerGroups(numbers)) {
          lines.push(group.amount === undefined ? "Sin apuesta registrada:" : `*${formatInvestment(group.amount)} a CADA número:*`);
          lines.push(group.numbers.map(n=>String(n.number).padStart(2,"0")).join(" · "));
        }
        const total = assignmentInvestment(numbers);
        lines.push(total === null ? "Sin inversión registrada" : `*Inversión total: ${formatInvestment(total)}*`);
      } else {
        for (const source of ["casa","respaldo"] as const) {
          const items=numbers.filter(n=>n.source===source);
          if (items.length) {
            lines.push(`_${source === "casa" ? "Casa" : "Respaldo"}_`);
            for (let j=0;j<items.length;j+=10) lines.push(items.slice(j,j+10).map(n=>String(n.number).padStart(2,"0")).join(" · "));
          }
        }
      }
      if(!numbers.length)lines.push("Sin números disponibles");lines.push("");
    });
    const total = assignmentInvestment(assignment.investors.flat());
    if (investor === undefined && total !== null) lines.push(`Inversión general: ${formatInvestment(total)}`);
    if (allocationWarning) lines.push(allocationWarning);
    return lines.join("\n").trim();
  }
  async function share(investor?:number) {
    if (!assignment || busy || error) return;
    const id = ++copySequence.current;
    const target = investor ?? "all";
    const value = text(investor);
    setFallback("");
    setCopyFeedback({target, state: "pending", message: "Copiando jugadas…"});
    try {
      await navigator.clipboard.writeText(value);
      if (id !== copySequence.current) return;
      setCopyFeedback({target, state: "success", message: investor === undefined ? "✓ Reparto copiado. Listo para pegar en WhatsApp." : `✓ Jugadas de ${investorNames[investor]} copiadas.`});
    } catch {
      if (id !== copySequence.current) return;
      setFallback(value);
      setCopyFeedback({target, state: "error", message: "No se pudo copiar automáticamente. Selecciona y copia este texto."});
    }
  }
  function copyLabel(target: number | "all", label: string) {
    if (copyFeedback?.target !== target) return label;
    return copyFeedback.state === "pending" ? "Copiando…" : copyFeedback.state === "success" ? "✓ Copiado" : "Reintentar";
  }

  const role=(numbers:AssignmentNumber[])=>{const casa=numbers.filter(n=>n.source==="casa").length;return casa===numbers.length&&casa ? "Casa · fuertes" : casa===0 ? "Respaldo" : `${casa} Casa · ${numbers.length-casa} Respaldo`;};
  return <section className={`card distributor${assignment?.smart ? " distributorCompact" : ""}${showSymbols ? "" : " hideNumberSymbols"}`} aria-label="Asignador de números por tanda" aria-busy={busy}>
    <header className="distributorHeader"><div><span className="panelLabel">Asignador por tanda</span><h2>Cuatro inversionistas</h2><p>{assignment ? `${assignment.date.split("-").reverse().join("-")} · ${assignment.session === "dia" ? "Día · 12:00 PM" : "Noche · 7:00 PM"}` : "Preparando la próxima tanda…"}</p></div><button type="button" disabled={!assignment||busy||Boolean(error)||copyFeedback?.state === "pending"} onClick={()=>void share()}>{copyLabel("all", "Compartir · Copiar WhatsApp")}</button></header>
    <div className="distributorControls">
      <label className="distributorSession">Tanda <select aria-label="Tanda del asignador" value={sessionChoice} onChange={e=>changeSession(e.target.value as AssignmentSessionChoice)}><option value="auto">Automática · próxima tanda</option><option value="dia">Día · próximo sorteo</option><option value="noche">Noche · próximo sorteo</option></select></label>
      {assignment?.smart ? <div className="v2SymbolControls"><label><input type="checkbox" role="switch" checked={showGroupColors} onChange={e=>setShowGroupColors(e.target.checked)} /> Colores de Casa / Respaldo</label>{showGroupColors ? <small className="distributorSourceLegend"><span><i className="distributorSourceBall-casa" /> Casa · top 40</span><span><i className="distributorSourceBall-respaldo" /> Respaldo</span></small> : null}</div> : null}
      {!assignment?.smart ? <div className="v2SymbolControls"><label><input type="checkbox" role="switch" checked={showSymbols} onChange={e=>setShowSymbols(e.target.checked)} /> Mostrar símbolos y detalles del asignador</label></div> : null}
    </div>
    <div className="v2SymbolControls"><label><input type="checkbox" role="switch" checked={assignment?.smart??false} disabled={busy} onChange={e=>void load(e.target.checked)} /> Repartidor inteligente</label><small>{assignment?.smart ? `${assignment.excluded} con cristal o hielo excluidos · reparto equilibrado` : "Bloques completos: 1–20 → 41–60 → 21–40 → 61–80 · cambia cada tanda"}</small></div>
    {busy ? <p role="status">Guardando el reparto de la tanda…</p> : null}
    {error ? <p role="alert" className="distributorError">{error} <button type="button" onClick={()=>void load()}>Reintentar</button>{!assignment?.smart ? <button type="button" onClick={()=>void load(true)}>Usar reparto inteligente</button> : null}</p> : null}
    {assignment ? <>
      {allocationWarning ? <p role="status" className="distributorNote">{allocationWarning}</p> : null}
      {assignment.smart ? <p className="distributorInstruction">Apuesta el monto indicado a <strong>cada número</strong> de su grupo. Los 4 calientes son de Casa (top 40).</p> : null}
      <div className="distributorGrid">{assignment.investors.map((numbers,i)=>{
        const total = assignmentInvestment(numbers);
        return <article className={`distributorInvestor distributorInvestor-${assignment.session}`} key={i}>
          <header>
            <div><h3>{investorNames[i]}</h3>
              {assignment.smart ? <small>{numbers.length} números · {assignment.session === "dia" ? "Día" : "Noche"}</small> : <>
                {showSymbols && assignment.blockStarts ? <p className="distributorBlockLabel">Puestos {assignment.blockStarts[i]}–{assignment.blockStarts[i]+19}</p> : null}
                {showSymbols ? <small>{assignment.session === "dia" ? "Día" : "Noche"} · {role(numbers)} · {numbers.length} números</small> : null}
              </>}
            </div>
            {assignment.smart ? <div className="distributorInvestorTotal"><small>Inversión</small><strong>{total === null ? "Sin registrar" : formatInvestment(total)}</strong></div> : null}
            <button type="button" aria-label={`Copiar jugadas de ${investorNames[i]}`} disabled={busy||Boolean(error)||copyFeedback?.state === "pending"} onClick={()=>void share(i)}>{copyLabel(i,"Copiar")}</button>
          </header>
          {assignment.smart ? <SmartInvestorNumbers numbers={numbers} assignment={assignment} showGroupColors={showGroupColors} /> : <div className="distributorNumbers">{numbers.map(n=><span key={n.number}>{renderNumber(n.number,n.source,n.badge,n.winner,assignment.session)}</span>)}</div>}
          {!numbers.length ? <p>Sin números disponibles.</p> : null}
        </article>;
      })}</div>
      {assignment.smart ? <p className="distributorGrandTotal"><span>Inversión de los 4 inversionistas</span><strong>{assignmentInvestment(assignment.investors.flat()) === null ? "Sin registrar" : formatInvestment(assignmentInvestment(assignment.investors.flat())!)}</strong></p> : null}
      <p className="distributorNote">Reparto guardado por tanda. {sessionChoice === "auto" ? "Cambio automático a las 12:00 PM y 7:00 PM (hora dominicana)." : "Mostrando el próximo sorteo de la tanda seleccionada."} {!assignment.smart ? "Cada inversionista rota de bloque en cada tanda. Los números pueden coincidir si cambian de posición entre los rankings de Día y Noche." : assignment.priorCount===2 ? "Sin repetir números por inversionista de las dos tandas anteriores." : `Comprobado contra ${assignment.priorCount} tandas guardadas; las asignaciones manuales anteriores no están registradas.`}</p>
    </> : null}
    {copyFeedback ? createPortal(<aside className={`distributorCopyNotice ${copyFeedback.state}`} aria-label="Estado de copia"><p role="status" aria-live="polite" aria-atomic="true">{copyFeedback.message}</p>{fallback ? <><textarea ref={fallbackInput} aria-label="Texto para copiar a WhatsApp" readOnly value={fallback} onFocus={e=>e.target.select()} rows={6}/><button type="button" onClick={()=>{setFallback("");setCopyFeedback(null);}}>Cerrar</button></> : null}</aside>, document.body) : null}
  </section>;
}
