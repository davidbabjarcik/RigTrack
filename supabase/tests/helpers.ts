import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

// Minimum zo Supabase, o ktoré sa migrácie opierajú: roly a auth schéma.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    raw_user_meta_data jsonb default '{}'
  );
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select (auth.jwt() ->> 'sub')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text,
    public boolean,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, delete on storage.objects to authenticated;
`

const MIGRATIONS = 'supabase/migrations'
const BASELINE = 'supabase/baseline.sql'

type Row = Record<string, string>

/** Čistá databáza so všetkými migráciami a pomôckami na dotazy v mene používateľa. */
export async function createTestDb() {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  // Najprv celá databáza naraz (baseline), potom len migrácie novšie ako baseline.
  const baseline = readFileSync(BASELINE, 'utf8')
  const last = Number(baseline.match(/^-- baseline: (\d+)/m)?.[1] ?? 0)
  await db.exec(baseline)
  for (const file of readdirSync(MIGRATIONS).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort()) {
    if (Number(file.slice(0, 4)) <= last) continue
    await db.exec(readFileSync(`${MIGRATIONS}/${file}`, 'utf8'))
  }
  const users: Record<string, string> = {}

  const rows = async (sql: string, params: unknown[] = []) => (await db.query<Row>(sql, params)).rows

  return {
    users,
    /** Dotaz ako superuser — obchádza RLS, len na prípravu a kontrolu dát. */
    rows,
    /** Viac príkazov naraz ako superuser (napr. celý súbor migrácie). */
    exec: (sql: string) => db.exec(sql),

    async signUp(name: string, email: string, confirmed = true) {
      const [row] = await rows('insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id', [
        email,
        confirmed ? new Date().toISOString() : null,
      ])
      users[name] = row.id
    },

    /** Dotaz ako prihlásený používateľ (alebo anon, ak name = null). */
    async as(name: string | null, sql: string, params: unknown[] = []): Promise<Row[]> {
      const claims = name ? JSON.stringify({ sub: users[name] }) : ''
      await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims])
      await db.exec(`set role ${name ? 'authenticated' : 'anon'}`)
      try {
        return await rows(sql, params)
      } finally {
        await db.exec('reset role')
      }
    },
  }
}
