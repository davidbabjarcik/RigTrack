import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '@/components/ui/field'
import { formatDate, formatMoney } from '@/lib/format'
import { orderKeys, searchOrderLines } from './api'

/** Hľadanie v položkách všetkých objednávok: kedy a za koľko sa daný tovar kupoval. */
export function OrderLineSearch({ companyId }: { companyId: string }) {
  const [text, setText] = useState('')
  const query = useDeferredValue(text.trim())
  const active = query.length >= 2
  const lines = useQuery({
    queryKey: orderKeys.lineSearch(companyId, query),
    queryFn: () => searchOrderLines(companyId, query),
    enabled: active,
  })

  return (
    <div className="mb-4">
      <Field
        label="Hľadať v položkách objednávok"
        hideLabel
        type="search"
        placeholder="Hľadať tovar v objednávkach — názov alebo kód (napr. viazačky)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {active && (
        <div className="mt-2 overflow-hidden rounded-xl border bg-surface">
          {lines.isPending ? (
            <p className="p-4 text-sm text-muted-foreground">Hľadám…</p>
          ) : lines.isError ? (
            <p role="alert" className="p-4 text-sm text-destructive">
              Hľadanie zlyhalo.
            </p>
          ) : lines.data.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Tento tovar sa v objednávkach nenašiel.</p>
          ) : (
            <ul className="divide-y">
              {lines.data.map((line) => (
                <li key={line.id}>
                  <Link to={`/orders/${line.orderId}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{line.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[formatDate(line.orderedAt), line.supplier, line.articleNumber && `kód ${line.articleNumber}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-medium">
                      {line.quantity} ks × {formatMoney(line.unitPrice, line.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
