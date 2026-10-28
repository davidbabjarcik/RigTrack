-- RigTrack 4.15: farby dĺžok káblov zvlášť pre typ kábla – XLR / DMX, powerCON, 230 V.
-- Prázdny typ ('') = ostatné káble; doterajšie farby ostávajú tam a platia, kým typ nemá vlastnú.

alter table public.cable_colors add column if not exists cable_type text not null default '';

do $$
begin
  alter table public.cable_colors drop constraint if exists cable_colors_cable_type_check;
  alter table public.cable_colors add constraint cable_colors_cable_type_check check (cable_type in ('', 'xlr', 'powercon', '230'));
  -- Jedna farba na firmu, typ a dĺžku (predtým na firmu a dĺžku).
  if not exists (
    select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.cable_colors'::regclass and c.contype = 'p' and a.attname = 'cable_type'
  ) then
    alter table public.cable_colors drop constraint if exists cable_colors_pkey;
    alter table public.cable_colors add constraint cable_colors_pkey primary key (company_id, cable_type, length_m);
  end if;
end;
$$;

grant select, insert, delete, update (name, color) on public.cable_colors to authenticated;
