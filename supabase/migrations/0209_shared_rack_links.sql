-- 0209: Zdieľaný rack ukazuje aj prepojenia a káble (uložené v snímke verzie od 0208 v rack.links).

create or replace function public.shared_doc_data(_doc_type text, _data jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case _doc_type
    when 'rack' then jsonb_build_object(
      'rack', jsonb_build_object(
        'name', _data #> '{rack,name}', 'rack_type', _data #> '{rack,rack_type}', 'units', _data #> '{rack,units}',
        'depth_mm', _data #> '{rack,depth_mm}', 'rails', _data #> '{rack,rails}', 'note', _data #> '{rack,note}'),
      'slots', coalesce((
        select jsonb_agg(jsonb_build_object(
          'side', x -> 'side', 'bottom_u', x -> 'bottom_u', 'height_u', x -> 'height_u', 'width', x -> 'width', 'col', x -> 'col',
          'equipment_id', x -> 'equipment_id', 'catalog_id', x -> 'catalog_id', 'accessory', x -> 'accessory', 'label', x -> 'label',
          'weight_kg', x -> 'weight_kg', 'power_w', x -> 'power_w') order by t.n)
        from jsonb_array_elements(coalesce(_data -> 'slots', '[]'::jsonb)) with ordinality as t(x, n)
      ), '[]'::jsonb),
      -- Prepojenia (od 0208): sloty podľa poradia v osadení, prečistené rovnako ako pri uložení.
      'links', public.rack_clean_links(
        case when jsonb_typeof(_data #> '{rack,links}') = 'array' then _data #> '{rack,links}' else '[]'::jsonb end,
        jsonb_array_length(coalesce(_data -> 'slots', '[]'::jsonb))))
    when 'stageplot' then jsonb_build_object(
      'plot', jsonb_build_object('width_m', _data #> '{plot,width_m}', 'depth_m', _data #> '{plot,depth_m}', 'note', _data #> '{plot,note}'),
      'items', public.clean_stage_items(coalesce(_data -> 'items', '[]'::jsonb)),
      'inputs', coalesce((
        select jsonb_agg(jsonb_build_object('channel', x -> 'channel', 'name', x -> 'name'))
        from jsonb_array_elements(coalesce(_data -> 'inputs', '[]'::jsonb)) x
      ), '[]'::jsonb))
    when 'synoptic' then jsonb_build_object(
      'nodes', public.clean_synoptic_nodes(coalesce(_data -> 'nodes', '[]'::jsonb)) ,
      'links', public.clean_synoptic_links(coalesce(_data -> 'links', '[]'::jsonb)),
      'note', coalesce(_data -> 'note', '""'::jsonb))
    when 'rfplan' then jsonb_build_object(
      'channels', public.clean_rf_channels(coalesce(_data -> 'channels', '[]'::jsonb)),
      'settings', public.clean_rf_settings(coalesce(_data -> 'settings', '{}'::jsonb)),
      'excluded_tv', public.clean_rf_tv(coalesce(_data -> 'excluded_tv', '[]'::jsonb)),
      'place', coalesce(_data -> 'place', '""'::jsonb),
      'note', coalesce(_data -> 'note', '""'::jsonb))
    when 'siteplan' then jsonb_build_object(
      'view', public.clean_site_view(coalesce(_data -> 'view', '{}'::jsonb)),
      'markers', public.clean_site_markers(coalesce(_data -> 'markers', '[]'::jsonb)),
      'routes', public.clean_site_routes(coalesce(_data -> 'routes', '[]'::jsonb)),
      'note', coalesce(_data -> 'note', '""'::jsonb))
    when 'schedule' then jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', x -> 'id', 'day', x -> 'day', 'starts_at', x -> 'starts_at', 'ends_at', x -> 'ends_at', 'stage', x -> 'stage',
          'kind', x -> 'kind', 'title', x -> 'title', 'note', x -> 'note'))
        from jsonb_array_elements(coalesce(_data -> 'items', '[]'::jsonb)) x
      ), '[]'::jsonb))
    else jsonb_build_object(
      'inputs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'channel', x -> 'channel', 'name', x -> 'name', 'source', x -> 'source', 'equipment_id', x -> 'equipment_id',
          'stagebox', x -> 'stagebox', 'stagebox_input', x -> 'stagebox_input', 'phantom', x -> 'phantom', 'stand', x -> 'stand',
          'insert_note', x -> 'insert_note', 'color', x -> 'color', 'note', x -> 'note'))
        from jsonb_array_elements(coalesce(_data -> 'inputs', '[]'::jsonb)) x
      ), '[]'::jsonb),
      'outputs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'number', x -> 'number', 'name', x -> 'name', 'kind', x -> 'kind', 'mix', x -> 'mix', 'destination', x -> 'destination',
          'equipment_id', x -> 'equipment_id', 'stereo', x -> 'stereo', 'note', x -> 'note'))
        from jsonb_array_elements(coalesce(_data -> 'outputs', '[]'::jsonb)) x
      ), '[]'::jsonb))
  end
$$;
revoke execute on function public.shared_doc_data(text, jsonb) from public, anon;
grant execute on function public.shared_doc_data(text, jsonb) to authenticated;
