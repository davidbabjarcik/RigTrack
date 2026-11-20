-- 0179: podpis zmluvy klientom cez odkaz (bez prihlásenia).
-- Kto upravuje eventy, vytvorí k uloženej zmluve tajný odkaz; klient cez neho zmluvu prečíta a raz ju podpíše
-- za seba (objednávateľ / nájomca). Nič iné z firmy cez odkaz nevidí. Kto zmluvu uložil, dostane upozornenie.

alter table public.event_contracts add column if not exists share_token uuid;
create unique index if not exists event_contracts_share_token_idx on public.event_contracts (share_token) where share_token is not null;

create or replace function public.share_contract(_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _token uuid;
begin
  select company_id, share_token into _company, _token from public.event_contracts where id = _id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Zmluva neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _token is null then
    _token := gen_random_uuid();
    update public.event_contracts set share_token = _token where id = _id;
  end if;
  return _token;
end;
$$;
revoke execute on function public.share_contract(uuid) from public, anon;
grant execute on function public.share_contract(uuid) to authenticated;

-- Zmluva pre klienta: len jej obsah a podpisy, nič iné z firmy.
create or replace function public.get_shared_contract(_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'number', c.number, 'kind', c.kind, 'data', c.data, 'createdAt', c.created_at,
    'clientSigner', c.client_signer, 'clientSignature', c.client_signature,
    'supplierSigner', c.supplier_signer, 'supplierSignature', c.supplier_signature,
    'companyName', co.name
  )
  from public.event_contracts c join public.companies co on co.id = c.company_id
  where _token is not null and c.share_token = _token;
$$;
revoke execute on function public.get_shared_contract(uuid) from public;
grant execute on function public.get_shared_contract(uuid) to anon, authenticated;

-- Klient podpíše za seba, a to len raz.
create or replace function public.sign_shared_contract(_token uuid, _name text, _image text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.event_contracts%rowtype;
begin
  select * into c from public.event_contracts where _token is not null and share_token = _token for update;
  if not found then
    raise exception 'Zmluva sa nenašla' using errcode = 'no_data_found';
  end if;
  if c.client_signature is not null then
    raise exception 'Zmluva je už podpísaná' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(_name, ''))) not between 1 and 120 then
    raise exception 'Zadajte meno' using errcode = 'check_violation';
  end if;
  if _image is null or _image not like 'data:image/png;base64,%' or char_length(_image) > 400000 then
    raise exception 'Neplatný podpis' using errcode = 'check_violation';
  end if;
  update public.event_contracts set client_signer = trim(_name), client_signature = _image where id = c.id;
  if c.created_by is not null then
    insert into public.notifications (user_id, company_id, title, body, url)
    values (c.created_by, c.company_id, left('Klient podpísal zmluvu ' || c.number, 120), left(trim(_name), 300), '/events/' || c.event_id || '/contract?contract=' || c.id);
  end if;
end;
$$;
revoke execute on function public.sign_shared_contract(uuid, text, text) from public;
grant execute on function public.sign_shared_contract(uuid, text, text) to anon, authenticated;
