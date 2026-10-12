-- RigTrack: údaje pre flight case štítok.
-- Číslo case v sade (napr. blindre v dvoch cases: 1 a 2), kategória na štítku
-- (Sound, Light, Cables…) a označenie techniky, ktorá sa má na štítok vypísať.

alter table public.cases
  add column label_number text not null default '' check (char_length(label_number) <= 20),
  add column label_category text not null default '' check (char_length(label_category) <= 40);
grant update (label_number, label_category) on public.cases to authenticated;

-- Na štítku je iba hlavný obsah case, nie každý kábel v ňom.
alter table public.equipment add column on_label boolean not null default false;
grant update (on_label) on public.equipment to authenticated;

-- Označenie patrí ku konkrétnemu case: po presune alebo vybratí techniky zaniká.
create function public.reset_on_label()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.case_id is distinct from old.case_id then
    new.on_label := false;
  end if;
  return new;
end;
$$;

create trigger equipment_reset_on_label
  before update of case_id on public.equipment
  for each row execute function public.reset_on_label();

revoke execute on function public.reset_on_label() from public, anon;
