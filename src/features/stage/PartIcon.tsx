import { cn } from '@/lib/utils'

export type PartKind = 'deck' | 'leg' | 'lath' | 'skirt' | 'clip' | 'railing' | 'diagonal' | 'stairs' | 'accessory'

// Vlastné jednoduché náčrty dielov (nie fotky výrobcu), aby bolo hneď vidieť, o čo ide.
const SHAPES: Record<PartKind, React.ReactNode> = {
  deck: (
    <>
      <path d="M4 14 L14 9 L28 14 L18 19 Z" />
      <path d="M4 14 V17 L18 22 V19 M18 22 L28 17 V14" />
      <path d="M16 11.5 L22 14" strokeWidth={2.5} />
    </>
  ),
  leg: (
    <>
      <rect x="13" y="4" width="6" height="3" rx="1" />
      <path d="M16 7 V25" strokeWidth={3} />
      <path d="M11 27 H21" />
    </>
  ),
  lath: (
    <>
      <path d="M4 13 H28 V19 H4 Z" />
      <path d="M8 19 V22 H24 V19" />
    </>
  ),
  skirt: (
    <>
      <path d="M4 7 H28" strokeWidth={2.5} />
      <path d="M5 8 Q8 18 6 26 M11 8 Q14 18 12 26 M17 8 Q20 18 18 26 M23 8 Q26 18 24 26" />
    </>
  ),
  clip: (
    <>
      <path d="M10 6 H22 V12 L18 26 H14 L10 12 Z" />
      <path d="M13 10 H19" />
    </>
  ),
  railing: (
    <>
      <path d="M5 8 H27 M5 16 H27" />
      <path d="M6 8 V26 M26 8 V26 M16 8 V16" />
    </>
  ),
  diagonal: (
    <>
      <path d="M7 5 V27 M25 5 V27" strokeWidth={2.5} />
      <path d="M7 24 L25 8" />
    </>
  ),
  stairs: <path d="M4 26 V21 H10 V16 H16 V11 H22 V6 H28 V26 Z" />,
  accessory: (
    <>
      <circle cx="16" cy="16" r="5" />
      <path d="M16 5 V9 M16 23 V27 M5 16 H9 M23 16 H27 M8.5 8.5 L11 11 M21 21 L23.5 23.5 M8.5 23.5 L11 21 M21 11 L23.5 8.5" />
    </>
  ),
}

/** Malý náčrt dielu pódia. */
export function PartIcon({ kind, className }: { kind: PartKind; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0 text-yellow-600 dark:text-yellow-400', className)} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {SHAPES[kind]}
    </svg>
  )
}

