-- RigTrack 7.9: tlačová fronta si pamätá formát – papier a orientáciu, ako boli nastavené pri pridaní (napr. obsah case
-- na A5 na šírku, plagát na A4 na výšku). Prázdne = podľa nastavení pri tlači.

alter table public.print_queue add column if not exists format text not null default '';
do $$
begin
  alter table public.print_queue drop constraint if exists print_queue_format_check;
  alter table public.print_queue add constraint print_queue_format_check
    check (format in ('', 'A4-portrait', 'A4-landscape', 'A5-portrait', 'A5-landscape'));
end;
$$;
grant insert (format) on public.print_queue to authenticated;
