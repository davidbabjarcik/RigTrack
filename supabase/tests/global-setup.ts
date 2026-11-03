import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestProject } from 'vitest/node'
import { buildMigratedDb } from './helpers'

// Databázu so všetkými migráciami postaví raz za beh testov a uloží ako snímku; každý databázový test si ju
// len načíta (namiesto ~4 s stavby od nuly). Pri chybe stavby si ju testy postavia samy a chybu ukážu.
declare module 'vitest' {
  export interface ProvidedContext {
    dbSnapshot: string
  }
}

export default async function setup(project: TestProject) {
  const dir = mkdtempSync(join(tmpdir(), 'rigtrack-db-'))
  const file = join(dir, 'snapshot.tar')
  try {
    const db = await buildMigratedDb()
    const dump = await db.dumpDataDir('none')
    writeFileSync(file, Buffer.from(await dump.arrayBuffer()))
    await db.close()
  } catch {
    // testy postavia databázu samy
  }
  project.provide('dbSnapshot', file)
  return () => rmSync(dir, { recursive: true, force: true })
}
