// Zloží supabase/update-all.sql: všetky migrácie od 0086 po najnovšiu a na koniec opravné 0071 a 0072.
// Súbor sa celý vloží do Supabase → SQL Editor a spustí naraz. Dá sa spustiť aj opakovane
// (migrácie sú napísané tak, aby druhé spustenie nič nepokazilo).
// Spustenie: npm run db:update
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const DIR = 'supabase/migrations'
const FROM = 86
const files = readdirSync(DIR)
  .filter((name) => /^\d{4}_.*\.sql$/.test(name) && Number(name.slice(0, 4)) >= FROM)
  .sort()
const repairs = readdirSync(DIR).filter((name) => /^007[12]_.*\.sql$/.test(name)).sort()
const last = files[files.length - 1].slice(0, 4)

const parts = [
  `-- RigTrack: aktualizácia databázy – migrácie 0086 až ${last} a opravné 0071 a 0072 v jednom súbore.`,
  '-- Vložte celý súbor do Supabase → SQL Editor a stlačte Run. Spustiť sa dá aj znova (napr. po ďalšej verzii).',
  '-- Súbor sa generuje príkazom npm run db:update – neupravujte ho ručne.',
  '',
  ...[...files, ...repairs].map((name) => `-- ===== ${name} =====\n${readFileSync(`${DIR}/${name}`, 'utf8').trim()}\n`),
]
writeFileSync('supabase/update-all.sql', parts.join('\n'))
console.log(`supabase/update-all.sql: ${files.length} migrácií (0086–${last}) + ${repairs.join(', ')}`)
