"use client";

import { useContext, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WorkspaceNavigationTarget } from "./WorkspaceNavigation";
import { orderAnalysisPanels } from "../lib/analysis-navigation";

type AnalysisPanel = {
  id: string;
  label: string;
  description: string;
  content: ReactNode;
};

function subscribeMobile(listener: () => void) {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

const workspaceIcons: Record<string, string> = {
  resultados: "M4 20V12h4v8M10 20V4h4v16M16 20V8h4v12",
  analizar: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM16 16l5 5",
  jugadas: "M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8",
  reparto: "M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z",
  historial: "M3 11a9 9 0 1 1 3 8M3 4v7h7M12 7v5l3 2",
};

/** Panels stay mounted so filters, pagination and saved portfolio state survive navigation. */
export function AnalysisWorkspace({ panels: suppliedPanels }: { panels: AnalysisPanel[] }) {
  const panels = orderAnalysisPanels(suppliedPanels);
  const instance = useId();
  const target = useContext(WorkspaceNavigationTarget);
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia("(max-width: 760px)").matches, () => false);
  const workspace = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(panels[0].id);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const active = panels.find((panel) => panel.id === selected) ?? panels[0];

  function selectPanel(id: string) {
    setSelected(id);
    if (mobile) requestAnimationFrame(() => workspace.current?.scrollIntoView({ block: "start" }));
  }

  const navigation = <div className="analysisWorkspaceTabs" role="tablist" aria-label="Áreas de análisis">
      {panels.map((panel, index) => <button
        ref={(element) => { buttons.current[index] = element; }}
        type="button"
        role="tab"
        key={panel.id}
        id={`${instance}-tab-${panel.id}`}
        aria-controls={`${instance}-panel-${panel.id}`}
        aria-selected={active.id === panel.id}
        tabIndex={active.id === panel.id ? 0 : -1}
        onClick={() => selectPanel(panel.id)}
        onKeyDown={(event) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % panels.length;
          else if (event.key === "ArrowLeft") next = (index - 1 + panels.length) % panels.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = panels.length - 1;
          else return;
          event.preventDefault();
          selectPanel(panels[next].id);
          buttons.current[next]?.focus();
        }}
      ><svg className="analysisWorkspaceIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={workspaceIcons[panel.id] ?? workspaceIcons.analizar} /></svg><span className="analysisWorkspaceIndex" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="analysisWorkspaceTabLabel">{panel.label}<small aria-hidden="true">{{resultados:"Resumen de sorteos",analizar:"Cobertura y datos",jugadas:"Carteras guardadas",reparto:"Asignaciones",historial:"Sorteos anteriores"}[panel.id]}</small></span></button>)}
    </div>;

  return <div className="analysisWorkspace" ref={workspace}>
    <div className="analysisWorkspaceIntro"><span>Área de trabajo</span><small>Consulta, compara y profundiza.</small></div>
    {mobile && target ? createPortal(navigation, target) : navigation}
    {panels.map((panel) => <div
      className="analysisPanel"
      role="tabpanel"
      key={panel.id}
      id={`${instance}-panel-${panel.id}`}
      aria-labelledby={`${instance}-tab-${panel.id}`}
      hidden={active.id !== panel.id}
      tabIndex={0}
    >
      <header className="analysisPanelHeading"><span>{panel.label}</span><p className="analysisPanelDescription">{panel.description}</p></header>
      {panel.content}
    </div>)}
  </div>;
}
