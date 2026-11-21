-- RigTrack 10.11: upozornenie „treba dokúpiť“. Keď zásoba techniky s nastavenou hranicou (min_quantity) klesne na
-- hranicu alebo pod ňu, príde upozornenie tým, čo zapisujú objednávky. Len pri prekročení hranice (nie pri každej
-- ďalšej zmene pod ňou), takže sa neopakuje, kým sa zásoba nedoplní.

create or replace function public.notify_restock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.min_quantity is null or new.quantity > new.min_quantity then
    return new;
  end if;
  if old.min_quantity is not null and old.quantity <= old.min_quantity then
    return new;
  end if;
  if new.status::text in ('sold', 'retired') then
    return new;
  end if;
  insert into public.notifications (user_id, company_id, title, body, url)
  select m.user_id, new.company_id, left('Treba dokúpiť: ' || new.name, 120),
    case when new.quantity = 0 then 'Došlo.' else 'Ostáva ' || new.quantity || ' ks (hranica ' || new.min_quantity || ').' end,
    '/orders/new?restock=' || new.id
  from public.company_members m
  where m.company_id = new.company_id and public.user_can(new.company_id, m.user_id, 'orders.edit');
  return new;
end;
$$;
revoke execute on function public.notify_restock() from public, anon, authenticated;

drop trigger if exists equipment_notify_restock on public.equipment;
create trigger equipment_notify_restock
  after update of quantity, min_quantity on public.equipment
  for each row execute function public.notify_restock();
