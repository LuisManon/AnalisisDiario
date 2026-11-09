"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { orderAnalysisPanels } from "../lib/analysis-navigation";

type AnalysisPanel = {
  id: string;
  label: string;
  description: string;
  content: ReactNode;
};

/** Panels stay mounted so filters, pagination and saved portfolio state survive navigation. */
export function AnalysisWorkspace({ panels: suppliedPanels }: { panels: AnalysisPanel[] }) {
  const panels = orderAnalysisPanels(suppliedPanels);
  const instance = useId();
  const [selected, setSelected] = useState(panels[0].id);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const active = panels.find((panel) => panel.id === selected) ?? panels[0];

  return <div className="analysisWorkspace">
    <div className="analysisWorkspaceIntro"><span>Área de trabajo</span><small>Consulta, compara y profundiza.</small></div>
    <div className="analysisWorkspaceTabs" role="tablist" aria-label="Áreas de análisis">
      {panels.map((panel, index) => <button
        ref={(element) => { buttons.current[index] = element; }}
        type="button"
        role="tab"
        key={panel.id}
        id={`${instance}-tab-${panel.id}`}
        aria-controls={`${instance}-panel-${panel.id}`}
        aria-selected={active.id === panel.id}
        tabIndex={active.id === panel.id ? 0 : -1}
        onClick={() => setSelected(panel.id)}
        onKeyDown={(event) => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % panels.length;
          else if (event.key === "ArrowLeft") next = (index - 1 + panels.length) % panels.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = panels.length - 1;
          else return;
          event.preventDefault();
          setSelected(panels[next].id);
          buttons.current[next]?.focus();
        }}
      ><span className="analysisWorkspaceIndex" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="analysisWorkspaceTabLabel">{panel.label}<small aria-hidden="true">{{resultados:"Resumen de sorteos",analizar:"Cobertura y datos",jugadas:"Carteras guardadas",reparto:"Asignaciones",historial:"Sorteos anteriores"}[panel.id]}</small></span></button>)}
    </div>
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
