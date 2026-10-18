import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { APP_VERSION } from '@/lib/version'
import readme from '../../../README.md?raw'
import { parseChangelog, parseInline } from './parse'

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

const releases = parseChangelog(readme)

/** Čo je nové v jednotlivých verziách (zo sekcie README „Čo je nové“). */
export function ChangelogPage() {
  const navigate = useNavigate()
  return (
    <div className="w-full max-w-2xl">
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Späť
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">Čo je nové</h1>
      <p className="mt-1 mb-6 text-muted-foreground">Máte verziu {APP_VERSION}. Najnovšie zmeny sú hore.</p>
      <ol className="flex flex-col gap-4">
        {releases.map((release) => (
          <li key={release.version} className="rounded-xl border bg-surface p-4">
            <h2 className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-semibold">Verzia {release.version}</span>
              {release.date && <span className="text-sm text-muted-foreground">{release.date}</span>}
              {APP_VERSION.startsWith(release.version) && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">vaša verzia</span>
              )}
            </h2>
            {release.blocks.map((block, index) =>
              block.kind === 'list' ? (
                <ul key={index} className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {block.items.map((item) => (
                    <li key={item}>
                      <Inline text={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={index} className="mt-2 text-sm text-muted-foreground">
                  <Inline text={block.text} />
                </p>
              ),
            )}
          </li>
        ))}
      </ol>
      {releases.length === 0 && <p className="text-sm text-muted-foreground">Zoznam zmien nie je k dispozícii.</p>}
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-accent hover:underline">
          Na prehľad
        </Link>
      </p>
    </div>
  )
}
