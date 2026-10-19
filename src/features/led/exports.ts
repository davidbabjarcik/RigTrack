import type { Placement, PortRun, Processor, WallForWiring } from './processor'

/** Kde začína v obraze (x, y) každý port: stĺpec, od ktorého ide, krát šírka panela. */
export function portStarts(walls: WallForWiring[], runs: PortRun[], placements: Placement[]) {
  return runs.map((run) => {
    const wall = walls.find((item) => item.name === run.wall)!
    const place = placements.find((item) => item.wall === run.wall)
    const tiled = !place || place.tilesX * place.tilesY > 1
    return {
      ...run,
      input: (place?.canvas ?? 0) + 1,
      x: (tiled ? 0 : place.x) + (run.fromColumn - 1) * wall.panelPxW,
      y: tiled ? 0 : place.y,
      tiled,
    }
  })
}

/** Návod na nastavenie procesora v NovaLCT (Screen Configuration) po krokoch. */
export function novastarGuide(walls: WallForWiring[], runs: PortRun[], placements: Placement[], processor: Processor) {
  const lines = [
    `Nastavenie LED procesora – ${processor.name}`,
    `Vstupy: ${processor.inputW}×${processor.inputH}, výstupov (CH): ${processor.outputs}, ~${processor.pixelsPerOutput.toLocaleString('sk-SK')} px na výstup`,
    '',
    '1) NovaLCT → Screen Configuration → Sending Card: nastavte rozlíšenie vstupu podľa zdroja (napr. 1920×1080 @ 60 Hz).',
    '2) Receiving Card: načítajte konfiguračný súbor (.rcfgx) panelov od výrobcu a pošlite ho do všetkých kariet (Send to Receiving Card → Save).',
    '3) Screen Connection: pre každý výstup nastavte počet panelov a ich poradie (had – stĺpec zhora nadol, ďalší zdola nahor) a štartovaciu polohu X / Y v obraze:',
    '',
  ]
  for (const wall of walls) {
    lines.push(`Stena „${wall.name}“: ${wall.columns} × ${wall.rows} panelov, panel ${wall.panelPxW}×${wall.panelPxH} px, spolu ${wall.columns * wall.panelPxW}×${wall.rows * wall.panelPxH} px`)
  }
  lines.push('')
  for (const port of portStarts(walls, runs, placements)) {
    const columns = port.fromColumn === port.toColumn ? `stĺpec ${port.fromColumn}` : `stĺpce ${port.fromColumn}–${port.toColumn}`
    lines.push(
      `Výstup ${port.port} (procesor ${Math.ceil(port.port / processor.outputs)}, port ${((port.port - 1) % processor.outputs) + 1}): ${port.wall}, ${columns}, ${port.panels} panelov, ` +
        (port.tiled ? 'stena je väčšia ako vstup – rozdeľte ju na viac vstupov' : `vstup ${port.input}, štart X ${port.x}, Y ${port.y}`),
    )
  }
  lines.push('', '4) Uložte konfiguráciu do procesora (Save to HW) a skontrolujte pixel mapou z RigTracku.')
  return lines.join('\r\n')
}

/** Nastavenie slicov pre Resolume Arena (Advanced Output) – súradnice stien v kompozícii. */
export function arenaGuide(walls: WallForWiring[], placements: Placement[], processor: Processor) {
  const inputs = Math.max(1, ...placements.map((place) => place.canvas + place.tilesX * place.tilesY))
  const lines = [
    'Resolume Arena – Advanced Output',
    '',
    `Kompozícia: ${processor.inputW}×${processor.inputH} px${inputs > 1 ? ` (${inputs} výstupy z Areny = ${inputs} vstupy procesora)` : ''}`,
    'Output → Advanced Output → pre každý výstup (Screen) nastavte Device na grafickú kartu / výstup do procesora a rozlíšenie ako vstup procesora.',
    'Pre každú stenu pridajte Slice: Input Selection = časť kompozície, Output Transformation = rovnaké súradnice na výstupe (1:1).',
    '',
  ]
  for (const place of placements) {
    const wall = walls.find((item) => item.name === place.wall)!
    if (place.tilesX * place.tilesY > 1) {
      lines.push(`Slice „${place.wall}“: stena ${place.w}×${place.h} px je väčšia ako vstup – rozdeľte ju na ${place.tilesX}×${place.tilesY} častí (výstupy ${place.canvas + 1}–${place.canvas + place.tilesX * place.tilesY}).`)
    } else {
      lines.push(`Slice „${place.wall}“: Screen ${place.canvas + 1}, X ${place.x}, Y ${place.y}, šírka ${place.w}, výška ${place.h} (${wall.columns}×${wall.rows} panelov)`)
    }
  }
  lines.push('', 'Tip: pixel mapu z RigTracku vložte do Areny ako klip a skontrolujte, či každá stena ukazuje svoj obdĺžnik.')
  return lines.join('\r\n')
}

const COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ef4444']

/** Pixel mapa jedného vstupu (PNG): steny, mriežka panelov, čísla portov a súradnice. */
export function drawPixelMap(walls: WallForWiring[], runs: PortRun[], placements: Placement[], processor: Processor, input: number) {
  const canvas = document.createElement('canvas')
  canvas.width = processor.inputW
  canvas.height = processor.inputH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const starts = portStarts(walls, runs, placements)
  placements
    .filter((place) => place.canvas === input && place.tilesX * place.tilesY === 1)
    .forEach((place) => {
      const wall = walls.find((item) => item.name === place.wall)!
      const color = COLORS[walls.indexOf(wall) % COLORS.length]
      for (let row = 0; row < wall.rows; row++) {
        for (let column = 0; column < wall.columns; column++) {
          ctx.fillStyle = (row + column) % 2 === 0 ? color : '#1e293b'
          ctx.fillRect(place.x + column * wall.panelPxW, place.y + row * wall.panelPxH, wall.panelPxW, wall.panelPxH)
        }
      }
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(place.x + 1, place.y + 1, place.w - 2, place.h - 2)
      // Porty: zvislé čiary a číslo na začiatku.
      ctx.font = `bold ${Math.max(14, Math.min(48, wall.panelPxW / 3))}px sans-serif`
      for (const port of starts.filter((item) => item.wall === wall.name)) {
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`P${port.port}`, port.x + 8, port.y + Math.max(20, Math.min(52, wall.panelPxH / 3)))
        ctx.fillRect(port.x, port.y, 2, place.h)
      }
      ctx.font = `bold ${Math.max(16, Math.min(64, place.h / 8))}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${wall.name} · ${place.w}×${place.h} · x${place.x} y${place.y}`, place.x + place.w / 2, place.y + place.h / 2)
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'
    })
  return canvas
}
