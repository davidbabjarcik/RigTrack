import type { Accessory } from './model'
import type { RackCategory } from './library'

// Kreslenie prístrojov v racku (predný a zadný panel) podľa kategórie: displeje, gombíky, LED, mriežky, konektory
// XLR / speakON / powerCON / etherCON / BNC, zásuvky a ventilátory. Vlastné zjednodušené kresby, nie fotky výrobcov.
//
// Tvary majú vodorovné súradnice ako podiel šírky slotu (0–1) a zvislé v jednotkách U od horného okraja slotu.
// Rovnaké tvary kreslí mriežka (SVG) aj PDF (canvas).

export type Shape =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string; stroke?: string; rx?: number }
  | { t: 'circle'; x: number; y: number; r: number; fill: string; stroke?: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; width?: number }

export type FaceInput = { category: RackCategory | null; accessory: Accessory | null; side: 'front' | 'rear'; heightU: number; width: 'full' | 'half' | 'third'; name: string }

const C = {
  panel: '#2a2a2a',
  rear: '#1d1d1d',
  ear: '#3a3a3a',
  screw: '#8a8a8a',
  hole: '#0d0d0d',
  metal: '#a3a3a3',
  knob: '#4b4b4b',
  display: '#164e63',
  displayLine: '#67e8f9',
  led: '#22c55e',
  ledRed: '#ef4444',
  ledAmber: '#f59e0b',
  blue: '#3b82f6',
  grey: '#d4d4d4',
  vent: '#141414',
}

/** Počet kanálov HF prijímača / in-ear vysielača podľa modelu (dvojitý, štvorkanálový); úzky = 1, široký = 2. */
export function channelCount(name: string, width: FaceInput['width']) {
  if (/\b(ad4q|ad4qe|ulxd4q|slxd4q)\b|em 4|quad/i.test(name)) return 4
  if (/\b(ad4d|ad4de|ulxd4d|slxd4d|blx88|p10t)\b|em 2|dual|glxd4r/i.test(name)) return 2
  return width === 'full' ? 2 : 1
}

