import {formatMoney, virtualPrizeTable} from "../lib/game";

/** Same compact information pattern as Kino; native disclosure supports touch/keyboard. */
export function LotoPrizeInfo() {
  return <details className="lotoPrizeInfo">
    <summary aria-label="Tabla de premios de Loto Más"><span aria-hidden="true">i</span></summary>
    <div className="lotoPrizePopover">
      <strong>Tabla de premios · Loto Más</strong>
      {virtualPrizeTable.map(prize=><div key={`${prize.matches}-${prize.plus}`}><span>{prize.label}</span><b>{formatMoney(prize.amount)}</b></div>)}
      <small>Premios de referencia utilizados por la aplicación.</small>
    </div>
  </details>;
}
