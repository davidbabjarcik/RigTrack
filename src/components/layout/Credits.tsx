import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CREDITS, type CreditIcon } from '@/lib/credits'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'

// Značky sietí nie sú v sade ikon aplikácie, preto sú tu ako vlastné SVG.
const ICONS: Record<CreditIcon, { viewBox: string; filled: boolean; shape: ReactNode }> = {
  instagram: {
    viewBox: '0 0 24 24',
    filled: false,
    shape: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.25" cy="6.75" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  linkedin: {
    viewBox: '0 0 24 24',
    filled: false,
    shape: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 11v6" />
        <circle cx="8" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
        <path d="M12 17v-6m0 2.5c0-1.5 1-2.5 2.25-2.5S16.5 12 16.5 13.5V17" />
      </>
    ),
  },
  discord: {
    viewBox: '0 0 24 24',
    filled: true,
    shape: (
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    ),
  },
  github: {
    viewBox: '0 0 16 16',
    filled: true,
    shape: (
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    ),
  },
}

/** Pätička s podpisom autora a odkazmi na jeho profily. */
export function Credits({ className }: { className?: string }) {
  const links = CREDITS.links.filter((link) => link.url)
  return (
    <footer className={cn('flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground print:hidden', className)}>
      <span>
        Made by {CREDITS.author} © {new Date().getFullYear()}
      </span>
      <Link to="/changelog" className="hover:text-foreground hover:underline" title="Čo je nové v jednotlivých verziách">
        RigTrack v{APP_VERSION}
      </Link>
      <span className="flex items-center gap-1">
        {links.map((link) => {
          const icon = ICONS[link.icon]
          return (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
              title={link.label}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground"
            >
              <svg
                viewBox={icon.viewBox}
                className="size-4"
                fill={icon.filled ? 'currentColor' : 'none'}
                stroke={icon.filled ? 'none' : 'currentColor'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {icon.shape}
              </svg>
            </a>
          )
        })}
      </span>
    </footer>
  )
}
