"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { selectedAssignmentSlot, type AssignmentSessionChoice, type Assignment, type AssignmentNumber } from "../lib/quinielon-distributor";

const investorNames = ["Lenin", "Willy", "Victor", "Jose Luis"] as const;

type Props = { renderNumber: (number: number, source: AssignmentNumber["source"], badge: string, winner: boolean, session: Assignment["session"]) => ReactNode };
export function NumberDistributor({renderNumber}: Props) {
  const [assignment,setAssignment] = useState<Assignment|null>(null);
  const [sessionChoice,setSessionChoice] = useState<AssignmentSessionChoice>("auto");
  const [showSymbols,setShowSymbols] = useState(true);
  const choiceRef = useRef<AssignmentSessionChoice>("auto");
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState("");
  const [copied,setCopied] = useState("");
  const [fallback,setFallback] = useState("");
  const sequence = useRef(0);
  const slotRef = useRef("");
  async function load(smart?:boolean) {
    const id=++sequence.current; setBusy(true);setError("");setCopied("");setFallback("");
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
      for(const source of ["casa","respaldo"] as const) {const items=numbers.filter(n=>n.source===source);if(items.length) {lines.push(`_${source === "casa" ? "Casa" : "Respaldo"}_`);for(let j=0;j<items.length;j+=10) lines.push(items.slice(j,j+10).map(n=>String(n.number).padStart(2,"0")).join(" · "));}}
      if(!numbers.length)lines.push("Sin números disponibles");lines.push("");
    });return lines.join("\n").trim();
  }
  async function share(investor?:number) {const value=text(investor);try {await navigator.clipboard.writeText(value);setCopied(investor===undefined ? "Reparto copiado para WhatsApp." : `${investorNames[investor]} copiado.`);setFallback("");}catch {setFallback(value);setCopied("Selecciona y copia el texto para WhatsApp.");}}
  const role=(numbers:AssignmentNumber[])=>{const casa=numbers.filter(n=>n.source==="casa").length;return casa===numbers.length&&casa ? "Casa · fuertes" : casa===0 ? "Respaldo" : `${casa} Casa · ${numbers.length-casa} Respaldo`;};
  return <section className={`card distributor${showSymbols ? "" : " hideNumberSymbols"}`} aria-label="Asignador de números por tanda" aria-busy={busy}>
    <header className="distributorHeader"><div><span className="panelLabel">Asignador por tanda</span><h2>Cuatro inversionistas</h2><p>{assignment ? `${assignment.date.split("-").reverse().join("-")} · ${assignment.session === "dia" ? "Día · 12:00 PM" : "Noche · 7:00 PM"}` : "Preparando la próxima tanda…"}</p></div><button type="button" disabled={!assignment||busy||Boolean(error)} onClick={()=>void share()}>Compartir · Copiar WhatsApp</button></header>
    <div className="distributorControls">
      <label className="distributorSession">Tanda <select aria-label="Tanda del asignador" value={sessionChoice} onChange={e=>changeSession(e.target.value as AssignmentSessionChoice)}><option value="auto">Automática · próxima tanda</option><option value="dia">Día · próximo sorteo</option><option value="noche">Noche · próximo sorteo</option></select></label>
      <div className="v2SymbolControls"><label><input type="checkbox" role="switch" checked={showSymbols} onChange={e=>setShowSymbols(e.target.checked)} /> Mostrar símbolos y detalles del asignador</label></div>
    </div>
    <div className="v2SymbolControls"><label><input type="checkbox" role="switch" checked={assignment?.smart??false} disabled={busy} onChange={e=>void load(e.target.checked)} /> Repartidor inteligente</label><small>{assignment?.smart ? `${assignment.excluded} con cristal o hielo excluidos · reparto equilibrado` : "Bloques completos: 1–20 → 41–60 → 21–40 → 61–80 · cambia cada tanda"}</small></div>
    {busy ? <p role="status">Guardando el reparto de la tanda…</p> : null}
    {error ? <p role="alert" className="distributorError">{error} <button type="button" onClick={()=>void load()}>Reintentar</button>{!assignment?.smart ? <button type="button" onClick={()=>void load(true)}>Usar reparto inteligente</button> : null}</p> : null}
    {assignment ? <><div className="distributorGrid">{assignment.investors.map((numbers,i)=><article className={`distributorInvestor distributorInvestor-${assignment.session}`} key={i}><header><div><h3>{investorNames[i]}</h3>{showSymbols && assignment.blockStarts ? <p className="distributorBlockLabel">Puestos {assignment.blockStarts[i]}–{assignment.blockStarts[i]+19}</p> : null}{showSymbols ? <small>{assignment.session === "dia" ? "Día" : "Noche"} · {role(numbers)} · {numbers.length} números</small> : null}</div><button type="button" aria-label={`Copiar jugadas de ${investorNames[i]}`} disabled={busy||Boolean(error)} onClick={()=>void share(i)}>Copiar</button></header><div className="distributorNumbers">{numbers.map(n=><span key={n.number}>{renderNumber(n.number,n.source,n.badge,n.winner,assignment.session)}</span>)}</div>{!numbers.length?<p>Sin números disponibles.</p>:null}</article>)}</div><p className="distributorNote">Reparto guardado por tanda. {sessionChoice === "auto" ? "Cambio automático a las 12:00 PM y 7:00 PM (hora dominicana)." : "Mostrando el próximo sorteo de la tanda seleccionada."} {!assignment.smart ? "Cada inversionista rota de bloque en cada tanda. Los números pueden coincidir si cambian de posición entre los rankings de Día y Noche." : assignment.priorCount===2 ? "Sin repetir números por inversionista de las dos tandas anteriores." : `Comprobado contra ${assignment.priorCount} tandas guardadas; las asignaciones manuales anteriores no están registradas.`}</p></> : null}
    <p role="status" className="distributorNote">{copied}</p>{fallback?<textarea aria-label="Texto para copiar a WhatsApp" readOnly value={fallback} onFocus={e=>e.target.select()} rows={8}/>:null}
  </section>;
}
