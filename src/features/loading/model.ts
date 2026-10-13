// Návrh nakladania cases do vozidiel. Je to výpočet (heuristika ukladania kvádrov),
// nie umelá inteligencia: výsledok je rozumný, nie zaručene najlepší možný.
//
// Súradnice v cm: x = od kabíny dozadu k dverám, y = od ľavej steny doprava, z = od podlahy hore.

export type Box = { x: number; y: number; z: number; length: number; width: number; height: number }

/** Miesto, kam sa nakladať nedá (podbeh kolesa, prepážka). Dá sa naň ukladať zhora. */
export type Obstacle = Box & { label: string }

export type CargoSpace = {
  id: string
  name: string
  /** Bez nosnosti sa hmotnosť nekontroluje. */
  payloadKg: number | null
  length: number
  width: number
  height: number
  obstacles: Obstacle[]
}

export type Parcel = { id: string; name: string; length: number; width: number; height: number; weightKg: number }

export type Placement = Box & {
  id: string
  name: string
  weightKg: number
  /** Otočený o 90° oproti zapísaným rozmerom. */
  rotated: boolean
  /** Na čom leží; null = na podlahe. */
  on: string | null
}

export type VehicleLoad = { space: CargoSpace; placements: Placement[]; weightKg: number; volumeShare: number }

export type Unplaced = { parcel: Parcel; reason: 'too-big' | 'too-heavy' | 'no-vehicle' }

export type LoadPlan = { loads: VehicleLoad[]; unplaced: Unplaced[] }

const EPS = 0.001

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.length - EPS &&
    b.x < a.x + a.length - EPS &&
    a.y < b.y + b.width - EPS &&
    b.y < a.y + a.width - EPS &&
    a.z < b.z + b.height - EPS &&
    b.z < a.z + a.height - EPS
  )
}

/** Leží pôdorys `top` celý na hornej ploche `base`? */
function restsOn(top: Box, base: Box) {
  return (
    Math.abs(base.z + base.height - top.z) < EPS &&
    top.x >= base.x - EPS &&
    top.y >= base.y - EPS &&
    top.x + top.length <= base.x + base.length + EPS &&
    top.y + top.width <= base.y + base.width + EPS
  )
}

const volume = (box: { length: number; width: number; height: number }) => box.length * box.width * box.height

/**
 * Nájde miesto pre balík vo vozidle, alebo null. Pravidlá:
 * - balík ostáva na výšku, otáčať sa smie len okolo zvislej osi;
 * - nesmie zasahovať do prekážky ani do iného balíka a musí sa zmestiť do priestoru;
 * - nad podlahou musí celý ležať na jednom balíku (nie ľahšom, než je sám) alebo na prekážke;
 * - prednosť má podlaha, potom miesto bližšie ku kabíne a k ľavej stene.
 */
function findPlace(load: VehicleLoad, parcel: Parcel): Placement | null {
  const { space, placements } = load
  if (space.payloadKg !== null && load.weightKg + parcel.weightKg > space.payloadKg + EPS) return null

  const blockers: Box[] = [...space.obstacles, ...placements]
  const points = [{ x: 0, y: 0, z: 0 }]
  for (const box of blockers) {
    points.push({ x: box.x + box.length, y: box.y, z: box.z }, { x: box.x, y: box.y + box.width, z: box.z }, { x: box.x, y: box.y, z: box.z + box.height })
    // Vedľa prekážky, ktorá nestojí pri stene, sa dá začať aj od steny.
    points.push({ x: box.x + box.length, y: 0, z: 0 }, { x: 0, y: box.y + box.width, z: 0 })
  }
  points.sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y)

  const orientations = [
    { length: parcel.length, width: parcel.width, rotated: false },
    { length: parcel.width, width: parcel.length, rotated: true },
  ]
  for (const point of points) {
    for (const orientation of orientations) {
      const box: Box = { ...point, length: orientation.length, width: orientation.width, height: parcel.height }
      if (box.x + box.length > space.length + EPS || box.y + box.width > space.width + EPS || box.z + box.height > space.height + EPS) continue
      if (blockers.some((other) => overlaps(box, other))) continue

      let on: string | null = null
      if (box.z > EPS) {
        const obstacle = space.obstacles.find((base) => restsOn(box, base))
        const below = placements.find((base) => restsOn(box, base) && base.weightKg + EPS >= parcel.weightKg)
        if (!obstacle && !below) continue
        on = below?.name ?? obstacle!.label
      }
      return { ...box, id: parcel.id, name: parcel.name, weightKg: parcel.weightKg, rotated: orientation.rotated, on }
    }
  }
  return null
}

