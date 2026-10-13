import type { Box } from './model'

// Izometrický pohľad na nákladný priestor. Pozorovateľ stojí šikmo nad rohom, ktorý má
// najväčšie súradnice a aj b; otočením o štvrť kruhu sa mení, ktorý roh vozidla to je.

/**
 * Odkiaľ sa na náklad pozeráme pri jednotlivých otočeniach (x rastie od kabíny k dverám,
 * y od ľavej steny k pravej; pozorovateľ je pri rohu s najväčším a aj b).
 */
export const VIEW_NAMES = ['od zadných dverí, sprava', 'od kabíny, sprava', 'od kabíny, zľava', 'od zadných dverí, zľava']

/** Kváder v súradniciach pohľadu: a a b sú vodorovné osi (bližšie k pozorovateľovi = väčšie), z je výška. */
export type ViewBox3 = { a: number; b: number; z: number; la: number; lb: number; h: number }

const COS = Math.cos(Math.PI / 6)
const EPS = 0.001

/** Otočí kváder okolo zvislej osi o `turns` štvrťkruhov v priestore dlhom `length` a širokom `width`. */
export function toView(box: Box, length: number, width: number, turns: number): ViewBox3 {
  const base = { z: box.z, h: box.height }
  switch (((turns % 4) + 4) % 4) {
    case 1:
      return { ...base, a: box.y, b: length - box.x - box.length, la: box.width, lb: box.length }
    case 2:
      return { ...base, a: length - box.x - box.length, b: width - box.y - box.width, la: box.length, lb: box.width }
    case 3:
      return { ...base, a: width - box.y - box.width, b: box.x, la: box.width, lb: box.length }
    default:
      return { ...base, a: box.x, b: box.y, la: box.length, lb: box.width }
  }
}

/**
 * Bod priestoru na obrazovke. Os b mieri doprava a os a doľava: tak to naozaj vidí človek,
 * ktorý stojí pri rohu s najväčším a aj b (inak by bol obraz zrkadlovo prevrátený).
 */
export function project(a: number, b: number, z: number) {
  return { x: (b - a) * COS, y: (a + b) * 0.5 - z }
}

/** Je kváder `far` celý za rovinou, ktorá ho oddeľuje od `near` (teda ho treba nakresliť skôr)? */
function behind(far: ViewBox3, near: ViewBox3) {
  return far.a + far.la <= near.a + EPS || far.b + far.lb <= near.b + EPS || far.z + far.h <= near.z + EPS
}

/**
 * Poradie kreslenia odzadu dopredu, aby bližšie kvádre prekryli vzdialenejšie.
 * Vracia indexy do vstupného poľa. Kvádre sa nesmú prelínať.
 */
export function paintOrder(boxes: ViewBox3[]): number[] {
  const remaining = boxes.map((_, index) => index)
  const order: number[] = []
  const depth = (box: ViewBox3) => box.a + box.la / 2 + box.b + box.lb / 2 + box.z + box.h / 2
  while (remaining.length > 0) {
    // Najprv ten, pred ktorým už nič vzdialenejšie nečaká.
    let pick = remaining.findIndex((candidate) =>
      remaining.every((other) => other === candidate || !(behind(boxes[other], boxes[candidate]) && !behind(boxes[candidate], boxes[other]))),
    )
    // Kruhová závislosť (zriedkavé usporiadanie): vezmeme ten s najvzdialenejším stredom.
    if (pick < 0) pick = remaining.reduce((best, _, index) => (depth(boxes[remaining[index]]) < depth(boxes[remaining[best]]) ? index : best), 0)
    order.push(remaining.splice(pick, 1)[0])
  }
  return order
}
