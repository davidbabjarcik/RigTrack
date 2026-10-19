/** Elektrina LED stien: okruhy 16 A po stĺpcoch a ich rozdelenie na fázy L1 / L2 / L3. */

export type PowerWall = { name: string; columns: number; rows: number; maxW: number; avgW: number }

export type Circuit = { id: number; wall: string; fromColumn: number; toColumn: number; panels: number; maxW: number; avgW: number; phase: 1 | 2 | 3 }

/** Okruhy jednej steny: celé stĺpce na okruh, koľko sa zmestí do bezpečného výkonu (inak stĺpec po častiach). */
export function wallCircuits(wall: PowerWall, wattsPerCircuit: number) {
  const panelsPerCircuit = Math.max(1, Math.floor(wattsPerCircuit / Math.max(wall.maxW, 1)))
  const circuits: Omit<Circuit, 'id' | 'phase'>[] = []
  const columnsPerCircuit = Math.floor(panelsPerCircuit / wall.rows)
  const add = (from: number, to: number, panels: number) => circuits.push({ wall: wall.name, fromColumn: from, toColumn: to, panels, maxW: panels * wall.maxW, avgW: panels * wall.avgW })
  if (columnsPerCircuit >= 1) {
    for (let column = 1; column <= wall.columns; column += columnsPerCircuit) {
      const to = Math.min(wall.columns, column + columnsPerCircuit - 1)
      add(column, to, (to - column + 1) * wall.rows)
    }
  } else {
    for (let column = 1; column <= wall.columns; column++) {
      for (let left = wall.rows; left > 0; left -= panelsPerCircuit) add(column, column, Math.min(panelsPerCircuit, left))
    }
  }
  return circuits
}

/**
 * Rozdelí okruhy na fázy: najväčší okruh vždy na najmenej zaťaženú fázu. `existing` = čo už na fázach L1–L3
 * visí iné (W), napr. zvuk na L1 – LED sa rozloží tak, aby celok bol čo najrovnomernejší.
 */
export function balancePhases(walls: PowerWall[], wattsPerCircuit: number, existing: [number, number, number] = [0, 0, 0], phaseCount: 1 | 2 | 3 = 3) {
  const all = walls.flatMap((wall) => wallCircuits(wall, wattsPerCircuit)).map((circuit, index) => ({ ...circuit, id: index + 1, phase: 1 as Circuit['phase'] }))
  // Len toľko fáz, koľko je k dispozícii (napr. 2 fázy z prípojky).
  const load = existing.slice(0, phaseCount)
  for (const circuit of [...all].sort((a, b) => b.maxW - a.maxW)) {
    const phase = load.indexOf(Math.min(...load))
    circuit.phase = (phase + 1) as Circuit['phase']
    load[phase] += circuit.maxW
  }
  const phases = ([1, 2, 3] as const).slice(0, phaseCount).map((phase) => {
    const maxW = load[phase - 1]
    return { phase, maxW, ledW: maxW - existing[phase - 1], amps: Math.round((maxW / 230) * 10) / 10, circuits: all.filter((circuit) => circuit.phase === phase).map((circuit) => circuit.id) }
  })
  const highest = Math.max(...load)
  const lowest = Math.min(...load)
  return { circuits: all, phases, imbalance: highest > 0 ? Math.round(((highest - lowest) / highest) * 100) : 0 }
}
