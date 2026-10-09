"use client";

import { useEffect, useState } from "react";
import { SuperKinoDashboard } from "./SuperKinoDashboard";
import type { KinoDraw } from "../lib/super-kino";
import { DashboardClient } from "./DashboardClient";
import { LaPrimeraDashboard } from "./LaPrimeraDashboard";
import { LotekaRepartideraDashboard } from "./LotekaRepartideraDashboard";
import { QuinielaPaleDashboard } from "./QuinielaPaleDashboard";
import type { DrawResult, LaPrimeraDraw, LaPrimeraLoto5Draw, LaPrimeraQuinielaDraw, LotekaRepartideraDraw, QuinielaPaleDraw } from "../lib/types";

type AppShellProps = {
  kinoResults: KinoDraw[];
  lotoResults: DrawResult[];
  laPrimeraResults: LaPrimeraDraw[];
  laPrimeraQuinielaResults: LaPrimeraQuinielaDraw[];
  laPrimeraLoto5Results: LaPrimeraLoto5Draw[];
  lotekaRepartideraResults: LotekaRepartideraDraw[];
  quinielaPaleResults: QuinielaPaleDraw[];
};

type ActiveTab = "kino" | "loto" | "quiniela" | "primera" | "loteka";

export function AppShell({ kinoResults, lotoResults, laPrimeraResults, laPrimeraQuinielaResults, laPrimeraLoto5Results, lotekaRepartideraResults, quinielaPaleResults }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("kino");

  useEffect(() => {
    let running = false;
    const ensureNextQuinielonAssignment = async () => {
      if (running) return;
      running = true;
      try {
        await fetch("/api/quinielon/distributor", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({session: "auto"})});
      } catch {
        // The Quinielón screen exposes retry details if preparation fails.
      } finally {
        running = false;
      }
    };
    void ensureNextQuinielonAssignment();
    const timer = window.setInterval(() => void ensureNextQuinielonAssignment(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function changeTab(tab: ActiveTab) {
    setActiveTab(tab);
  }

  return (
    <div className={`appShell ${activeTab === "primera" ? "primeraShell" : activeTab === "loteka" ? "lotekaShell" : "lotoShell"}`}>
      <nav className="appTabs" aria-label="Secciones de analisis">
        <button className={activeTab === "kino" || activeTab === "loto" || activeTab === "quiniela" ? "active leidsaTab" : "leidsaTab"} onClick={() => changeTab("kino")}>LEIDSA</button>
        <button className={activeTab === "primera" ? "active primeraTab" : "primeraTab"} onClick={() => changeTab("primera")}>La Primera</button>
        <button className={activeTab === "loteka" ? "active lotekaTab" : "lotekaTab"} onClick={() => changeTab("loteka")}>
          Loteka
        </button>
      </nav>
      {activeTab === "kino" || activeTab === "loto" || activeTab === "quiniela" ? (
        <nav className="leidsaProductSwitch" aria-label="Producto de LEIDSA">
          <button className={activeTab === "kino" ? "active" : ""} onClick={() => changeTab("kino")}>Super Kino TV</button>
          <button className={activeTab === "loto" ? "active" : ""} onClick={() => changeTab("loto")}>Loto Más</button>
          <button className={activeTab === "quiniela" ? "active" : ""} onClick={() => changeTab("quiniela")}>Quiniela Palé</button>
        </nav>
      ) : null}
      {activeTab === "kino" ? (
        <SuperKinoDashboard initialResults={kinoResults} />
      ) : activeTab === "loto" ? (
        <DashboardClient initialData={{ results: lotoResults }} />
      ) : activeTab === "quiniela" ? (
        <QuinielaPaleDashboard initialData={{ results: quinielaPaleResults }} />
      ) : activeTab === "primera" ? (
        <LaPrimeraDashboard initialData={{ results: laPrimeraResults, quinielaResults: laPrimeraQuinielaResults, loto5Results: laPrimeraLoto5Results }} />
      ) : (
        <LotekaRepartideraDashboard initialData={{ results: lotekaRepartideraResults }} />
      )}
    </div>
  );
}
