-- RigTrack 5.15: do tlačovej fronty aj štítok case (case_label) a hárok s obsahom case (content), nielen QR a páska.

do $$
begin
  alter table public.print_queue drop constraint if exists print_queue_label_check;
  alter table public.print_queue add constraint print_queue_label_check check (label in ('qr', 'tape', 'case_label', 'content'));
end;
$$;
