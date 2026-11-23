import { products, toKhz, TV_FIRST, TV_LAST, tvRange, type RfChannel, type RfSettings } from './rf'

/**
 * Spektrum v rozsahu kanálov: TV kanály (vylúčené šrafované), nosné frekvencie (čiary s menom) a intermodulačné
 * produkty 3. rádu (krátke čiarky dole). Čitateľné aj čiernobielo.
 */
export function Spectrum({ channels, settings, excludedTv, className }: { channels: RfChannel[]; settings: RfSettings; excludedTv: number[]; className?: string }) {
  const carriers = channels.filter((channel) => channel.freq_mhz !== null).map((channel) => ({ id: channel.id, khz: toKhz(channel.freq_mhz!), name: channel.name }))
  const lo = Math.min(470000, ...channels.map((channel) => toKhz(channel.min_mhz)))
  const hi = Math.max(694000, ...channels.map((channel) => toKhz(channel.max_mhz)))
  const width = 1000
  const x = (khz: number) => ((khz - lo) / (hi - lo)) * width
  const imd = products(carriers, false).filter((product) => product.khz >= lo && product.khz <= hi)
  const tv = Array.from({ length: TV_LAST - TV_FIRST + 1 }, (_, index) => TV_FIRST + index).filter((channel) => tvRange(channel).hi > lo && tvRange(channel).lo < hi)
  return (
    <svg viewBox={`0 0 ${width} 120`} className={className} role="img" aria-label="Spektrum">
      <defs>
        <pattern id="rf-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
        </pattern>
      </defs>
      {tv.map((channel) => {
        const range = tvRange(channel)
        const excluded = excludedTv.includes(channel)
        return (
          <g key={channel}>
            <rect x={x(range.lo)} y={20} width={x(range.hi) - x(range.lo)} height={70} fill={excluded ? 'url(#rf-hatch)' : 'transparent'} stroke="currentColor" strokeWidth={0.4} opacity={0.8} />
            <text x={(x(range.lo) + x(range.hi)) / 2} y={104} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.7}>{channel}</text>
          </g>
        )
      })}
      {imd.map((product, index) => (
        <line key={index} x1={x(product.khz)} y1={80} x2={x(product.khz)} y2={90} stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
      ))}
      {[...carriers].sort((a, b) => a.khz - b.khz).map((carrier, index, sorted) => {
        // Popisok len ak je od predošlého dosť ďaleko (inak sa prekrývajú – mená sú v tabuľke).
        const labeled = index === 0 || x(carrier.khz) - x(sorted[index - 1].khz) > 45
        return (
          <g key={carrier.id}>
            <line x1={x(carrier.khz)} y1={14} x2={x(carrier.khz)} y2={90} stroke="currentColor" strokeWidth={1.6} />
            {labeled && <text x={x(carrier.khz)} y={11} fontSize={8} textAnchor="middle" fill="currentColor">{carrier.name.slice(0, 10)}</text>}
          </g>
        )
      })}
      <text x={0} y={118} fontSize={9} fill="currentColor" opacity={0.7}>{`${lo / 1000} MHz`}</text>
      <text x={width} y={118} fontSize={9} textAnchor="end" fill="currentColor" opacity={0.7}>{`${hi / 1000} MHz · IM3 ±${settings.imd3_khz} kHz`}</text>
    </svg>
  )
}
