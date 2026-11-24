"use client";

import { useEffect, useRef, useState } from "react";
import { WorkspaceNavigationTarget } from "./WorkspaceNavigation";
import { PwaRuntime } from "./PwaRuntime";
import { SuperKinoDashboard } from "./SuperKinoDashboard";
import { SuperKinoNeighborDashboard } from "./SuperKinoNeighborDashboard";
import type { KinoDraw } from "../lib/super-kino";
import { DashboardClient } from "./DashboardClient";
import { LaPrimeraDashboard } from "./LaPrimeraDashboard";
import type { DrawResult, LaPrimeraDraw } from "../lib/types";

type ActiveTab = "kino" | "kino-neighbor" | "quinielon" | "loto";

export function AppShell() {
  const [saved, setSaved] = useState<{ kino?: KinoDraw[]; loto?: DrawResult[]; quinielon?: LaPrimeraDraw[] }>({});
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("kino");

  const [navigationTarget, setNavigationTarget] = useState<HTMLDivElement | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const product = activeTab === "kino-neighbor" ? "kino" : activeTab;
  const ready = saved[product] !== undefined;
  useEffect(() => {
    if (ready) return;
    const controller = new AbortController();
    setLoadError("");
    fetch(`/api/results?product=${product}`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.results)) throw new Error("No se pudieron cargar los resultados guardados.");
        if (!controller.signal.aborted) setSaved(previous => ({ ...previous, [product]: payload.results }));
      }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); });
    return () => controller.abort();
  }, [product, ready, retry]);


  function changeTab(tab: ActiveTab) {
    setActiveTab(tab);
    workspace.current?.scrollTo({ top: 0 });
  }

  return (
    <WorkspaceNavigationTarget.Provider value={navigationTarget}>
    <div className={`appShell ${activeTab === "quinielon" ? "primeraShell" : "lotoShell"}`}>
      <PwaRuntime />
      <header className="mobileAppHeader">
        <strong>Análisis Diario</strong>
        <button type="button" onClick={() => workspace.current?.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Ir al inicio de la sección">Inicio ↑</button>
      </header>
      <nav className="appTabs hasKinoNeighbor" aria-label="Secciones de analisis">
        <button aria-pressed={activeTab === "kino"} className={activeTab === "kino" ? "active" : ""} onClick={() => changeTab("kino")}><span className="appTabIcon" aria-hidden="true">◎</span><span>Super Kino TV</span></button>
        <button aria-pressed={activeTab === "kino-neighbor"} className={activeTab === "kino-neighbor" ? "active" : ""} onClick={() => changeTab("kino-neighbor")}><span className="appTabIcon" aria-hidden="true">±1</span><span>Super Kino TV ±1</span></button>
        <button aria-pressed={activeTab === "quinielon"} className={activeTab === "quinielon" ? "active" : ""} onClick={() => changeTab("quinielon")}><span className="appTabIcon" aria-hidden="true">▦</span><span>El Quinielón 2.0</span></button>
        <button aria-pressed={activeTab === "loto"} className={activeTab === "loto" ? "active" : ""} onClick={() => changeTab("loto")}><span className="appTabIcon" aria-hidden="true">✦</span><span>Loto Más</span></button>
      </nav>
      <div className="appWorkspace" ref={workspace} id="app-workspace" tabIndex={-1}>
      {!ready ? <section className="card" role="status">{loadError ? <>{loadError} <button onClick={() => setRetry(n => n + 1)}>Reintentar</button></> : "Cargando resultados guardados…"}</section> : activeTab === "kino" ? (
        <SuperKinoDashboard initialResults={saved.kino!} />
      ) : activeTab === "kino-neighbor" ? (
        <SuperKinoNeighborDashboard initialResults={saved.kino!} />
      ) : activeTab === "loto" ? (
        <DashboardClient initialData={{ results: saved.loto! }} />
      ) : (
        <LaPrimeraDashboard initialData={{ results: saved.quinielon! }} />
      )}
      </div>
      <div className="mobileWorkspaceNavigation" ref={setNavigationTarget} />
    </div>
    </WorkspaceNavigationTarget.Provider>
  );
}
