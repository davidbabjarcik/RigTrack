-- RigTrack: vlastný obsah flight case štítku.
-- Keď v case nie je označený hlavný prvok, na štítok sa dá napísať vlastný názov
-- a priložiť vlastná fotka (uložená v buckete equipment-photos v priečinku firmy).

alter table public.cases
  add column label_title text not null default '' check (char_length(label_title) <= 80),
  add column label_photo_path text not null default '' check (char_length(label_photo_path) <= 200);
grant update (label_title, label_photo_path) on public.cases to authenticated;
