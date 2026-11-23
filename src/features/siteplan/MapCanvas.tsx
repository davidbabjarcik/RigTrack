import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { OSM_ATTRIBUTION, project, scaleBar, TILE, TILE_URL, unproject, type LatLon, type MapView } from './geo'
import { MARKER_CODES, ROUTE_DASH, type SiteMarker, type SiteRoute } from './model'

type Props = {
  view: MapView
  onViewChange?: (view: MapView) => void
  markers: SiteMarker[]
  routes: SiteRoute[]
  draft?: [number, number][]
  selected?: string | null
  onMapClick?: (point: LatLon) => void
  onSelect?: (id: string) => void
  onMarkerMove?: (id: string, point: LatLon) => void
  height?: number
  className?: string
}

/**
 * Mapa OpenStreetMap (dlaždice 256 px, bez knižnice) s vrstvou značiek a trás. Posun ťahaním, priblíženie tlačidlami
 * (koliesko nechá stránku rolovať). Klik na mapu (onMapClick) pridá bod; značky sa dajú ťahať (onMarkerMove).
 */
export function MapCanvas({ view, onViewChange, markers, routes, draft, selected, onMapClick, onSelect, onMarkerMove, height = 420, className }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const drag = useRef<{ x: number; y: number; moved: boolean; marker: string | null; pointer: number } | null>(null)
  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const center = project(view, view.zoom)
  const origin = { x: center.x - width / 2, y: center.y - height / 2 }
  const toScreen = (lat: number, lon: number) => {
    const point = project({ lat, lon }, view.zoom)
    return { x: point.x - origin.x, y: point.y - origin.y }
  }
  const fromScreen = (x: number, y: number) => unproject({ x: origin.x + x, y: origin.y + y }, view.zoom)
  const max = 2 ** view.zoom
  const tiles: { key: string; x: number; y: number; url: string }[] = []
  for (let tx = Math.floor(origin.x / TILE); tx <= Math.floor((origin.x + width) / TILE); tx++) {
    for (let ty = Math.floor(origin.y / TILE); ty <= Math.floor((origin.y + height) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue
      const wrapped = ((tx % max) + max) % max
      tiles.push({ key: `${view.zoom}/${tx}/${ty}`, x: tx * TILE - origin.x, y: ty * TILE - origin.y, url: TILE_URL(view.zoom, wrapped, ty) })
    }
  }
  const zoomBy = (delta: number) => onViewChange?.({ ...view, zoom: Math.max(3, Math.min(19, view.zoom + delta)) })
  const local = (event: { clientX: number; clientY: number }) => {
    const rect = box.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    const marker = (event.target as Element).closest('[data-marker]')?.getAttribute('data-marker') ?? null
    drag.current = { ...local(event), moved: false, marker: onMarkerMove ? marker : null, pointer: event.pointerId }
    box.current?.setPointerCapture(event.pointerId)
  }
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    const point = local(event)
    const dx = point.x - state.x
    const dy = point.y - state.y
    if (!state.moved && Math.hypot(dx, dy) < 4) return
    state.moved = true
    if (state.marker) {
      onMarkerMove?.(state.marker, fromScreen(point.x, point.y))
      return
    }
    if (!onViewChange) return
    const next = unproject({ x: center.x - dx, y: center.y - dy }, view.zoom)
    state.x = point.x
    state.y = point.y
    onViewChange({ ...view, lat: next.lat, lon: next.lon })
  }
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    drag.current = null
    if (!state || state.moved) return
    const target = (event.target as Element).closest('[data-select]')?.getAttribute('data-select')
    if (target && onSelect) return onSelect(target)
    const point = local(event)
    onMapClick?.(fromScreen(point.x, point.y))
  }
  const bar = scaleBar(view.lat, view.zoom, 120)
  const line = (points: [number, number][]) => points.map(([lat, lon]) => toScreen(lat, lon)).map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div
      ref={box}
      className={`relative overflow-hidden rounded-xl border bg-muted select-none ${className ?? ''}`}
      style={{ height, touchAction: 'none', cursor: onMapClick ? 'crosshair' : 'grab' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      role="application"
      aria-label="Mapa"
    >
      {tiles.map((tile) => (
        <img key={tile.key} src={tile.url} alt="" draggable={false} crossOrigin="anonymous" referrerPolicy="strict-origin-when-cross-origin" className="pointer-events-none absolute max-w-none" style={{ left: tile.x, top: tile.y, width: TILE, height: TILE }} />
      ))}
      <svg className="absolute inset-0" width={width} height={height}>
        {routes.map((route) => (
          <polyline key={route.id} data-select={route.id} points={line(route.points)} fill="none" stroke={selected === route.id ? '#2563eb' : '#111827'} strokeWidth={selected === route.id ? 5 : 3.5} strokeDasharray={ROUTE_DASH[route.kind] || undefined} strokeLinecap="round" strokeLinejoin="round" style={{ cursor: onSelect ? 'pointer' : undefined }} />
        ))}
        {draft && draft.length > 0 && <polyline points={line(draft)} fill="none" stroke="#2563eb" strokeWidth={3} strokeDasharray="6 4" />}
        {draft?.map(([lat, lon], index) => {
          const point = toScreen(lat, lon)
          return <circle key={index} cx={point.x} cy={point.y} r={4} fill="#2563eb" />
        })}
        {markers.map((marker) => {
          const point = toScreen(marker.lat, marker.lon)
          const active = selected === marker.id
          return (
            <g key={marker.id} data-marker={marker.id} data-select={marker.id} transform={`translate(${point.x} ${point.y})`} style={{ cursor: onMarkerMove ? 'move' : onSelect ? 'pointer' : undefined }}>
              <circle r={13} fill="#ffffff" stroke={active ? '#2563eb' : '#111827'} strokeWidth={active ? 4 : 2.5} />
              <text y={4.5} fontSize={11} fontWeight={800} textAnchor="middle" fill="#111827">{MARKER_CODES[marker.kind]}</text>
              {marker.label && (
                <text x={17} y={4} fontSize={12} fontWeight={700} fill="#111827" stroke="#ffffff" strokeWidth={3} paintOrder="stroke">{marker.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      {onViewChange && (
        <div className="absolute top-2 right-2 flex flex-col overflow-hidden rounded-lg border bg-surface shadow" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Priblížiť" className="p-2 hover:bg-muted" onClick={() => zoomBy(1)}><Plus className="size-4" aria-hidden /></button>
          <button type="button" aria-label="Oddialiť" className="border-t p-2 hover:bg-muted" onClick={() => zoomBy(-1)}><Minus className="size-4" aria-hidden /></button>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1 left-2 flex items-end gap-1 text-[11px] font-semibold text-black">
        <span className="block h-1.5 border-x-2 border-b-2 border-black" style={{ width: bar.px }} />
        <span className="rounded bg-white/80 px-1">{`${bar.meters} m`}</span>
      </div>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="absolute right-0 bottom-0 bg-white/80 px-1 text-[10px] text-black" onPointerDown={(event) => event.stopPropagation()}>
        {OSM_ATTRIBUTION}
      </a>
    </div>
  )
}
