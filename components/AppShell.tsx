"use client";

import { useEffect, useState } from "react";
import { DashboardClient } from "./DashboardClient";
import { LaPrimeraDashboard } from "./LaPrimeraDashboard";
import { LotekaRepartideraDashboard } from "./LotekaRepartideraDashboard";
import type { DrawResult, LaPrimeraDraw, LotekaRepartideraDraw } from "../lib/types";

type AppShellProps = {
  lotoResults: DrawResult[];
  laPrimeraResults: LaPrimeraDraw[];
  lotekaRepartideraResults: LotekaRepartideraDraw[];
};

type ActiveTab = "loto" | "primera" | "loteka";

export function AppShell({ lotoResults, laPrimeraResults, lotekaRepartideraResults }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("loto");

  useEffect(() => {
    const stored = window.localStorage.getItem("activeLotteryTab");
    if (stored === "loto" || stored === "primera" || stored === "loteka") setActiveTab(stored);
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
        <button className={activeTab === "primera" ? "active primeraTab" : "primeraTab"} onClick={() => changeTab("primera")}>
          La Primera
        </button>
        <button className={activeTab === "loteka" ? "active lotekaTab" : "lotekaTab"} onClick={() => changeTab("loteka")}>
          Loteka
        </button>
      </nav>
      {activeTab === "loto" ? (
        <DashboardClient initialData={{ results: lotoResults }} />
      ) : activeTab === "primera" ? (
        <LaPrimeraDashboard initialData={{ results: laPrimeraResults }} />
      ) : (
        <LotekaRepartideraDashboard initialData={{ results: lotekaRepartideraResults }} />
      )}
    </div>
  );
}
