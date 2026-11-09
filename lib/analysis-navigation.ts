/** Results first, preserving the remaining product-specific order and input. */
export function orderAnalysisPanels<T extends {id: string}>(panels: readonly T[]): T[] {
  return [...panels.filter(panel=>panel.id==="resultados"),...panels.filter(panel=>panel.id!=="resultados")];
}
