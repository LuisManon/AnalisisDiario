"use client";

import { useEffect, useState } from "react";
import { DashboardClient } from "./DashboardClient";
import { LaPrimeraDashboard } from "./LaPrimeraDashboard";
import { LotekaRepartideraDashboard } from "./LotekaRepartideraDashboard";
import { QuinielaPaleDashboard } from "./QuinielaPaleDashboard";
import type { DrawResult, LaPrimeraDraw, LaPrimeraQuinielaDraw, LotekaRepartideraDraw, QuinielaPaleDraw } from "../lib/types";

type AppShellProps = {
  lotoResults: DrawResult[];
  laPrimeraResults: LaPrimeraDraw[];
  laPrimeraQuinielaResults: LaPrimeraQuinielaDraw[];
  lotekaRepartideraResults: LotekaRepartideraDraw[];
  quinielaPaleResults: QuinielaPaleDraw[];
};

type ActiveTab = "loto" | "quiniela" | "primera" | "loteka";

export function AppShell({ lotoResults, laPrimeraResults, laPrimeraQuinielaResults, lotekaRepartideraResults, quinielaPaleResults }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("loto");

  useEffect(() => {
    const stored = window.localStorage.getItem("activeLotteryTab");
    if (stored === "loto" || stored === "quiniela" || stored === "primera" || stored === "loteka") setActiveTab(stored);
  }, []);

  function changeTab(tab: ActiveTab) {
    setActiveTab(tab);
    window.localStorage.setItem("activeLotteryTab", tab);
  }

  return (
    <div className={`appShell ${activeTab === "primera" ? "primeraShell" : activeTab === "loteka" ? "lotekaShell" : "lotoShell"}`}>
      <nav className="appTabs" aria-label="Secciones de analisis">
        <button className={activeTab === "loto" ? "active" : ""} onClick={() => changeTab("loto")}>
          Loto Mas
        </button>
        <button className={activeTab === "quiniela" ? "active quinielaTab" : "quinielaTab"} onClick={() => changeTab("quiniela")}>
          Quiniela Pale
        </button>
        <button className={activeTab === "primera" ? "active primeraTab" : "primeraTab"} onClick={() => changeTab("primera")}>
          La Primera
        </button>
        <button className={activeTab === "loteka" ? "active lotekaTab" : "lotekaTab"} onClick={() => changeTab("loteka")}>
          Loteka
        </button>
      </nav>
      {activeTab === "loto" ? (
        <DashboardClient initialData={{ results: lotoResults }} />
      ) : activeTab === "quiniela" ? (
        <QuinielaPaleDashboard initialData={{ results: quinielaPaleResults }} />
      ) : activeTab === "primera" ? (
        <LaPrimeraDashboard initialData={{ results: laPrimeraResults, quinielaResults: laPrimeraQuinielaResults }} />
      ) : (
        <LotekaRepartideraDashboard initialData={{ results: lotekaRepartideraResults }} />
      )}
    </div>
  );
}
