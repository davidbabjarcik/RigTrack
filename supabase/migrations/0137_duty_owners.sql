-- RigTrack 7.2: komu činnosť patrí – konkrétni členovia a / alebo roly (napr. „Fotky na soc. siete“ → soc. media maker,
-- „Kontrola kabeláže“ → rola skladník). Pri evente sa títo ľudia ponúknu na jedno kliknutie.

alter table public.company_duty_types add column if not exists owner_ids uuid[] not null default '{}';
alter table public.company_duty_types add column if not exists owner_roles text[] not null default '{}';
do $$
begin
  alter table public.company_duty_types drop constraint if exists company_duty_types_owners_check;
  alter table public.company_duty_types add constraint company_duty_types_owners_check
    check (cardinality(owner_ids) <= 30 and cardinality(owner_roles) <= 10
      and owner_roles <@ array['admin', 'ceo', 'technik', 'skladnik', 'viewer', 'helper']::text[]);
end;
$$;
grant update (owner_ids, owner_roles) on public.company_duty_types to authenticated;
