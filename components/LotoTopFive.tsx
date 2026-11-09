import { useId } from "react";
import type { buildStats } from "../lib/stats";

type Stats = ReturnType<typeof buildStats>;
const filterLabels = { todos: "Todos los sorteos", miercoles: "Miércoles", sabado: "Sábados" };

export function LotoTopFive({ stats }: { stats: Stats }) {
  const descriptionId = useId();
  const rows = [
    ...stats.byPosition.map((position, index) => ({
      key: `p${position.position}`, label: `P${position.position}`, name: `Posición ${position.position}`,
      entries: position.top, latestNumber: stats.latest?.numbers[index], plus: false
    })),
    { key: "mas", label: "Más", name: "Número Más", entries: stats.plusTop, latestNumber: stats.latest?.plus, plus: true }
  ];

  return <details className="lotoTopFive" open>
    <summary className="lotoTopFiveHeader">
      <div><span className="lotoTopFiveEyebrow">Ranking histórico</span><h2>Top 5 por posición</h2><p>Los números que más se repiten en cada posición del sorteo.</p></div>
      <span className="lotoTopFiveToggle" aria-hidden="true"><span className="whenOpen">Ocultar</span><span className="whenClosed">Mostrar</span><span className="lotoTopFiveChevron">⌄</span></span>
    </summary>
    <div className="lotoTopFiveContent">
      <div className="lotoTopFiveContext">
        <span><strong>{stats.drawCount}</strong> sorteos analizados<span className="lotoTopFiveContextDot" aria-hidden="true">·</span>{filterLabels[stats.day]}</span>
        <span className="lotoTopFiveMatchLegend"><i aria-hidden="true" /> Coincide con la posición del último sorteo</span>
      </div>
      {stats.drawCount ? <div className="lotoTopFiveTableWrap">
        <table className="lotoTopFiveTable" aria-describedby={descriptionId}>
          <caption className="lotoTopFiveSr">Cinco números más frecuentes por posición y número Más, ordenados por apariciones.</caption>
          <thead><tr><th scope="col"><span className="lotoTopFiveColumnLabel">Pos.</span></th>{[1, 2, 3, 4, 5].map(rank => <th scope="col" key={rank}><span className="lotoTopFiveRank">{rank}.º</span>{rank === 1 ? <small>Más frecuente</small> : null}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.key} className={row.plus ? "lotoTopFivePlus" : undefined}>
            <th scope="row"><span className="lotoTopFivePosition" aria-label={row.name}>{row.label}</span></th>
            {Array.from({ length: 5 }, (_, index) => {
              const entry = row.entries[index];
              if (!entry) return <td key={index}><span className="lotoTopFiveMissing" aria-label="Sin datos">—</span></td>;
              const match = row.latestNumber === entry.number;
              const percentage = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 1 }).format(entry.count / stats.drawCount * 100);
              return <td key={index} className={index === 0 ? "lotoTopFiveLeader" : undefined}>
                <div className={`lotoTopFiveEntry${match ? " isMatch" : ""}`} title={`${row.name}: ${String(entry.number).padStart(2, "0")} · ${entry.count} apariciones en ${stats.drawCount} sorteos${match ? " · Coincide con la posición del último sorteo" : ""}`}>
                  <span className="lotoTopFiveNumber">{String(entry.number).padStart(2, "0")}{match ? <i className="lotoTopFiveMatchDot" aria-hidden="true" /> : null}</span>
                  <span className="lotoTopFiveStats"><span className="lotoTopFiveCount"><strong>{entry.count}</strong> <span className="lotoTopFiveCountUnit">{entry.count === 1 ? "vez" : "veces"}</span></span><span className="lotoTopFiveShare">{percentage}%</span></span>
                  {match ? <span className="lotoTopFiveSr">Coincide con la posición del último sorteo</span> : null}
                </div>
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div> : <p className="lotoTopFiveEmpty">No hay sorteos disponibles para este filtro.</p>}
      <p id={descriptionId} className="lotoTopFiveFootnote">Cada celda muestra el número, sus apariciones y el porcentaje de sorteos del filtro. Las posiciones se calculan por separado; Más tiene su propio ranking.</p>
    </div>
  </details>;
}
