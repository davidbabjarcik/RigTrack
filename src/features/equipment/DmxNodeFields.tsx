import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { MAX_UNIVERSE, NODE_PROTOCOL_LABELS, NODE_PROTOCOLS, normalizePort, resizePorts, sameUniverse, sequentialUniverses, type NodePort, type NodeProtocol } from './dmxNode'
import type { EquipmentFormValues } from './model'

/**
 * Art-Net / sACN node: aktuálne zapnuté protokoly, počet výstupov a ktorú universe posiela každý port –
 * pre Art-Net a sACN zvlášť (napr. port 1 = Art-Net 0, sACN 9).
 */
export function DmxNodeFields() {
  const { control, setValue } = useFormContext<EquipmentFormValues>()
  const protocols = (useWatch({ control, name: 'nodeProtocols' }) ?? []) as NodeProtocol[]
  const ports = ((useWatch({ control, name: 'nodePorts' }) ?? []) as NodePort[]).map(normalizePort)
  const [fill, setFill] = useState('')
  const [fillProtocol, setFillProtocol] = useState<NodeProtocol>('artnet')
  const setPorts = (next: NodePort[]) => setValue('nodePorts', next, { shouldDirty: true })
  const setPort = (port: number, patch: Partial<NodePort>) => setPorts(ports.map((item) => (item.port === port ? { ...item, ...patch } : item)))
  const active = protocols.length > 0 ? NODE_PROTOCOLS.filter((protocol) => protocols.includes(protocol)) : [...NODE_PROTOCOLS]
  const cell = 'h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm'
  const number = (value: string) => (value === '' ? null : Math.min(MAX_UNIVERSE, Math.max(0, Math.trunc(Number(value)))))

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-medium">Art-Net / sACN node</legend>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">Aktuálne zapnuté:</span>
        {NODE_PROTOCOLS.map((protocol) => (
          <label key={protocol} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={protocols.includes(protocol)}
              onChange={(event) => setValue('nodeProtocols', event.target.checked ? [...protocols, protocol] : protocols.filter((value) => value !== protocol), { shouldDirty: true })}
            />
            {NODE_PROTOCOL_LABELS[protocol]}
          </label>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          Výstupov (portov)
          <input type="number" min={0} max={64} className="h-9 w-20 rounded-md border bg-background px-2" value={ports.length || ''} onChange={(event) => setPorts(resizePorts(ports, Number(event.target.value) || 0))} />
        </label>
      </div>
      {ports.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-2 text-sm">
            {active.length > 1 && (
              <label className="flex flex-col gap-1">
                Protokol
                <select className="h-9 rounded-md border bg-background px-2" value={fillProtocol} onChange={(event) => setFillProtocol(event.target.value as NodeProtocol)}>
                  {active.map((protocol) => (
                    <option key={protocol} value={protocol}>
                      {NODE_PROTOCOL_LABELS[protocol]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1">
              Universe
              <input type="number" min={0} max={MAX_UNIVERSE} placeholder="napr. 0 alebo 9" className="h-9 w-32 rounded-md border bg-background px-2" value={fill} onChange={(event) => setFill(event.target.value)} />
            </label>
            <Button variant="outline" size="sm" disabled={fill === ''} onClick={() => setPorts(sameUniverse(ports, active.length > 1 ? fillProtocol : active[0], Number(fill)))}>
              Všetkým rovnaká
            </Button>
            <Button variant="outline" size="sm" disabled={fill === ''} onClick={() => setPorts(sequentialUniverses(ports, active.length > 1 ? fillProtocol : active[0], Number(fill)))}>
              Za sebou od nej
            </Button>
          </div>
          <div className={active.length > 1 ? 'grid grid-cols-[4rem_1fr_1fr] gap-x-2 text-xs text-muted-foreground' : 'grid grid-cols-[4rem_1fr] gap-x-2 text-xs text-muted-foreground'} aria-hidden>
            <span />
            {active.map((protocol) => (
              <span key={protocol}>{NODE_PROTOCOL_LABELS[protocol]} universe</span>
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {ports.map((item) => (
              <li key={item.port} className={active.length > 1 ? 'grid grid-cols-[4rem_1fr_1fr] items-center gap-2' : 'grid grid-cols-[4rem_1fr] items-center gap-2'}>
                <span className="text-sm font-medium">Port {item.port}</span>
                {active.map((protocol) => (
                  <input
                    key={protocol}
                    aria-label={`${NODE_PROTOCOL_LABELS[protocol]} universe na porte ${item.port}`}
                    type="number"
                    min={0}
                    max={MAX_UNIVERSE}
                    placeholder="—"
                    className={cell}
                    value={item[protocol] ?? ''}
                    onChange={(event) => setPort(item.port, { [protocol]: number(event.target.value) })}
                  />
                ))}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Rovnaká universe na viacerých portoch = node funguje ako splitter (napr. porty 1–4 = universe 0). Prázdne = protokol na porte nie je.</p>
        </>
      )}
    </fieldset>
  )
}
