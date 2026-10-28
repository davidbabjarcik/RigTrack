-- RigTrack 4.17: vlastné typy káblov s farbami dĺžok (napr. „Káblovka“) okrem XLR, powerCON a 230 V.
-- Typ je text do 40 znakov; platí pre káble, ktorých konektor / typ ho obsahuje.

do $$
begin
  alter table public.cable_colors drop constraint if exists cable_colors_cable_type_check;
  alter table public.cable_colors add constraint cable_colors_cable_type_check check (cable_type = trim(cable_type) and char_length(cable_type) <= 40);
end;
$$;
