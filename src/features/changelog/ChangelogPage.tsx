import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import readme from '../../../README.md?raw'
import { forUsers, parseChangelog, parseInline, sameVersion } from './parse'

function Inline({ text }: { text: string }) {
  return parseInline(text).map((part, index) =>
    part.kind === 'bold' ? (
      <strong key={index}>{part.text}</strong>
    ) : part.kind === 'code' ? (
      <code key={index} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
        {part.text}
      </code>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  )
}

const releases = parseChangelog(readme).map(forUsers)

/** Verzie podľa hlavného čísla (3.x, 2.x…) do bočného zoznamu na PC. */
const majors = [...new Set(releases.map((release) => release.version.split('.')[0]))].map((major) => ({
  major,
  versions: releases.filter((release) => release.version.split('.')[0] === major).map((release) => release.version),
}))
const anchor = (version: string) => `v${version.replace(/\./g, '-')}`

/** Čo je nové v jednotlivých verziách (zo sekcie README „Čo je nové“). Na PC s bočným zoznamom verzií. */
export function ChangelogPage() {
  const navigate = useNavigate()
  return (
    <div className="w-full">
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Späť
      </button>
      <h1 className="text-3xl font-semibold tracking-tight">Čo je nové</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Máte verziu {APP_VERSION}. Najnovšie zmeny sú hore.</p>
      <div className="grid items-start gap-6 lg:grid-cols-[11rem_1fr]">
        <nav aria-label="Verzie" className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] overflow-y-auto pr-2 lg:block">
          {majors.map((group) => (
            <div key={group.major} className="mb-4">
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Verzia {group.major}</p>
              <ul className="flex flex-col">
                {group.versions.map((version) => (
                  <li key={version}>
                    <a
                      href={`#${anchor(version)}`}
                      className={cn(
                        'block rounded-md px-2 py-1 text-sm hover:bg-muted',
                        sameVersion(APP_VERSION, version) ? 'font-medium text-accent' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {version}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <ol className="relative flex flex-col gap-4 lg:border-l lg:pl-6">
          {releases.map((release, index) => (
            <li key={release.version} id={anchor(release.version)} className={cn('relative scroll-mt-4 rounded-xl border bg-surface p-5', index === 0 && 'border-accent/50')}>
              <span aria-hidden className={cn('absolute top-6 -left-[1.95rem] hidden size-3 rounded-full border-2 border-background lg:block', index === 0 ? 'bg-accent' : 'bg-muted-foreground/40')} />
              <h2 className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold">Verzia {release.version}</span>
                {release.date && <span className="text-sm text-muted-foreground">{release.date}</span>}
                {index === 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">najnovšia</span>}
                {sameVersion(APP_VERSION, release.version) && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">vaša verzia</span>
                )}
              </h2>
              {release.blocks.map((block, blockIndex) =>
                block.kind === 'list' ? (
                  <ul key={blockIndex} className="mt-3 grid list-disc gap-x-8 gap-y-1.5 pl-5 text-sm leading-relaxed xl:grid-cols-2">
                    {block.items.map((item) => (
                      <li key={item}>
                        <Inline text={item} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={blockIndex} className="mt-3 text-sm text-muted-foreground">
                    <Inline text={block.text} />
                  </p>
                ),
              )}
            </li>
          ))}
        </ol>
      </div>
      {releases.length === 0 && <p className="text-sm text-muted-foreground">Zoznam zmien nie je k dispozícii.</p>}
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-accent hover:underline">
          Na prehľad
        </Link>
      </p>
    </div>
  )
}
