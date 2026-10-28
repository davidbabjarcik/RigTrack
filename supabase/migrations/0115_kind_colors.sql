-- RigTrack 5.1: farby druhov techniky (Svetlo, Zvuk, Pódium…) pre celú firmu – farebný pruh v zozname techniky
-- pri technike bez kategórie (alebo s kategóriou bez farby). Doteraz boli pevné (svetlo zelená, zvuk ružová…).

create table if not exists public.kind_colors (
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  color text not null check (color in ('green', 'pink', 'yellow', 'red', 'blue', 'purple', 'orange', 'teal', 'gray', 'none')),
  primary key (company_id, kind)
);

alter table public.kind_colors enable row level security;
revoke all on public.kind_colors from anon, authenticated;
grant select, insert, delete, update (color) on public.kind_colors to authenticated;

drop policy if exists kind_colors_select on public.kind_colors;
create policy kind_colors_select on public.kind_colors for select to authenticated using (public.is_company_member(company_id));
drop policy if exists kind_colors_insert on public.kind_colors;
create policy kind_colors_insert on public.kind_colors for insert to authenticated with check (public.can(company_id, 'lookups.manage'));
drop policy if exists kind_colors_update on public.kind_colors;
create policy kind_colors_update on public.kind_colors for update to authenticated
  using (public.can(company_id, 'lookups.manage')) with check (public.can(company_id, 'lookups.manage'));
drop policy if exists kind_colors_delete on public.kind_colors;
create policy kind_colors_delete on public.kind_colors for delete to authenticated using (public.can(company_id, 'lookups.manage'));
