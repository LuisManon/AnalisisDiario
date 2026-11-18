function validateNumbers(numbers: readonly number[], length: number) {
  if (numbers.length !== length || new Set(numbers).size !== length || numbers.some(n => !Number.isInteger(n) || n < 1 || n > 84)) throw new Error(`Expected ${length} unique numbers in 1..84`);
}

/** Preserve real exact hits first; maximum bipartite matching of remaining ±1 neighbors. */
export function matchKinoNear(ticket: readonly number[], winning: readonly number[]) {
  validateNumbers(ticket, 10); validateNumbers(winning, 20);
  const winners = new Set(winning), exact = ticket.filter(n => winners.has(n)).sort((a, b) => a - b);
  const exactSet = new Set(exact), remaining = ticket.filter(n => !exactSet.has(n)).sort((a, b) => a - b);
  const available = winning.filter(n => !exactSet.has(n)).sort((a, b) => a - b), matched = new Map<number, number>();
  const augment = (number: number, visited: Set<number>): boolean => {
    for (const winner of available) {
      if (Math.abs(number - winner) !== 1 || visited.has(winner)) continue;
      visited.add(winner);
      const previous = matched.get(winner);
      if (previous === undefined || augment(previous, visited)) { matched.set(winner, number); return true; }
    }
    return false;
  };
  remaining.forEach(number => augment(number, new Set()));
  const neighbors = [...matched].map(([winner, number]) => ({ number, winner, offset: winner - number })).sort((a, b) => a.number - b.number);
  const matchedNumbers = new Set(neighbors.map(p => p.number)), unmatched = remaining.filter(n => !matchedNumbers.has(n));
  return { exact, exactCount: exact.length, neighbors, neighborCount: neighbors.length, nearTotal: exact.length + neighbors.length, unmatched };
}

export function auditNearPortfolio(plays: readonly { id: number; numbers: number[] }[], winning: number[]) {
  if (!plays.length || new Set(plays.map(p => p.id)).size !== plays.length || plays.some(p => !Number.isSafeInteger(p.id))) throw new Error("Invalid portfolio ids");
  const rows = plays.map(play => ({ id: play.id, numbers: [...play.numbers], ...matchKinoNear(play.numbers, winning) }));
  rows.sort((a, b) => b.nearTotal - a.nearTotal || b.exactCount - a.exactCount || a.id - b.id);
  const exactHistogram = Array<number>(11).fill(0), nearHistogram = Array<number>(11).fill(0);
  rows.forEach(r => { exactHistogram[r.exactCount]++; nearHistogram[r.nearTotal]++; });
  const maxExact = Math.max(...rows.map(r => r.exactCount)), maxNear = rows[0].nearTotal;
  return { plays: plays.length, exactHistogram, nearHistogram, maxExact, maxNear,
    bestNear: rows[0], tiedBestNear: rows.filter(r => r.nearTotal === maxNear), bestExact: rows.filter(r => r.exactCount === maxExact), rows };
}
