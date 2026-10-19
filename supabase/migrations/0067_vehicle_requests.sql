-- RigTrack: žiadosti o servis aj pre autá (2.3).

alter table public.service_requests add column vehicle_id uuid references public.vehicles (id) on delete set null;
grant insert (vehicle_id) on public.service_requests to authenticated;

alter policy service_requests_insert on public.service_requests
  with check (
    public.is_company_member(company_id)
    and (equipment_id is null or exists (select 1 from public.equipment e where e.id = equipment_id and e.company_id = service_requests.company_id))
    and (vehicle_id is null or exists (select 1 from public.vehicles v where v.id = vehicle_id and v.company_id = service_requests.company_id))
  );
