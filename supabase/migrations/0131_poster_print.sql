-- RigTrack 6.7: plagát inventára do tlačovej fronty – kind „poster“, target_id = firma, label „poster:<druh techniky>“.

do $$
begin
  alter table public.print_queue drop constraint if exists print_queue_kind_check;
  alter table public.print_queue add constraint print_queue_kind_check check (kind in ('equipment', 'case', 'spot', 'poster'));
  alter table public.print_queue drop constraint if exists print_queue_label_check;
  alter table public.print_queue add constraint print_queue_label_check
    check (label in ('qr', 'tape', 'case_label', 'content') or (kind = 'poster' and label ~ '^poster:[a-z_]{1,20}$'));
end;
$$;
