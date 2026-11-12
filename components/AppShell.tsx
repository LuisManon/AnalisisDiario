"use client";

import { useRef, useState } from "react";
import { WorkspaceNavigationTarget } from "./WorkspaceNavigation";
import { PwaRuntime } from "./PwaRuntime";
import { SuperKinoDashboard } from "./SuperKinoDashboard";
import type { KinoDraw } from "../lib/super-kino";
import { DashboardClient } from "./DashboardClient";
import { LaPrimeraDashboard } from "./LaPrimeraDashboard";
import type { DrawResult, LaPrimeraDraw } from "../lib/types";

type AppShellProps = {
  kinoResults: KinoDraw[];
  lotoResults: DrawResult[];
  laPrimeraResults: LaPrimeraDraw[];
};

type ActiveTab = "kino" | "quinielon" | "loto";

export function AppShell({ kinoResults, lotoResults, laPrimeraResults }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("kino");

  const [navigationTarget, setNavigationTarget] = useState<HTMLDivElement | null>(null);
  const workspace = useRef<HTMLDivElement>(null);

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
      <nav className="appTabs" aria-label="Secciones de analisis">
        <button aria-pressed={activeTab === "kino"} className={activeTab === "kino" ? "active" : ""} onClick={() => changeTab("kino")}><span className="appTabIcon" aria-hidden="true">◎</span><span>Super Kino TV</span></button>
        <button aria-pressed={activeTab === "quinielon"} className={activeTab === "quinielon" ? "active" : ""} onClick={() => changeTab("quinielon")}><span className="appTabIcon" aria-hidden="true">▦</span><span>El Quinielón 2.0</span></button>
        <button aria-pressed={activeTab === "loto"} className={activeTab === "loto" ? "active" : ""} onClick={() => changeTab("loto")}><span className="appTabIcon" aria-hidden="true">✦</span><span>Loto Más</span></button>
      </nav>
      <div className="appWorkspace" ref={workspace} id="app-workspace" tabIndex={-1}>
      {activeTab === "kino" ? (
        <SuperKinoDashboard initialResults={kinoResults} />
      ) : activeTab === "loto" ? (
        <DashboardClient initialData={{ results: lotoResults }} />
      ) : (
        <LaPrimeraDashboard initialData={{ results: laPrimeraResults }} />
      )}
      </div>
      <div className="mobileWorkspaceNavigation" ref={setNavigationTarget} />
    </div>
    </WorkspaceNavigationTarget.Provider>
  );
}
