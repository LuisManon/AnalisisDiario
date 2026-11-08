"use client";

import { useState } from "react";
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

  function changeTab(tab: ActiveTab) {
    setActiveTab(tab);
  }

  return (
    <div className={`appShell ${activeTab === "quinielon" ? "primeraShell" : "lotoShell"}`}>
      <nav className="appTabs" aria-label="Secciones de analisis">
        <button aria-pressed={activeTab === "kino"} className={activeTab === "kino" ? "active" : ""} onClick={() => changeTab("kino")}>Super Kino TV</button>
        <button aria-pressed={activeTab === "quinielon"} className={activeTab === "quinielon" ? "active" : ""} onClick={() => changeTab("quinielon")}>El Quinielón 2.0</button>
        <button aria-pressed={activeTab === "loto"} className={activeTab === "loto" ? "active" : ""} onClick={() => changeTab("loto")}>Loto Más</button>
      </nav>
      {activeTab === "kino" ? (
        <SuperKinoDashboard initialResults={kinoResults} />
      ) : activeTab === "loto" ? (
        <DashboardClient initialData={{ results: lotoResults }} />
      ) : (
        <LaPrimeraDashboard initialData={{ results: laPrimeraResults, quinielaResults: [], loto5Results: [] }} />
      )}
    </div>
  );
}
