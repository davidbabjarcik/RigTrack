-- RigTrack 7.10: IP tabuľka a MAC adresy do tlačovej fronty – kind „network“, target_id = sieť (alebo firma = všetky),
-- label „ip“ alebo „mac“.

do $$
begin
  alter table public.print_queue drop constraint if exists print_queue_kind_check;
  alter table public.print_queue add constraint print_queue_kind_check check (kind in ('equipment', 'case', 'spot', 'poster', 'event', 'network'));
  alter table public.print_queue drop constraint if exists print_queue_label_check;
  alter table public.print_queue add constraint print_queue_label_check
    check (label in ('qr', 'tape', 'case_label', 'content')
      or (kind = 'poster' and label ~ '^poster:[a-z_]{1,20}$')
      or (kind = 'event' and label in ('patch', 'dmx'))
      or (kind = 'network' and label in ('ip', 'mac')));
end;
$$;
