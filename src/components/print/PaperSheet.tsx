import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { A4_WIDTH_PX } from '@/lib/printSheet'
import { cn } from '@/lib/utils'

/**
 * Hárok A4 na obrazovke: vždy v šírke A4 a na úzkom displeji (mobil) celý zmenšený, aby vyzeral
 * presne ako vytlačený papier. Pri tlači z počítača sa zmenšenie a okraje vypnú (okraje dá @page).
 */
export function PaperSheet({
  children,
  className,
  marginMm = 14,
  landscape = false,
  sheetRef,
}: {
  children: ReactNode
  className?: string
  marginMm?: number
  landscape?: boolean
  sheetRef?: RefObject<HTMLDivElement | null>
}) {
  const box = useRef<HTMLDivElement>(null)
  const width = landscape ? Math.round((A4_WIDTH_PX * 297) / 210) : A4_WIDTH_PX
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const fit = () => {
      const available = box.current?.clientWidth ?? width
      setZoom(Math.min(1, available / width))
    }
    fit()
    const observer = new ResizeObserver(fit)
    if (box.current) observer.observe(box.current)
    return () => observer.disconnect()
  }, [width])
  return (
    <div ref={box} className="w-full print:block">
      <div
        ref={sheetRef}
        style={{ '--sheet-zoom': zoom, width, minHeight: Math.round((width * (landscape ? 210 : 297)) / (landscape ? 297 : 210)), padding: `${marginMm}mm` } as CSSProperties}
        className={cn(
          'mx-auto bg-white text-black shadow-sm [color-scheme:light] [zoom:var(--sheet-zoom)] print:!w-auto print:!min-h-0 print:!p-0 print:shadow-none print:[zoom:1]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