/** Tvary predného alebo zadného panela prístroja (prvý tvar je plocha panela). */
export function faceShapes(input: FaceInput): Shape[] {
  const U = Math.max(1, input.heightU)
  const s: Shape[] = []
  const rect = (x: number, y: number, w: number, h: number, fill: string, stroke?: string, rx?: number) => s.push({ t: 'rect', x, y, w, h, fill, stroke, rx })
  const circle = (x: number, y: number, r: number, fill: string, stroke?: string) => s.push({ t: 'circle', x, y, r, fill, stroke })
  const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, width?: number) => s.push({ t: 'line', x1, y1, x2, y2, stroke, width })
  const front = input.side === 'front'
  const narrow = input.width !== 'full'
  // Konektory a ovládacie prvky.
  const xlr = (x: number, y: number, female = true) => {
    circle(x, y, 0.17, C.hole, C.metal)
    if (female) for (const dx of [-0.006, 0, 0.006]) circle(x + dx, y + (dx === 0 ? 0.06 : -0.03), 0.025, C.metal)
    else circle(x, y, 0.06, C.metal)
  }
  const speakon = (x: number, y: number) => {
    circle(x, y, 0.2, C.hole, C.blue)
    circle(x, y, 0.08, C.knob)
  }
  const powercon = (x: number, y: number, out = false) => {
    circle(x, y, 0.19, out ? '#d4d4d4' : '#1e3a8a', C.metal)
    circle(x, y, 0.08, C.hole)
  }
  const ethercon = (x: number, y: number) => {
    circle(x, y, 0.17, C.hole, C.metal)
    rect(x - 0.008, y - 0.07, 0.016, 0.14, C.knob)
  }
  const bnc = (x: number, y: number) => {
    circle(x, y, 0.11, C.grey, C.metal)
    circle(x, y, 0.04, C.hole)
  }
  const knob = (x: number, y: number, r = 0.14) => {
    circle(x, y, r, C.knob, C.metal)
    line(x, y - r, x, y - r * 0.4, C.grey, 1.5)
  }
  const led = (x: number, y: number, fill = C.led) => circle(x, y, 0.05, fill)
  const button = (x: number, y: number) => rect(x - 0.012, y - 0.08, 0.024, 0.16, '#3f3f3f', C.metal, 1)
  const display = (x: number, y: number, w: number, h: number) => {
    rect(x, y, w, h, C.display, C.displayLine, 1.5)
    line(x + w * 0.08, y + h * 0.35, x + w * 0.6, y + h * 0.35, C.displayLine, 1)
    line(x + w * 0.08, y + h * 0.68, x + w * 0.42, y + h * 0.68, C.displayLine, 1)
  }
  const vent = (x: number, y: number, w: number, h: number) => {
    for (let row = y + 0.12; row < y + h - 0.08; row += 0.16) rect(x, row, w, 0.07, C.vent, undefined, 2)
  }
  const fan = (x: number, y: number, r: number) => {
    circle(x, y, r, C.vent, C.metal)
    line(x, y - r * 0.85, x, y + r * 0.85, C.metal, 1)
    circle(x, y, r * 0.25, C.knob)
  }
  const outlet = (x: number, y: number) => {
    circle(x, y, 0.3, '#111111', C.metal)
    circle(x - 0.006, y, 0.04, C.hole)
    circle(x + 0.006, y, 0.04, C.hole)
  }
  const row = (n: number, from: number, to: number, draw: (x: number, i: number) => void) => {
    for (let i = 0; i < n; i++) draw(n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1), i)
  }
  const mid = U / 2
  const rows = (i: number) => (U === 1 ? 0.5 : 0.5 + i * ((U - 1) / Math.max(1, Math.ceil(U) - 1)))

  // Plocha panela, uši racku so skrutkami (len spredu, celá šírka).
  rect(0, 0, 1, U, front ? C.panel : C.rear, '#555555', 2)
  const ears = front && !narrow
  const inner = ears ? [0.045, 0.955] : [0.04, 0.96]
  if (ears) {
    for (const x of [0, 0.965]) rect(x, 0, 0.035, U, C.ear)
    for (let u = 0; u < U; u++) for (const x of [0.0175, 0.9825]) circle(x, u + 0.5, 0.08, C.hole, C.screw)
  }
  const [a, b] = inner
  const at = (fraction: number) => a + (b - a) * fraction

  if (input.accessory) {
    if (input.accessory === 'vent') vent(at(0.03), 0, at(0.97) - at(0.03), U)
    if (input.accessory === 'shelf') rect(at(0), U - 0.25, at(1) - at(0), 0.18, '#3a3a3a', C.metal)
    if (input.accessory === 'drawer') {
      rect(at(0.35), mid - 0.15, at(0.65) - at(0.35), 0.3, C.knob, C.metal, 4)
      line(at(0.02), 0.08, at(0.98), 0.08, '#444444')
    }
    if (input.accessory === 'patch') {
      const n = narrow ? 8 : 16
      for (let r = 0; r < Math.min(2, Math.ceil(U)); r++) row(n, at(0.04), at(0.96), (x) => xlr(x, U === 1 ? 0.5 : rows(r)))
    }
    if (input.accessory === 'pdu') {
      if (front) {
        rect(at(0.02), mid - 0.18, 0.05, 0.36, C.ledRed, C.metal, 2)
        row(narrow ? 3 : 8, at(0.18), at(0.97), (x) => outlet(x, mid))
      } else {
        powercon(at(0.08), mid)
        row(narrow ? 2 : 6, at(0.25), at(0.95), (x) => powercon(x, mid, true))
      }
    }
    if (input.accessory === 'lamp') {
      line(at(0.5), mid, at(0.5), mid - 0.35, C.metal, 2)
      circle(at(0.5), mid - 0.35, 0.12, '#fde68a', C.metal)
    }
    return s
  }

  const channels = channelCount(input.name, input.width)

  switch (input.category) {
    case 'amp':
      if (front) {
        if (U >= 2 && ears) for (const x of [at(0.01), at(0.97)]) rect(x, 0.25, 0.018, U - 0.5, '#555555', C.metal, 3)
        vent(at(0.06), 0.1, at(0.7) - at(0.06), U - 0.2)
        for (let i = 0; i < 4; i++) {
          led(at(0.76), 0.3 + ((U - 0.6) * i) / 3, i === 0 ? C.ledAmber : C.led)
          led(at(0.8), 0.3 + ((U - 0.6) * i) / 3)
        }
        display(at(0.84), mid - 0.25, at(0.93) - at(0.84), 0.5)
        rect(at(0.95), mid - 0.18, 0.02, 0.36, C.ledRed, C.metal, 2)
      } else {
        row(2, at(0.03), at(0.13), (x) => fan(x, mid, Math.min(0.42, U * 0.4)))
        row(4, at(0.24), at(0.5), (x) => speakon(x, mid))
        row(4, at(0.58), at(0.76), (x) => xlr(x, mid))
        ethercon(at(0.84), mid)
        powercon(at(0.95), mid)
      }
      break
    case 'wireless':
    case 'iem': {
      const blocks = channels
      for (let i = 0; i < blocks; i++) {
        const left = at(i / blocks + 0.02)
        const w = (b - a) / blocks
        if (front) {
          display(left, mid - 0.3, w * 0.42, 0.6)
          if (input.category === 'iem') {
            knob(left + w * 0.55, mid, 0.18)
            circle(left + w * 0.7, mid, 0.07, C.hole, C.metal)
          } else {
            row(3, left + w * 0.52, left + w * 0.72, (x) => button(x, mid))
          }
          led(left + w * 0.82, mid - 0.15)
          led(left + w * 0.82, mid + 0.15, C.ledAmber)
        } else {
          if (i === 0) bnc(at(0.05), mid)
          if (i === blocks - 1) bnc(at(0.95), mid)
          xlr(left + w * 0.4, mid, false)
          if (input.category === 'iem') xlr(left + w * 0.6, mid)
        }
      }
      if (!front) {
        if (!narrow) ethercon(at(0.85), mid)
        circle(at(narrow ? 0.8 : 0.75), mid, 0.07, C.hole, C.metal)
      }
      if (front) rect(at(0.965) - 0.012, mid - 0.15, 0.012, 0.3, '#3f3f3f', C.metal, 1)
      break
    }
    case 'stagebox':
      if (front) {
        const inputRows = Math.max(1, Math.ceil(U) - (U >= 3 ? 1 : 0))
        for (let r = 0; r < inputRows; r++) row(narrow ? 6 : 8, at(0.05), at(0.8), (x) => xlr(x, rows(r)))
        if (U >= 3) row(narrow ? 4 : 8, at(0.05), at(0.8), (x) => xlr(x, rows(Math.ceil(U) - 1), false))
        for (let i = 0; i < Math.min(4, Math.ceil(U) * 2); i++) led(at(0.88), 0.3 + ((U - 0.6) * i) / Math.max(1, Math.min(4, Math.ceil(U) * 2) - 1))
        ethercon(at(0.95), U >= 2 ? rows(0) : mid)
      } else {
        ethercon(at(0.15), mid)
        ethercon(at(0.28), mid)
        fan(at(0.6), mid, Math.min(0.42, U * 0.35))
        powercon(at(0.9), mid)
      }
      break
    case 'processor':
      if (front) {
        display(at(0.04), mid - 0.28, at(0.22) - at(0.04), 0.56)
        row(4, at(0.28), at(0.46), (x) => knob(x, mid))
        for (let c = 0; c < 6; c++) for (let l = 0; l < 3; l++) rect(at(0.52 + c * 0.04), mid - 0.3 + l * 0.22, 0.012, 0.14, l === 0 ? C.ledRed : C.led)
        row(4, at(0.8), at(0.95), (x) => button(x, mid))
      } else {
        row(6, at(0.1), at(0.6), (x, i) => xlr(x, mid, i < 2))
        ethercon(at(0.72), mid)
        powercon(at(0.9), mid)
      }
      break
    case 'mixer':
      if (front) {
        display(at(0.03), 0.25, at(0.3) - at(0.03), Math.max(0.5, U - 1.2))
        for (let r = 0; r < Math.max(1, Math.ceil(U) - 1); r++) row(6, at(0.36), at(0.7), (x) => knob(x, rows(r), 0.13))
        row(6, at(0.36), at(0.7), (x) => button(x, U - 0.4))
        row(narrow ? 2 : 4, at(0.76), at(0.95), (x) => xlr(x, U >= 2 ? rows(0) : mid))
      } else {
        for (let r = 0; r < Math.max(1, Math.ceil(U) - 1); r++) row(8, at(0.05), at(0.65), (x) => xlr(x, rows(r), r === 0))
        ethercon(at(0.75), mid)
        ethercon(at(0.83), mid)
        powercon(at(0.94), mid)
      }
      break
    case 'antenna':
      if (front) {
        row(narrow ? 2 : 4, at(0.08), at(0.4), (x) => led(x, mid))
        display(at(0.5), mid - 0.22, 0.12, 0.44)
        rect(at(0.93), mid - 0.18, 0.02, 0.36, C.ledRed, C.metal, 2)
      } else {
        bnc(at(0.05), mid)
        bnc(at(0.13), mid)
        row(narrow ? 4 : 10, at(0.25), at(0.85), (x) => bnc(x, mid))
        circle(at(0.94), mid, 0.07, C.hole, C.metal)
      }
      break
    case 'charger':
      if (front) {
        row(narrow ? 2 : 4, at(0.08), at(0.85), (x) => {
          rect(x - 0.06, 0.15, 0.12, U - 0.3, '#151515', C.metal, 3)
          led(x + 0.045, U - 0.3)
        })
        rect(at(0.95), mid - 0.18, 0.02, 0.36, C.ledRed, C.metal, 2)
      } else {
        ethercon(at(0.3), mid)
        powercon(at(0.9), mid)
      }
      break
    case 'power':
      if (front) {
        rect(at(0.02), mid - 0.18, 0.05, 0.36, C.ledRed, C.metal, 2)
        display(at(0.1), mid - 0.22, 0.1, 0.44)
        if (U >= 2) row(6, at(0.3), at(0.95), (x) => rect(x - 0.012, mid - 0.35, 0.024, 0.7, '#e5e5e5', C.metal, 1))
        else row(6, at(0.3), at(0.95), (x) => led(x, mid))
      } else {
        circle(at(0.08), mid, Math.min(0.4, U * 0.36), '#dc2626', C.metal)
        row(6, at(0.25), at(0.95), (x) => (U >= 2 ? outlet(x, mid) : powercon(x, mid, true)))
      }
      break
    case 'network':
      if (front) {
        for (let r = 0; r < 2; r++) row(narrow ? 6 : 12, at(0.12), at(0.78), (x) => rect(x - 0.01, mid - 0.36 + r * 0.38, 0.02, 0.3, C.hole, C.metal, 1))
        row(narrow ? 1 : 4, at(0.84), at(0.96), (x) => rect(x - 0.01, mid - 0.15, 0.02, 0.3, '#0f172a', C.metal, 1))
        row(3, at(0.03), at(0.08), (x) => led(x, mid))
      } else {
        fan(at(0.3), mid, Math.min(0.42, U * 0.4))
        fan(at(0.6), mid, Math.min(0.42, U * 0.4))
        circle(at(0.9), mid, 0.18, '#111111', C.metal)
      }
      break
    case 'light':
      if (front) {
        display(at(0.04), mid - 0.26, 0.14, 0.52)
        row(narrow ? 3 : 8, at(0.3), at(0.95), (x) => xlr(x, mid))
      } else {
        ethercon(at(0.2), mid)
        ethercon(at(0.32), mid)
        powercon(at(0.9), mid)
      }
      break
    default:
      if (front) {
        display(at(0.05), mid - 0.25, narrow ? 0.25 : 0.16, 0.5)
        row(narrow ? 2 : 4, at(narrow ? 0.45 : 0.3), at(0.6), (x) => knob(x, mid, 0.13))
        row(3, at(0.72), at(0.85), (x) => led(x, mid))
        rect(at(0.95), mid - 0.18, 0.02, 0.36, '#3f3f3f', C.metal, 2)
      } else {
        row(narrow ? 1 : 3, at(0.15), at(0.45), (x) => bnc(x, mid))
        row(narrow ? 1 : 2, at(0.55), at(0.7), (x) => xlr(x, mid))
        powercon(at(0.9), mid)
      }
  }
  return s
}
