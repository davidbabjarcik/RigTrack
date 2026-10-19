-- RigTrack: nová rola helper (1. časť).
-- Nová hodnota typu sa dá použiť až po uložení, preto je v samostatnej migrácii.
-- V Supabase SQL Editore spustite najprv túto a až potom 0063.

alter type public.app_role add value if not exists 'helper';
