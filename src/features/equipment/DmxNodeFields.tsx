import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { MAX_UNIVERSE, NODE_PROTOCOL_LABELS, NODE_PROTOCOLS, resizePorts, sameUniverse, sequentialUniverses, type NodePort, type NodeProtocol } from './dmxNode'
import type { EquipmentFormValues } from './model'

/** Art-Net / sACN node: aktívne protokoly, počet výstupov a ktorý výstup posiela ktorú universe. */
export function DmxNodeFields() {
  const { control, setValue } = useFormContext<EquipmentFormValues>()
  const protocols = (useWatch({ control, name: 'nodeProtocols' }) ?? []) as NodeProtocol[]
  const ports = (useWatch({ control, name: 'nodePorts' }) ?? []) as NodePort[]
  const [fill, setFill] = useState('')
  const setPorts = (next: NodePort[]) => setValue('nodePorts', next, { shouldDirty: true })
  const setPort = (port: number, patch: Partial<NodePort>) => setPorts(ports.map((item) => (item.port === port ? { ...item, ...patch } : item)))
  const both = protocols.length > 1
  const cell = 'h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm'

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
              onChange={(event) =>
                setValue('nodeProtocols', event.target.checked ? [...protocols, protocol] : protocols.filter((value) => value !== protocol), { shouldDirty: true })
              }
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
            <label className="flex flex-col gap-1">
              Universe
              <input type="number" min={0} max={MAX_UNIVERSE} placeholder="napr. 0 alebo 9" className="h-9 w-32 rounded-md border bg-background px-2" value={fill} onChange={(event) => setFill(event.target.value)} />
            </label>
            <Button variant="outline" size="sm" disabled={fill === ''} onClick={() => setPorts(sameUniverse(ports, Number(fill)))}>
              Všetkým rovnaká
            </Button>
            <Button variant="outline" size="sm" disabled={fill === ''} onClick={() => setPorts(sequentialUniverses(ports, Number(fill)))}>
              Za sebou od nej
            </Button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ports.map((item) => (
              <li key={item.port} className={both ? 'grid grid-cols-[4rem_1fr_7rem] items-center gap-2' : 'grid grid-cols-[4rem_1fr] items-center gap-2'}>
                <span className="text-sm font-medium">Port {item.port}</span>
                <input
                  aria-label={`Universe na porte ${item.port}`}
                  type="number"
                  min={0}
                  max={MAX_UNIVERSE}
                  placeholder="universe"
                  className={cell}
                  value={item.universe ?? ''}
                  onChange={(event) => setPort(item.port, { universe: event.target.value === '' ? null : Math.min(MAX_UNIVERSE, Math.max(0, Number(event.target.value))) })}
                />
                {both && (
                  <select aria-label={`Protokol na porte ${item.port}`} className={cell} value={item.protocol ?? ''} onChange={(event) => setPort(item.port, { protocol: (event.target.value || undefined) as NodeProtocol | undefined })}>
                    <option value="">oba</option>
                    {NODE_PROTOCOLS.map((protocol) => (
                      <option key={protocol} value={protocol}>
                        {NODE_PROTOCOL_LABELS[protocol]}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Rovnaká universe na viacerých portoch = node funguje ako splitter (napr. porty 1–4 = universe 0).</p>
        </>
      )}
    </fieldset>
  )
}
