import { Link } from 'react-router-dom'
import { tx } from '@/lib/i18n'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <p className="text-muted-foreground">{tx('Táto stránka neexistuje.')}</p>
      <Link to="/" className="font-medium text-accent underline-offset-4 hover:underline">{tx('Späť na prehľad')}</Link>
    </div>
  )
}
