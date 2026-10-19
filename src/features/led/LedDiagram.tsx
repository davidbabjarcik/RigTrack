import { Download } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { downloadText, safeFileName } from '@/lib/download'
import type { LedInput, LedResult } from './model'

const fmt = (value: number) => value.toLocaleString('sk-SK', { maximumFractionDigits: 2 })

/**
 * Nákres steny: mriežka panelov, truss, veže brány alebo podpery, závesné body a rozmery.
 * Farby sú pevné (nie témy), aby stiahnutý obrázok vyzeral rovnako všade.
 */
export function LedDiagram({ input, result, name }: { input: LedInput; result: LedResult; name: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const scale = 60 // px na meter
  const pad = 50
  const wallW = result.widthM * scale
  const wallH = result.heightM * scale
  const overhang = input.mount === 'stacked' ? 0 : input.overhangM * scale
  const trussH = input.mount === 'stacked' ? 0 : 0.3 * scale
  const clearance = input.mount === 'goalpost' ? input.clearanceM * scale : input.mount === 'flown' ? 0.5 * scale : 0
  const tower = input.mount === 'goalpost' ? 0.3 * scale : 0
  const width = wallW + 2 * overhang + 2 * tower + 2 * pad
  const height = wallH + trussH + clearance + 2 * pad + (input.mount === 'flown' ? 30 : 0)
  const left = pad + overhang + tower
  const trussY = pad + (input.mount === 'flown' ? 30 : 0)
  const wallTop = trussY + trussH
  const floorY = wallTop + wallH + clearance
  const cellW = wallW / result.columns
  const cellH = wallH / result.rows
  const trussLeft = pad + tower
  const trussW = wallW + 2 * overhang
  const points = input.mount === 'flown' && result.rigging ? result.rigging.points : 0

  function download() {
    if (!svg.current) return
    const xml = new XMLSerializer().serializeToString(svg.current)
    downloadText(`${safeFileName(name, 'led-stena')}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, 'image/svg+xml')
  }

  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Nákres</h2>
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="size-4" aria-hidden />
          Stiahnuť obrázok
        </Button>
      </div>
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} className="h-auto w-full rounded-lg bg-white" role="img" aria-label={`Nákres LED steny ${fmt(result.widthM)} × ${fmt(result.heightM)} m`}>
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        {/* Podlaha */}
        <line x1={pad / 2} x2={width - pad / 2} y1={floorY} y2={floorY} stroke="#64748b" strokeWidth={2} />
        {/* Panely */}
        {Array.from({ length: result.rows }, (_, row) =>
          Array.from({ length: result.columns }, (_, column) => (
            <rect key={`${row}-${column}`} x={left + column * cellW} y={wallTop + row * cellH} width={cellW} height={cellH} fill="#0f172a" stroke="#38bdf8" strokeWidth={1} />
          )),
        )}
        {/* Truss */}
        {trussH > 0 && (
          <g>
            <rect x={trussLeft} y={trussY} width={trussW} height={trussH} fill="#e2e8f0" stroke="#475569" strokeWidth={1.5} />
            {Array.from({ length: Math.max(1, Math.floor(trussW / trussH)) }, (_, index) => (
              <line key={index} x1={trussLeft + index * trussH} x2={trussLeft + (index + 1) * trussH} y1={trussY + trussH} y2={trussY} stroke="#94a3b8" strokeWidth={1} />
            ))}
          </g>
        )}
        {/* Veže brány */}
        {input.mount === 'goalpost' &&
          [pad, pad + tower + trussW].map((x) => (
            <g key={x}>
              <rect x={x} y={trussY} width={tower} height={floorY - trussY} fill="#e2e8f0" stroke="#475569" strokeWidth={1.5} />
              <rect x={x - 8} y={floorY - 4} width={tower + 16} height={6} fill="#475569" />
            </g>
          ))}
        {/* Závesné body s motormi */}
        {Array.from({ length: points }, (_, index) => {
          const x = trussLeft + (points === 1 ? trussW / 2 : (index * trussW) / (points - 1))
          return (
            <g key={index}>
              <line x1={x} x2={x} y1={pad - 10} y2={trussY} stroke="#dc2626" strokeWidth={2} />
              <rect x={x - 7} y={trussY - 22} width={14} height={12} fill="#dc2626" rx={2} />
            </g>
          )
        })}
        {/* Podpery ground stacku */}
        {input.mount === 'stacked' && <rect x={left - 6} y={floorY - 6} width={wallW + 12} height={6} fill="#475569" />}
        {/* Rozmery */}
        <g fontFamily="sans-serif" fontSize={13} fill="#0f172a">
          <line x1={left} x2={left + wallW} y1={floorY + 22} y2={floorY + 22} stroke="#0f172a" />
          <text x={left + wallW / 2} y={floorY + 38} textAnchor="middle">
            {fmt(result.widthM)} m · {result.columns} panelov
          </text>
          <line x1={left + wallW + overhang + tower + 18} x2={left + wallW + overhang + tower + 18} y1={wallTop} y2={wallTop + wallH} stroke="#0f172a" />
          <text x={left + wallW + overhang + tower + 24} y={wallTop + wallH / 2} dominantBaseline="middle">
            {fmt(result.heightM)} m
          </text>
          <text x={left + wallW / 2} y={wallTop + wallH / 2} textAnchor="middle" dominantBaseline="middle" fill="#e0f2fe" fontSize={15} fontWeight={600}>
            {result.resolution.w} × {result.resolution.h} px
          </text>
        </g>
      </svg>
    </div>
  )
}
