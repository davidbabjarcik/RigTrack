-- RigTrack: kto techniku vydal a kto ju prijal späť.
-- Pri vydaní a pri vrátení výpožičky sa zapíše meno prihláseného používateľa, aby ho
-- zapožičacia listina vedela vytlačiť spolu s dátumom. Meno sa kopíruje (nie odkaz na
-- profil), takže na listine ostane, aj keď človek z firmy odíde.

alter table public.loans
  add column issued_by_name text not null default '',
  add column returned_by_name text not null default '';

create function public.stamp_loan_handover()
returns trigger language plpgsql set search_path = '' as $$
declare
  _name text;
begin
  if new.status is distinct from old.status and (new.status = 'issued' or old.status = 'issued') then
    select coalesce(nullif(trim(p.full_name), ''), p.email, '') into _name from public.profiles p where p.id = auth.uid();
    if new.status = 'issued' then
      new.issued_by_name := coalesce(_name, '');
    else
      new.returned_by_name := coalesce(_name, '');
    end if;
  end if;
  return new;
end;
$$;

create trigger loans_stamp_handover
  before update of status on public.loans
  for each row execute function public.stamp_loan_handover();

revoke execute on function public.stamp_loan_handover() from public, anon;