function emptyLoad(space: CargoSpace): VehicleLoad {
  return { space, placements: [], weightKg: 0, volumeShare: 0 }
}

function add(load: VehicleLoad, placement: Placement) {
  load.placements.push(placement)
  load.weightKg = Math.round((load.weightKg + placement.weightKg) * 100) / 100
  const free = volume(load.space) - load.space.obstacles.reduce((sum, obstacle) => sum + volume(obstacle), 0)
  load.volumeShare = free > 0 ? load.placements.reduce((sum, item) => sum + volume(item), 0) / free : 1
}

/**
 * Rozloží balíky do vozidiel. Vozidlá sa berú v zadanom poradí a ďalšie sa otvorí,
 * až keď sa balík nezmestí do žiadneho už použitého. Najprv idú najväčšie a najťažšie balíky.
 */
export function planLoading(spaces: CargoSpace[], parcels: Parcel[]): LoadPlan {
  const loads: VehicleLoad[] = []
  const unused = [...spaces]
  const unplaced: Unplaced[] = []
  const ordered = [...parcels].sort(
    (a, b) => b.length * b.width - a.length * a.width || b.weightKg - a.weightKg || b.height - a.height || a.name.localeCompare(b.name, 'sk'),
  )

  for (const parcel of ordered) {
    let placed = false
    for (const load of loads) {
      const place = findPlace(load, parcel)
      if (place) {
        add(load, place)
        placed = true
        break
      }
    }
    if (placed) continue

    const next = unused.findIndex((space) => findPlace(emptyLoad(space), parcel))
    if (next >= 0) {
      const load = emptyLoad(unused.splice(next, 1)[0])
      add(load, findPlace(load, parcel)!)
      loads.push(load)
      continue
    }

    // Prečo nie: zmestil by sa aspoň do prázdneho vozidla?
    const fitsSomewhere = spaces.some((space) => findPlace({ ...emptyLoad(space), space: { ...space, payloadKg: null } }, parcel))
    const liftable = spaces.some((space) => space.payloadKg === null || parcel.weightKg <= space.payloadKg)
    unplaced.push({ parcel, reason: !fitsSomewhere ? 'too-big' : !liftable ? 'too-heavy' : 'no-vehicle' })
  }
  return { loads, unplaced }
}

/** Poradie nakladania: od kabíny dozadu, v každom mieste najprv spodok. */
export function loadingOrder(placements: Placement[]) {
  return [...placements].sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y)
}

/** Kde vo vozidle balík leží, slovom: „vpredu vľavo, na podlahe“. */
export function describePlace(placement: Placement, space: Pick<CargoSpace, 'length' | 'width'>) {
  const third = (value: number, total: number, names: [string, string, string]) => names[Math.min(2, Math.floor((value / total) * 3))]
  const along = third(placement.x + placement.length / 2, space.length, ['vpredu', 'v strede', 'vzadu'])
  const across = third(placement.y + placement.width / 2, space.width, ['vľavo', 'v strede', 'vpravo'])
  const where = along === 'v strede' && across === 'v strede' ? 'v strede' : `${along} ${across}`
  return `${where}, ${placement.on ? `na „${placement.on}“` : 'na podlahe'}`
}
