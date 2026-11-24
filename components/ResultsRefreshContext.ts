"use client";
import { createContext, useContext } from "react";
type ResultsDocument = { version: string; results: { date: string }[] };
export const ResultsRefreshContext = createContext<{ version: string; refresh: () => Promise<ResultsDocument> } | null>(null);
export function useResultsRefresh() {
  const context = useContext(ResultsRefreshContext);
  if (!context) throw new Error("La consulta de resultados requiere el contenedor del producto.");
  return context;
}
