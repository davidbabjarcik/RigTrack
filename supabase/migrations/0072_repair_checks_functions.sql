-- RigTrack: oprava obmedzení a funkcií (vygenerované z výslednej schémy).
-- Ak niektoré migrácie prebehli v staršej verzii z vývoja, môžu mať tabuľky staršie kontroly hodnôt
-- (napr. „violates check constraint event_payments_method_check“) a funkcie staršie verzie.
-- Tento súbor nastaví všetky kontroly hodnôt a funkcie na aktuálnu verziu. Dáta nemení; kontroly sa pridajú
-- ako NOT VALID, takže staré riadky nevadia. Dá sa spustiť aj viackrát. Najprv spustite 0071.

do $repair$
begin
  if to_regclass('public.attachments') is not null then
    begin
      execute $sql$alter table public.attachments drop constraint if exists attachments_entity_type_check$sql$;
      execute $sql$alter table public.attachments add constraint attachments_entity_type_check CHECK ((entity_type = ANY (ARRAY['service'::text, 'vehicle'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola attachments_entity_type_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.attachments') is not null then
    begin
      execute $sql$alter table public.attachments drop constraint if exists attachments_name_check$sql$;
      execute $sql$alter table public.attachments add constraint attachments_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola attachments_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.attachments') is not null then
    begin
      execute $sql$alter table public.attachments drop constraint if exists attachments_path_check$sql$;
      execute $sql$alter table public.attachments add constraint attachments_path_check CHECK ((char_length(path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola attachments_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.attachments') is not null then
    begin
      execute $sql$alter table public.attachments drop constraint if exists attachments_size_bytes_check$sql$;
      execute $sql$alter table public.attachments add constraint attachments_size_bytes_check CHECK ((size_bytes >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola attachments_size_bytes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.audit_log') is not null then
    begin
      execute $sql$alter table public.audit_log drop constraint if exists audit_log_action_check$sql$;
      execute $sql$alter table public.audit_log add constraint audit_log_action_check CHECK ((action = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola audit_log_action_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_app_version_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_app_version_check CHECK ((char_length(app_version) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_app_version_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_description_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_description_check CHECK ((char_length(description) <= 4000)) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_description_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_page_url_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_page_url_check CHECK ((char_length(page_url) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_page_url_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_response_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_response_check CHECK ((char_length(response) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_response_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_screenshot_path_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_screenshot_path_check CHECK ((char_length(screenshot_path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_screenshot_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_status_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text, 'wontfix'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_title_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 160))) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.bug_reports') is not null then
    begin
      execute $sql$alter table public.bug_reports drop constraint if exists bug_reports_user_agent_check$sql$;
      execute $sql$alter table public.bug_reports add constraint bug_reports_user_agent_check CHECK ((char_length(user_agent) <= 400)) not valid$sql$;
    exception when others then raise notice 'Kontrola bug_reports_user_agent_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cable_colors') is not null then
    begin
      execute $sql$alter table public.cable_colors drop constraint if exists cable_colors_color_check$sql$;
      execute $sql$alter table public.cable_colors add constraint cable_colors_color_check CHECK ((color ~ '^#[0-9a-f]{6}$'::text)) not valid$sql$;
    exception when others then raise notice 'Kontrola cable_colors_color_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cable_colors') is not null then
    begin
      execute $sql$alter table public.cable_colors drop constraint if exists cable_colors_length_m_check$sql$;
      execute $sql$alter table public.cable_colors add constraint cable_colors_length_m_check CHECK ((length_m > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola cable_colors_length_m_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cable_colors') is not null then
    begin
      execute $sql$alter table public.cable_colors drop constraint if exists cable_colors_name_check$sql$;
      execute $sql$alter table public.cable_colors add constraint cable_colors_name_check CHECK ((char_length(name) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola cable_colors_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_checks') is not null then
    begin
      execute $sql$alter table public.case_checks drop constraint if exists case_checks_note_check$sql$;
      execute $sql$alter table public.case_checks add constraint case_checks_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola case_checks_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_templates') is not null then
    begin
      execute $sql$alter table public.case_templates drop constraint if exists case_templates_depth_cm_check$sql$;
      execute $sql$alter table public.case_templates add constraint case_templates_depth_cm_check CHECK ((depth_cm > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola case_templates_depth_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_templates') is not null then
    begin
      execute $sql$alter table public.case_templates drop constraint if exists case_templates_label_category_check$sql$;
      execute $sql$alter table public.case_templates add constraint case_templates_label_category_check CHECK ((char_length(label_category) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola case_templates_label_category_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_templates') is not null then
    begin
      execute $sql$alter table public.case_templates drop constraint if exists case_templates_length_cm_check$sql$;
      execute $sql$alter table public.case_templates add constraint case_templates_length_cm_check CHECK ((length_cm > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola case_templates_length_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_templates') is not null then
    begin
      execute $sql$alter table public.case_templates drop constraint if exists case_templates_name_check$sql$;
      execute $sql$alter table public.case_templates add constraint case_templates_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola case_templates_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_templates') is not null then
    begin
      execute $sql$alter table public.case_templates drop constraint if exists case_templates_weight_kg_check$sql$;
      execute $sql$alter table public.case_templates add constraint case_templates_weight_kg_check CHECK ((weight_kg > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola case_templates_weight_kg_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.case_templates') is not null then
    begin
      execute $sql$alter table public.case_templates drop constraint if exists case_templates_width_cm_check$sql$;
      execute $sql$alter table public.case_templates add constraint case_templates_width_cm_check CHECK ((width_cm > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola case_templates_width_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_check_priority_check$sql$;
      execute $sql$alter table public.cases add constraint cases_check_priority_check CHECK ((check_priority = ANY (ARRAY['none'::text, 'low'::text, 'normal'::text, 'high'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_check_priority_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_depth_cm_check$sql$;
      execute $sql$alter table public.cases add constraint cases_depth_cm_check CHECK ((depth_cm > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_depth_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_inventory_number_check$sql$;
      execute $sql$alter table public.cases add constraint cases_inventory_number_check CHECK ((char_length(inventory_number) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_inventory_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_kind_check$sql$;
      execute $sql$alter table public.cases add constraint cases_kind_check CHECK ((kind = ANY (ARRAY['case'::text, 'rack'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_label_category_check$sql$;
      execute $sql$alter table public.cases add constraint cases_label_category_check CHECK ((char_length(label_category) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_label_category_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_label_number_check$sql$;
      execute $sql$alter table public.cases add constraint cases_label_number_check CHECK ((char_length(label_number) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_label_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_label_photo_path_check$sql$;
      execute $sql$alter table public.cases add constraint cases_label_photo_path_check CHECK ((char_length(label_photo_path) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_label_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_label_title_check$sql$;
      execute $sql$alter table public.cases add constraint cases_label_title_check CHECK ((char_length(label_title) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_label_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_length_cm_check$sql$;
      execute $sql$alter table public.cases add constraint cases_length_cm_check CHECK ((length_cm > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_length_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_name_check$sql$;
      execute $sql$alter table public.cases add constraint cases_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_note_check$sql$;
      execute $sql$alter table public.cases add constraint cases_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_old_numbers_check$sql$;
      execute $sql$alter table public.cases add constraint cases_old_numbers_check CHECK ((char_length(old_numbers) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_old_numbers_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_photo_path_check$sql$;
      execute $sql$alter table public.cases add constraint cases_photo_path_check CHECK ((char_length(photo_path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_rack_units_check$sql$;
      execute $sql$alter table public.cases add constraint cases_rack_units_check CHECK (((rack_units >= 1) AND (rack_units <= 60))) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_rack_units_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_spot_level_check$sql$;
      execute $sql$alter table public.cases add constraint cases_spot_level_check CHECK (((spot_level >= 1) AND (spot_level <= 20))) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_spot_level_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_weight_kg_check$sql$;
      execute $sql$alter table public.cases add constraint cases_weight_kg_check CHECK ((weight_kg > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_weight_kg_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.cases') is not null then
    begin
      execute $sql$alter table public.cases drop constraint if exists cases_width_cm_check$sql$;
      execute $sql$alter table public.cases add constraint cases_width_cm_check CHECK ((width_cm > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola cases_width_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.companies') is not null then
    begin
      execute $sql$alter table public.companies drop constraint if exists companies_label_footer_check$sql$;
      execute $sql$alter table public.companies add constraint companies_label_footer_check CHECK ((char_length(label_footer) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola companies_label_footer_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.companies') is not null then
    begin
      execute $sql$alter table public.companies drop constraint if exists companies_logo_path_check$sql$;
      execute $sql$alter table public.companies add constraint companies_logo_path_check CHECK ((char_length(logo_path) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola companies_logo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.companies') is not null then
    begin
      execute $sql$alter table public.companies drop constraint if exists companies_logo_style_check$sql$;
      execute $sql$alter table public.companies add constraint companies_logo_style_check CHECK ((logo_style = ANY (ARRAY['auto'::text, 'original'::text, 'plate'::text, 'white'::text, 'black'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola companies_logo_style_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.companies') is not null then
    begin
      execute $sql$alter table public.companies drop constraint if exists companies_name_check$sql$;
      execute $sql$alter table public.companies add constraint companies_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola companies_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_check_levels') is not null then
    begin
      execute $sql$alter table public.company_check_levels drop constraint if exists company_check_levels_high_days_check$sql$;
      execute $sql$alter table public.company_check_levels add constraint company_check_levels_high_days_check CHECK (((high_days >= 1) AND (high_days <= 3650))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_check_levels_high_days_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_check_levels') is not null then
    begin
      execute $sql$alter table public.company_check_levels drop constraint if exists company_check_levels_low_days_check$sql$;
      execute $sql$alter table public.company_check_levels add constraint company_check_levels_low_days_check CHECK (((low_days >= 1) AND (low_days <= 3650))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_check_levels_low_days_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_check_levels') is not null then
    begin
      execute $sql$alter table public.company_check_levels drop constraint if exists company_check_levels_normal_days_check$sql$;
      execute $sql$alter table public.company_check_levels add constraint company_check_levels_normal_days_check CHECK (((normal_days >= 1) AND (normal_days <= 3650))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_check_levels_normal_days_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_duty_types') is not null then
    begin
      execute $sql$alter table public.company_duty_types drop constraint if exists company_duty_types_name_check$sql$;
      execute $sql$alter table public.company_duty_types add constraint company_duty_types_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 60))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_duty_types_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_invitations') is not null then
    begin
      execute $sql$alter table public.company_invitations drop constraint if exists company_invitations_email_check$sql$;
      execute $sql$alter table public.company_invitations add constraint company_invitations_email_check CHECK (((email = lower(TRIM(BOTH FROM email))) AND (email ~~ '%_@_%'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_invitations_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_links') is not null then
    begin
      execute $sql$alter table public.company_links drop constraint if exists company_links_check$sql$;
      execute $sql$alter table public.company_links add constraint company_links_check CHECK ((requester <> target)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_links_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_links') is not null then
    begin
      execute $sql$alter table public.company_links drop constraint if exists company_links_status_check$sql$;
      execute $sql$alter table public.company_links add constraint company_links_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_links_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_news') is not null then
    begin
      execute $sql$alter table public.company_news drop constraint if exists company_news_kind_check$sql$;
      execute $sql$alter table public.company_news add constraint company_news_kind_check CHECK ((kind = ANY (ARRAY['event'::text, 'crew'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_news_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_news') is not null then
    begin
      execute $sql$alter table public.company_news drop constraint if exists company_news_link_check$sql$;
      execute $sql$alter table public.company_news add constraint company_news_link_check CHECK ((char_length(link) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_news_link_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_news') is not null then
    begin
      execute $sql$alter table public.company_news drop constraint if exists company_news_title_check$sql$;
      execute $sql$alter table public.company_news add constraint company_news_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_news_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_address_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_address_check CHECK ((char_length(address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_ceo_name_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_ceo_name_check CHECK ((char_length(ceo_name) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_ceo_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_dic_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_dic_check CHECK ((char_length(dic) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_dic_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_email_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_email_check CHECK ((char_length(email) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_ic_dph_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_ic_dph_check CHECK ((char_length(ic_dph) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_ic_dph_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_ico_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_ico_check CHECK ((char_length(ico) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_ico_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_legal_name_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_legal_name_check CHECK ((char_length(legal_name) <= 160)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_legal_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_phone_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_phone_check CHECK ((char_length(phone) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_phone_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_warehouse_address_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_warehouse_address_check CHECK ((char_length(warehouse_address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_warehouse_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_profile') is not null then
    begin
      execute $sql$alter table public.company_profile drop constraint if exists company_profile_web_check$sql$;
      execute $sql$alter table public.company_profile add constraint company_profile_web_check CHECK ((char_length(web) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_profile_web_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_requests') is not null then
    begin
      execute $sql$alter table public.company_requests drop constraint if exists company_requests_company_name_check$sql$;
      execute $sql$alter table public.company_requests add constraint company_requests_company_name_check CHECK (((char_length(TRIM(BOTH FROM company_name)) >= 1) AND (char_length(TRIM(BOTH FROM company_name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_requests_company_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_requests') is not null then
    begin
      execute $sql$alter table public.company_requests drop constraint if exists company_requests_note_check$sql$;
      execute $sql$alter table public.company_requests add constraint company_requests_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola company_requests_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.company_requests') is not null then
    begin
      execute $sql$alter table public.company_requests drop constraint if exists company_requests_status_check$sql$;
      execute $sql$alter table public.company_requests add constraint company_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola company_requests_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.device_exemptions') is not null then
    begin
      execute $sql$alter table public.device_exemptions drop constraint if exists device_exemptions_kind_check$sql$;
      execute $sql$alter table public.device_exemptions add constraint device_exemptions_kind_check CHECK ((kind = ANY (ARRAY['phone'::text, 'laptop'::text, 'tablet'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola device_exemptions_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_attributes_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_attributes_check CHECK (((jsonb_typeof(attributes) = 'object'::text) AND (char_length((attributes)::text) <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_attributes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_capture_match_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_capture_match_check CHECK ((capture_match = ANY (ARRAY[''::text, 'yes'::text, 'no'::text, 'partial'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_capture_match_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_capture_note_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_capture_note_check CHECK ((char_length(capture_note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_capture_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_clone_of_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_clone_of_check CHECK ((char_length(clone_of) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_clone_of_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_hours_interval_months_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_hours_interval_months_check CHECK (((hours_interval_months >= 1) AND (hours_interval_months <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_hours_interval_months_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_inventory_number_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_inventory_number_check CHECK ((char_length(inventory_number) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_inventory_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_ip_address_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_ip_address_check CHECK (((ip_address = ''::text) OR (ip_address ~ '^(\d{1,3}\.){3}\d{1,3}$'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_ip_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_kind_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_kind_check CHECK ((kind = ANY (ARRAY['general'::text, 'cable'::text, 'light'::text, 'audio'::text, 'video'::text, 'dj'::text, 'it'::text, 'appliance'::text, 'truss'::text, 'stage'::text, 'consumable'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_label_role_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_label_role_check CHECK ((label_role = ANY (ARRAY['main'::text, 'secondary'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_label_role_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_links_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_links_check CHECK (((jsonb_typeof(links) = 'array'::text) AND (char_length((links)::text) <= 10000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_links_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_mac_address_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_mac_address_check CHECK (((mac_address = ''::text) OR (mac_address ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_mac_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_manufacturer_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_manufacturer_check CHECK ((char_length(manufacturer) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_manufacturer_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_min_quantity_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_min_quantity_check CHECK (((min_quantity >= 0) AND (min_quantity <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_min_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_model_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_model_check CHECK ((char_length(model) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_model_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_name_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_note_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_operating_hours_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_operating_hours_check CHECK ((operating_hours >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_operating_hours_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_photo_path_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_photo_path_check CHECK ((char_length(photo_path) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_quantity_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_quantity_check CHECK (((quantity >= 0) AND (quantity <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_rental_price_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_rental_price_check CHECK ((rental_price >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_rental_price_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_serial_number_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_serial_number_check CHECK ((char_length(serial_number) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_serial_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_service_interval_months_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_service_interval_months_check CHECK (((service_interval_months >= 1) AND (service_interval_months <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_service_interval_months_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_unit_info_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_unit_info_check CHECK (((jsonb_typeof(unit_info) = 'object'::text) AND (char_length((unit_info)::text) <= 60000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_unit_info_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment') is not null then
    begin
      execute $sql$alter table public.equipment drop constraint if exists equipment_unit_purchases_check$sql$;
      execute $sql$alter table public.equipment add constraint equipment_unit_purchases_check CHECK (((jsonb_typeof(unit_purchases) = 'object'::text) AND (char_length((unit_purchases)::text) <= 20000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_unit_purchases_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_aliases') is not null then
    begin
      execute $sql$alter table public.equipment_aliases drop constraint if exists equipment_aliases_alias_check$sql$;
      execute $sql$alter table public.equipment_aliases add constraint equipment_aliases_alias_check CHECK (((char_length(alias) >= 1) AND (char_length(alias) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_aliases_alias_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_categories') is not null then
    begin
      execute $sql$alter table public.equipment_categories drop constraint if exists equipment_categories_color_check$sql$;
      execute $sql$alter table public.equipment_categories add constraint equipment_categories_color_check CHECK ((color = ANY (ARRAY['green'::text, 'pink'::text, 'yellow'::text, 'red'::text, 'blue'::text, 'purple'::text, 'orange'::text, 'teal'::text, 'gray'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_categories_color_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_categories') is not null then
    begin
      execute $sql$alter table public.equipment_categories drop constraint if exists equipment_categories_name_check$sql$;
      execute $sql$alter table public.equipment_categories add constraint equipment_categories_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_categories_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_hour_readings') is not null then
    begin
      execute $sql$alter table public.equipment_hour_readings drop constraint if exists equipment_hour_readings_hours_check$sql$;
      execute $sql$alter table public.equipment_hour_readings add constraint equipment_hour_readings_hours_check CHECK ((hours >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_hour_readings_hours_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_hour_readings') is not null then
    begin
      execute $sql$alter table public.equipment_hour_readings drop constraint if exists equipment_hour_readings_note_check$sql$;
      execute $sql$alter table public.equipment_hour_readings add constraint equipment_hour_readings_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_hour_readings_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_hour_readings') is not null then
    begin
      execute $sql$alter table public.equipment_hour_readings drop constraint if exists equipment_hour_readings_unit_check$sql$;
      execute $sql$alter table public.equipment_hour_readings add constraint equipment_hour_readings_unit_check CHECK ((unit > 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_hour_readings_unit_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_packages') is not null then
    begin
      execute $sql$alter table public.equipment_packages drop constraint if exists equipment_packages_cases_check$sql$;
      execute $sql$alter table public.equipment_packages add constraint equipment_packages_cases_check CHECK (((jsonb_typeof(cases) = 'array'::text) AND (pg_column_size(cases) <= 10000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_packages_cases_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_packages') is not null then
    begin
      execute $sql$alter table public.equipment_packages drop constraint if exists equipment_packages_category_check$sql$;
      execute $sql$alter table public.equipment_packages add constraint equipment_packages_category_check CHECK ((char_length(category) <= 60)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_packages_category_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_packages') is not null then
    begin
      execute $sql$alter table public.equipment_packages drop constraint if exists equipment_packages_items_check$sql$;
      execute $sql$alter table public.equipment_packages add constraint equipment_packages_items_check CHECK (((jsonb_typeof(items) = 'array'::text) AND (pg_column_size(items) <= 30000))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_packages_items_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_packages') is not null then
    begin
      execute $sql$alter table public.equipment_packages drop constraint if exists equipment_packages_name_check$sql$;
      execute $sql$alter table public.equipment_packages add constraint equipment_packages_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_packages_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.equipment_packages') is not null then
    begin
      execute $sql$alter table public.equipment_packages drop constraint if exists equipment_packages_note_check$sql$;
      execute $sql$alter table public.equipment_packages add constraint equipment_packages_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola equipment_packages_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_attendance') is not null then
    begin
      execute $sql$alter table public.event_attendance drop constraint if exists event_attendance_break_minutes_check$sql$;
      execute $sql$alter table public.event_attendance add constraint event_attendance_break_minutes_check CHECK (((break_minutes >= 0) AND (break_minutes <= 1440))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_attendance_break_minutes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_attendance') is not null then
    begin
      execute $sql$alter table public.event_attendance drop constraint if exists event_attendance_check$sql$;
      execute $sql$alter table public.event_attendance add constraint event_attendance_check CHECK (((ended_at IS NULL) OR (ended_at > started_at))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_attendance_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_attendance') is not null then
    begin
      execute $sql$alter table public.event_attendance drop constraint if exists event_attendance_distance_m_check$sql$;
      execute $sql$alter table public.event_attendance add constraint event_attendance_distance_m_check CHECK ((distance_m >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_attendance_distance_m_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_attendance') is not null then
    begin
      execute $sql$alter table public.event_attendance drop constraint if exists event_attendance_pause_kind_check$sql$;
      execute $sql$alter table public.event_attendance add constraint event_attendance_pause_kind_check CHECK ((pause_kind = ANY (ARRAY['break'::text, 'wait'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_attendance_pause_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_attendance') is not null then
    begin
      execute $sql$alter table public.event_attendance drop constraint if exists event_attendance_wait_minutes_check$sql$;
      execute $sql$alter table public.event_attendance add constraint event_attendance_wait_minutes_check CHECK (((wait_minutes >= 0) AND (wait_minutes <= 1440))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_attendance_wait_minutes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_capsules') is not null then
    begin
      execute $sql$alter table public.event_capsules drop constraint if exists event_capsules_note_check$sql$;
      execute $sql$alter table public.event_capsules add constraint event_capsules_note_check CHECK ((char_length(note) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_capsules_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_capsules') is not null then
    begin
      execute $sql$alter table public.event_capsules drop constraint if exists event_capsules_quantity_check$sql$;
      execute $sql$alter table public.event_capsules add constraint event_capsules_quantity_check CHECK (((quantity >= 1) AND (quantity <= 1000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_capsules_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_crew') is not null then
    begin
      execute $sql$alter table public.event_crew drop constraint if exists event_crew_name_check$sql$;
      execute $sql$alter table public.event_crew add constraint event_crew_name_check CHECK ((char_length(name) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_crew_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_crew') is not null then
    begin
      execute $sql$alter table public.event_crew drop constraint if exists event_crew_response_check$sql$;
      execute $sql$alter table public.event_crew add constraint event_crew_response_check CHECK ((response = ANY (ARRAY['pending'::text, 'yes'::text, 'no'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_crew_response_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_crew') is not null then
    begin
      execute $sql$alter table public.event_crew drop constraint if exists event_crew_response_note_check$sql$;
      execute $sql$alter table public.event_crew add constraint event_crew_response_note_check CHECK ((char_length(response_note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_crew_response_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_crew') is not null then
    begin
      execute $sql$alter table public.event_crew drop constraint if exists event_crew_role_check$sql$;
      execute $sql$alter table public.event_crew add constraint event_crew_role_check CHECK ((char_length(role) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_crew_role_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_days') is not null then
    begin
      execute $sql$alter table public.event_days drop constraint if exists event_days_kind_check$sql$;
      execute $sql$alter table public.event_days add constraint event_days_kind_check CHECK ((kind = ANY (ARRAY['build'::text, 'show'::text, 'teardown'::text, 'travel'::text, 'rest'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_days_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_days') is not null then
    begin
      execute $sql$alter table public.event_days drop constraint if exists event_days_note_check$sql$;
      execute $sql$alter table public.event_days add constraint event_days_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_days_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_documents') is not null then
    begin
      execute $sql$alter table public.event_documents drop constraint if exists event_documents_name_check$sql$;
      execute $sql$alter table public.event_documents add constraint event_documents_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_documents_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_documents') is not null then
    begin
      execute $sql$alter table public.event_documents drop constraint if exists event_documents_path_check$sql$;
      execute $sql$alter table public.event_documents add constraint event_documents_path_check CHECK ((char_length(path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_documents_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_documents') is not null then
    begin
      execute $sql$alter table public.event_documents drop constraint if exists event_documents_size_bytes_check$sql$;
      execute $sql$alter table public.event_documents add constraint event_documents_size_bytes_check CHECK ((size_bytes >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_documents_size_bytes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_drives') is not null then
    begin
      execute $sql$alter table public.event_drives drop constraint if exists event_drives_check$sql$;
      execute $sql$alter table public.event_drives add constraint event_drives_check CHECK (((member_id IS NULL) <> (TRIM(BOTH FROM driver_name) = ''::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_drives_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_drives') is not null then
    begin
      execute $sql$alter table public.event_drives drop constraint if exists event_drives_direction_check$sql$;
      execute $sql$alter table public.event_drives add constraint event_drives_direction_check CHECK ((direction = ANY (ARRAY['there'::text, 'back'::text, 'both'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_drives_direction_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_drives') is not null then
    begin
      execute $sql$alter table public.event_drives drop constraint if exists event_drives_driver_name_check$sql$;
      execute $sql$alter table public.event_drives add constraint event_drives_driver_name_check CHECK ((char_length(driver_name) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_drives_driver_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_drives') is not null then
    begin
      execute $sql$alter table public.event_drives drop constraint if exists event_drives_km_check$sql$;
      execute $sql$alter table public.event_drives add constraint event_drives_km_check CHECK (((km >= (0)::numeric) AND (km < (100000)::numeric))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_drives_km_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_drives') is not null then
    begin
      execute $sql$alter table public.event_drives drop constraint if exists event_drives_route_check$sql$;
      execute $sql$alter table public.event_drives add constraint event_drives_route_check CHECK ((char_length(route) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_drives_route_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_duties') is not null then
    begin
      execute $sql$alter table public.event_duties drop constraint if exists event_duties_check$sql$;
      execute $sql$alter table public.event_duties add constraint event_duties_check CHECK (((member_id IS NULL) <> (TRIM(BOTH FROM person_name) = ''::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_duties_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_duties') is not null then
    begin
      execute $sql$alter table public.event_duties drop constraint if exists event_duties_person_name_check$sql$;
      execute $sql$alter table public.event_duties add constraint event_duties_person_name_check CHECK ((char_length(person_name) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_duties_person_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_equipment') is not null then
    begin
      execute $sql$alter table public.event_equipment drop constraint if exists event_equipment_quantity_check$sql$;
      execute $sql$alter table public.event_equipment add constraint event_equipment_quantity_check CHECK (((quantity >= 1) AND (quantity <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_equipment_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_expenses') is not null then
    begin
      execute $sql$alter table public.event_expenses drop constraint if exists event_expenses_amount_check$sql$;
      execute $sql$alter table public.event_expenses add constraint event_expenses_amount_check CHECK (((amount > (0)::numeric) AND (amount < (1000000)::numeric))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_expenses_amount_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_expenses') is not null then
    begin
      execute $sql$alter table public.event_expenses drop constraint if exists event_expenses_category_check$sql$;
      execute $sql$alter table public.event_expenses add constraint event_expenses_category_check CHECK ((category = ANY (ARRAY['fuel'::text, 'food'::text, 'accommodation'::text, 'parking'::text, 'material'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_expenses_category_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_expenses') is not null then
    begin
      execute $sql$alter table public.event_expenses drop constraint if exists event_expenses_note_check$sql$;
      execute $sql$alter table public.event_expenses add constraint event_expenses_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_expenses_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_expenses') is not null then
    begin
      execute $sql$alter table public.event_expenses drop constraint if exists event_expenses_place_check$sql$;
      execute $sql$alter table public.event_expenses add constraint event_expenses_place_check CHECK ((char_length(place) <= 160)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_expenses_place_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_links') is not null then
    begin
      execute $sql$alter table public.event_links drop constraint if exists event_links_tag_check$sql$;
      execute $sql$alter table public.event_links add constraint event_links_tag_check CHECK ((tag = ANY (ARRAY['rider'::text, 'lightplot'::text, 'stageplot'::text, 'tech'::text, 'contract'::text, 'photos'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_links_tag_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_links') is not null then
    begin
      execute $sql$alter table public.event_links drop constraint if exists event_links_title_check$sql$;
      execute $sql$alter table public.event_links add constraint event_links_title_check CHECK ((char_length(title) <= 160)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_links_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_links') is not null then
    begin
      execute $sql$alter table public.event_links drop constraint if exists event_links_url_check$sql$;
      execute $sql$alter table public.event_links add constraint event_links_url_check CHECK (((url ~* '^https?://'::text) AND (char_length(url) <= 1000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_links_url_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_meetings') is not null then
    begin
      execute $sql$alter table public.event_meetings drop constraint if exists event_meetings_address_check$sql$;
      execute $sql$alter table public.event_meetings add constraint event_meetings_address_check CHECK ((char_length(address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_meetings_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_meetings') is not null then
    begin
      execute $sql$alter table public.event_meetings drop constraint if exists event_meetings_lat_check$sql$;
      execute $sql$alter table public.event_meetings add constraint event_meetings_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_meetings_lat_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_meetings') is not null then
    begin
      execute $sql$alter table public.event_meetings drop constraint if exists event_meetings_lon_check$sql$;
      execute $sql$alter table public.event_meetings add constraint event_meetings_lon_check CHECK (((lon >= ('-180'::integer)::double precision) AND (lon <= (180)::double precision))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_meetings_lon_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_meetings') is not null then
    begin
      execute $sql$alter table public.event_meetings drop constraint if exists event_meetings_note_check$sql$;
      execute $sql$alter table public.event_meetings add constraint event_meetings_note_check CHECK ((char_length(note) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_meetings_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_meetings') is not null then
    begin
      execute $sql$alter table public.event_meetings drop constraint if exists event_meetings_place_kind_check$sql$;
      execute $sql$alter table public.event_meetings add constraint event_meetings_place_kind_check CHECK ((place_kind = ANY (ARRAY['company'::text, 'event'::text, 'hotel'::text, 'custom'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_meetings_place_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_meetings') is not null then
    begin
      execute $sql$alter table public.event_meetings drop constraint if exists event_meetings_radius_m_check$sql$;
      execute $sql$alter table public.event_meetings add constraint event_meetings_radius_m_check CHECK (((radius_m >= 50) AND (radius_m <= 5000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_meetings_radius_m_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_pack_checks') is not null then
    begin
      execute $sql$alter table public.event_pack_checks drop constraint if exists event_pack_checks_check$sql$;
      execute $sql$alter table public.event_pack_checks add constraint event_pack_checks_check CHECK (((equipment_id IS NULL) <> (case_id IS NULL))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_pack_checks_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_pack_checks') is not null then
    begin
      execute $sql$alter table public.event_pack_checks drop constraint if exists event_pack_checks_phase_check$sql$;
      execute $sql$alter table public.event_pack_checks add constraint event_pack_checks_phase_check CHECK ((phase = ANY (ARRAY['out'::text, 'back'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_pack_checks_phase_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_partners') is not null then
    begin
      execute $sql$alter table public.event_partners drop constraint if exists event_partners_kind_check$sql$;
      execute $sql$alter table public.event_partners add constraint event_partners_kind_check CHECK ((kind = ANY (ARRAY['organizer'::text, 'partner'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_partners_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_channel_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_channel_check CHECK (((channel >= 1) AND (channel <= 512))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_channel_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_connector_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_connector_check CHECK ((connector = ANY (ARRAY[''::text, 'xlr'::text, 'jack'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_connector_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_name_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_name_check CHECK ((char_length(name) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_note_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_note_check CHECK ((char_length(note) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_source_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_source_check CHECK ((source = ANY (ARRAY['mic'::text, 'wireless'::text, 'di'::text, 'port'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_source_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_stagebox_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_stagebox_check CHECK ((char_length(stagebox) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_stagebox_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_stagebox_input_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_stagebox_input_check CHECK (((stagebox_input >= 1) AND (stagebox_input <= 512))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_stagebox_input_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_patch') is not null then
    begin
      execute $sql$alter table public.event_patch drop constraint if exists event_patch_stand_check$sql$;
      execute $sql$alter table public.event_patch add constraint event_patch_stand_check CHECK ((stand = ANY (ARRAY[''::text, 'short'::text, 'tall'::text, 'clamp'::text, 'none'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_patch_stand_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_payments') is not null then
    begin
      execute $sql$alter table public.event_payments drop constraint if exists event_payments_amount_check$sql$;
      execute $sql$alter table public.event_payments add constraint event_payments_amount_check CHECK (((amount > (0)::numeric) AND (amount < (10000000)::numeric))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_payments_amount_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_payments') is not null then
    begin
      execute $sql$alter table public.event_payments drop constraint if exists event_payments_invoiced_by_check$sql$;
      execute $sql$alter table public.event_payments add constraint event_payments_invoiced_by_check CHECK ((char_length(invoiced_by) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_payments_invoiced_by_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_payments') is not null then
    begin
      execute $sql$alter table public.event_payments drop constraint if exists event_payments_method_check$sql$;
      execute $sql$alter table public.event_payments add constraint event_payments_method_check CHECK ((method = ANY (ARRAY['cash'::text, 'account'::text, 'invoice'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_payments_method_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_payments') is not null then
    begin
      execute $sql$alter table public.event_payments drop constraint if exists event_payments_note_check$sql$;
      execute $sql$alter table public.event_payments add constraint event_payments_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_payments_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_payments') is not null then
    begin
      execute $sql$alter table public.event_payments drop constraint if exists event_payments_vat_check$sql$;
      execute $sql$alter table public.event_payments add constraint event_payments_vat_check CHECK ((vat = ANY (ARRAY['with'::text, 'without'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_payments_vat_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_payments') is not null then
    begin
      execute $sql$alter table public.event_payments drop constraint if exists event_payments_vat_rate_check$sql$;
      execute $sql$alter table public.event_payments add constraint event_payments_vat_rate_check CHECK (((vat_rate >= (0)::numeric) AND (vat_rate <= (50)::numeric))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_payments_vat_rate_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_quotes') is not null then
    begin
      execute $sql$alter table public.event_quotes drop constraint if exists event_quotes_data_check$sql$;
      execute $sql$alter table public.event_quotes add constraint event_quotes_data_check CHECK (((jsonb_typeof(data) = 'object'::text) AND (char_length((data)::text) <= 200000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_quotes_data_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_quotes') is not null then
    begin
      execute $sql$alter table public.event_quotes drop constraint if exists event_quotes_note_check$sql$;
      execute $sql$alter table public.event_quotes add constraint event_quotes_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_quotes_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_quotes') is not null then
    begin
      execute $sql$alter table public.event_quotes drop constraint if exists event_quotes_status_check$sql$;
      execute $sql$alter table public.event_quotes add constraint event_quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_quotes_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_rules') is not null then
    begin
      execute $sql$alter table public.event_rules drop constraint if exists event_rules_rules_check$sql$;
      execute $sql$alter table public.event_rules add constraint event_rules_rules_check CHECK (((jsonb_typeof(rules) = 'array'::text) AND (pg_column_size(rules) <= 50000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_rules_rules_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_shares') is not null then
    begin
      execute $sql$alter table public.event_shares drop constraint if exists event_shares_owner_part_check$sql$;
      execute $sql$alter table public.event_shares add constraint event_shares_owner_part_check CHECK ((char_length(owner_part) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_shares_owner_part_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_shares') is not null then
    begin
      execute $sql$alter table public.event_shares drop constraint if exists event_shares_partner_part_check$sql$;
      execute $sql$alter table public.event_shares add constraint event_shares_partner_part_check CHECK ((char_length(partner_part) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_shares_partner_part_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_stage_plans') is not null then
    begin
      execute $sql$alter table public.event_stage_plans drop constraint if exists event_stage_plans_request_check$sql$;
      execute $sql$alter table public.event_stage_plans add constraint event_stage_plans_request_check CHECK (((jsonb_typeof(request) = 'object'::text) AND (char_length((request)::text) <= 20000))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_stage_plans_request_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_travel') is not null then
    begin
      execute $sql$alter table public.event_travel drop constraint if exists event_travel_extra_km_check$sql$;
      execute $sql$alter table public.event_travel add constraint event_travel_extra_km_check CHECK ((extra_km >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_travel_extra_km_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_travel') is not null then
    begin
      execute $sql$alter table public.event_travel drop constraint if exists event_travel_note_check$sql$;
      execute $sql$alter table public.event_travel add constraint event_travel_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_travel_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_travel') is not null then
    begin
      execute $sql$alter table public.event_travel drop constraint if exists event_travel_round_trips_check$sql$;
      execute $sql$alter table public.event_travel add constraint event_travel_round_trips_check CHECK (((round_trips >= 0) AND (round_trips <= 20))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_travel_round_trips_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_travel') is not null then
    begin
      execute $sql$alter table public.event_travel drop constraint if exists event_travel_stay_check$sql$;
      execute $sql$alter table public.event_travel add constraint event_travel_stay_check CHECK ((stay = ANY (ARRAY['home'::text, 'venue'::text, 'elsewhere'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_travel_stay_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_travel') is not null then
    begin
      execute $sql$alter table public.event_travel drop constraint if exists event_travel_stay_place_check$sql$;
      execute $sql$alter table public.event_travel add constraint event_travel_stay_place_check CHECK ((char_length(stay_place) <= 160)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_travel_stay_place_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_travel') is not null then
    begin
      execute $sql$alter table public.event_travel drop constraint if exists event_travel_vehicles_check$sql$;
      execute $sql$alter table public.event_travel add constraint event_travel_vehicles_check CHECK (((vehicles >= 0) AND (vehicles <= 50))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_travel_vehicles_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_work_logs') is not null then
    begin
      execute $sql$alter table public.event_work_logs drop constraint if exists event_work_logs_break_minutes_check$sql$;
      execute $sql$alter table public.event_work_logs add constraint event_work_logs_break_minutes_check CHECK (((break_minutes >= 0) AND (break_minutes <= 1440))) not valid$sql$;
    exception when others then raise notice 'Kontrola event_work_logs_break_minutes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.event_work_logs') is not null then
    begin
      execute $sql$alter table public.event_work_logs drop constraint if exists event_work_logs_note_check$sql$;
      execute $sql$alter table public.event_work_logs add constraint event_work_logs_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola event_work_logs_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_address_check$sql$;
      execute $sql$alter table public.events add constraint events_address_check CHECK ((char_length(address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_check$sql$;
      execute $sql$alter table public.events add constraint events_check CHECK ((ends_on >= starts_on)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_client_check$sql$;
      execute $sql$alter table public.events add constraint events_client_check CHECK ((char_length(client) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_client_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_description_check$sql$;
      execute $sql$alter table public.events add constraint events_description_check CHECK ((char_length(description) <= 8000)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_description_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_distance_km_check$sql$;
      execute $sql$alter table public.events add constraint events_distance_km_check CHECK ((distance_km >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_distance_km_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_name_check$sql$;
      execute $sql$alter table public.events add constraint events_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 160))) not valid$sql$;
    exception when others then raise notice 'Kontrola events_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_note_check$sql$;
      execute $sql$alter table public.events add constraint events_note_check CHECK ((char_length(note) <= 4000)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_organizer_check$sql$;
      execute $sql$alter table public.events add constraint events_organizer_check CHECK ((char_length(organizer) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_organizer_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_organizer_email_check$sql$;
      execute $sql$alter table public.events add constraint events_organizer_email_check CHECK ((char_length(organizer_email) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_organizer_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_organizer_person_check$sql$;
      execute $sql$alter table public.events add constraint events_organizer_person_check CHECK ((char_length(organizer_person) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_organizer_person_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_organizer_phone_check$sql$;
      execute $sql$alter table public.events add constraint events_organizer_phone_check CHECK ((char_length(organizer_phone) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_organizer_phone_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_power_check$sql$;
      execute $sql$alter table public.events add constraint events_power_check CHECK ((power = ANY (ARRAY[''::text, 'schuko16'::text, 'cee16'::text, 'cee32'::text, 'cee63'::text, 'cee125'::text, 'generator'::text, 'none'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola events_power_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_power_count_check$sql$;
      execute $sql$alter table public.events add constraint events_power_count_check CHECK (((power_count >= 1) AND (power_count <= 50))) not valid$sql$;
    exception when others then raise notice 'Kontrola events_power_count_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_power_note_check$sql$;
      execute $sql$alter table public.events add constraint events_power_note_check CHECK ((char_length(power_note) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_power_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_setting_check$sql$;
      execute $sql$alter table public.events add constraint events_setting_check CHECK ((setting = ANY (ARRAY[''::text, 'indoor'::text, 'outdoor'::text, 'mixed'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola events_setting_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_status_check$sql$;
      execute $sql$alter table public.events add constraint events_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'done'::text, 'cancelled'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola events_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_venue_check$sql$;
      execute $sql$alter table public.events add constraint events_venue_check CHECK ((char_length(venue) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_venue_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.events') is not null then
    begin
      execute $sql$alter table public.events drop constraint if exists events_weather_place_check$sql$;
      execute $sql$alter table public.events add constraint events_weather_place_check CHECK ((char_length(weather_place) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola events_weather_place_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_check CHECK (((mac <> ''::text) OR (ip <> ''::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_contact_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_contact_check CHECK ((char_length(contact) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_contact_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_device_name_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_device_name_check CHECK ((char_length(device_name) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_device_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_ip_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_ip_check CHECK ((char_length(ip) <= 45)) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_ip_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_mac_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_mac_check CHECK (((mac = ''::text) OR (mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_mac_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_note_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.guest_devices') is not null then
    begin
      execute $sql$alter table public.guest_devices drop constraint if exists guest_devices_person_name_check$sql$;
      execute $sql$alter table public.guest_devices add constraint guest_devices_person_name_check CHECK (((char_length(TRIM(BOTH FROM person_name)) >= 1) AND (char_length(TRIM(BOTH FROM person_name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola guest_devices_person_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_cost_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_cost_check CHECK ((cost >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_cost_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_description_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_description_check CHECK ((char_length(description) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_description_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_kind_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_kind_check CHECK ((kind = ANY (ARRAY['damage'::text, 'injury'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_paid_by_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_paid_by_check CHECK ((paid_by = ANY (ARRAY[''::text, 'company'::text, 'person'::text, 'insurance'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_paid_by_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_person_name_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_person_name_check CHECK ((char_length(person_name) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_person_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_severity_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_severity_check CHECK ((severity = ANY (ARRAY['minor'::text, 'medium'::text, 'serious'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_severity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.incidents') is not null then
    begin
      execute $sql$alter table public.incidents drop constraint if exists incidents_title_check$sql$;
      execute $sql$alter table public.incidents add constraint incidents_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola incidents_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_items') is not null then
    begin
      execute $sql$alter table public.loan_items drop constraint if exists loan_items_damaged_quantity_check$sql$;
      execute $sql$alter table public.loan_items add constraint loan_items_damaged_quantity_check CHECK ((damaged_quantity >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_items_damaged_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_items') is not null then
    begin
      execute $sql$alter table public.loan_items drop constraint if exists loan_items_quantity_check$sql$;
      execute $sql$alter table public.loan_items add constraint loan_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_items_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_items') is not null then
    begin
      execute $sql$alter table public.loan_items drop constraint if exists loan_items_unit_price_check$sql$;
      execute $sql$alter table public.loan_items add constraint loan_items_unit_price_check CHECK ((unit_price >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_items_unit_price_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_signatures') is not null then
    begin
      execute $sql$alter table public.loan_signatures drop constraint if exists loan_signatures_image_check$sql$;
      execute $sql$alter table public.loan_signatures add constraint loan_signatures_image_check CHECK (((image ~~ 'data:image/png;base64,%'::text) AND (char_length(image) <= 400000))) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_signatures_image_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_signatures') is not null then
    begin
      execute $sql$alter table public.loan_signatures drop constraint if exists loan_signatures_phase_check$sql$;
      execute $sql$alter table public.loan_signatures add constraint loan_signatures_phase_check CHECK ((phase = ANY (ARRAY['issue'::text, 'return'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_signatures_phase_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_signatures') is not null then
    begin
      execute $sql$alter table public.loan_signatures drop constraint if exists loan_signatures_role_check$sql$;
      execute $sql$alter table public.loan_signatures add constraint loan_signatures_role_check CHECK ((role = ANY (ARRAY['borrower'::text, 'lender'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_signatures_role_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loan_signatures') is not null then
    begin
      execute $sql$alter table public.loan_signatures drop constraint if exists loan_signatures_signer_name_check$sql$;
      execute $sql$alter table public.loan_signatures add constraint loan_signatures_signer_name_check CHECK ((char_length(signer_name) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola loan_signatures_signer_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_billed_days_check$sql$;
      execute $sql$alter table public.loans add constraint loans_billed_days_check CHECK (((billed_days >= 1) AND (billed_days <= 3650))) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_billed_days_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_borrower_address_check$sql$;
      execute $sql$alter table public.loans add constraint loans_borrower_address_check CHECK ((char_length(borrower_address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_borrower_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_borrower_check$sql$;
      execute $sql$alter table public.loans add constraint loans_borrower_check CHECK (((char_length(TRIM(BOTH FROM borrower)) >= 1) AND (char_length(TRIM(BOTH FROM borrower)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_borrower_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_borrower_ico_check$sql$;
      execute $sql$alter table public.loans add constraint loans_borrower_ico_check CHECK ((char_length(borrower_ico) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_borrower_ico_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_check$sql$;
      execute $sql$alter table public.loans add constraint loans_check CHECK ((ends_on >= starts_on)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_contact_check$sql$;
      execute $sql$alter table public.loans add constraint loans_contact_check CHECK ((char_length(contact) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_contact_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_deposit_check$sql$;
      execute $sql$alter table public.loans add constraint loans_deposit_check CHECK ((deposit >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_deposit_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_note_check$sql$;
      execute $sql$alter table public.loans add constraint loans_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_price_check$sql$;
      execute $sql$alter table public.loans add constraint loans_price_check CHECK ((price >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_price_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.loans') is not null then
    begin
      execute $sql$alter table public.loans drop constraint if exists loans_status_check$sql$;
      execute $sql$alter table public.loans add constraint loans_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'issued'::text, 'returned'::text, 'damaged'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola loans_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.locations') is not null then
    begin
      execute $sql$alter table public.locations drop constraint if exists locations_name_check$sql$;
      execute $sql$alter table public.locations add constraint locations_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80))) not valid$sql$;
    exception when others then raise notice 'Kontrola locations_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_devices') is not null then
    begin
      execute $sql$alter table public.member_devices drop constraint if exists member_devices_ethernet_mac_check$sql$;
      execute $sql$alter table public.member_devices add constraint member_devices_ethernet_mac_check CHECK (((ethernet_mac = ''::text) OR (ethernet_mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_devices_ethernet_mac_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_devices') is not null then
    begin
      execute $sql$alter table public.member_devices drop constraint if exists member_devices_kind_check$sql$;
      execute $sql$alter table public.member_devices add constraint member_devices_kind_check CHECK ((kind = ANY (ARRAY['phone'::text, 'laptop'::text, 'tablet'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_devices_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_devices') is not null then
    begin
      execute $sql$alter table public.member_devices drop constraint if exists member_devices_mac_check$sql$;
      execute $sql$alter table public.member_devices add constraint member_devices_mac_check CHECK ((mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'::text)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_devices_mac_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_devices') is not null then
    begin
      execute $sql$alter table public.member_devices drop constraint if exists member_devices_name_check$sql$;
      execute $sql$alter table public.member_devices add constraint member_devices_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_devices_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_devices') is not null then
    begin
      execute $sql$alter table public.member_devices drop constraint if exists member_devices_networks_check$sql$;
      execute $sql$alter table public.member_devices add constraint member_devices_networks_check CHECK (((jsonb_typeof(networks) = 'array'::text) AND (jsonb_array_length(networks) <= 20) AND (char_length((networks)::text) <= 4000))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_devices_networks_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_devices') is not null then
    begin
      execute $sql$alter table public.member_devices drop constraint if exists member_devices_note_check$sql$;
      execute $sql$alter table public.member_devices add constraint member_devices_note_check CHECK ((char_length(note) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_devices_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_homes') is not null then
    begin
      execute $sql$alter table public.member_homes drop constraint if exists member_homes_address_check$sql$;
      execute $sql$alter table public.member_homes add constraint member_homes_address_check CHECK ((char_length(address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_homes_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_homes') is not null then
    begin
      execute $sql$alter table public.member_homes drop constraint if exists member_homes_lat_check$sql$;
      execute $sql$alter table public.member_homes add constraint member_homes_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_homes_lat_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_homes') is not null then
    begin
      execute $sql$alter table public.member_homes drop constraint if exists member_homes_lon_check$sql$;
      execute $sql$alter table public.member_homes add constraint member_homes_lon_check CHECK (((lon >= ('-180'::integer)::double precision) AND (lon <= (180)::double precision))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_homes_lon_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_payments') is not null then
    begin
      execute $sql$alter table public.member_payments drop constraint if exists member_payments_amount_check$sql$;
      execute $sql$alter table public.member_payments add constraint member_payments_amount_check CHECK ((amount > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_payments_amount_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_payments') is not null then
    begin
      execute $sql$alter table public.member_payments drop constraint if exists member_payments_kind_check$sql$;
      execute $sql$alter table public.member_payments add constraint member_payments_kind_check CHECK ((kind = ANY (ARRAY['reward'::text, 'advance'::text, 'bonus'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola member_payments_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_payments') is not null then
    begin
      execute $sql$alter table public.member_payments drop constraint if exists member_payments_note_check$sql$;
      execute $sql$alter table public.member_payments add constraint member_payments_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_payments_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_permissions') is not null then
    begin
      execute $sql$alter table public.member_permissions drop constraint if exists member_permissions_permission_check$sql$;
      execute $sql$alter table public.member_permissions add constraint member_permissions_permission_check CHECK (is_permission(permission)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_permissions_permission_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_rates') is not null then
    begin
      execute $sql$alter table public.member_rates drop constraint if exists member_rates_company_rate_check$sql$;
      execute $sql$alter table public.member_rates add constraint member_rates_company_rate_check CHECK ((company_rate >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_rates_company_rate_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_rates') is not null then
    begin
      execute $sql$alter table public.member_rates drop constraint if exists member_rates_event_rate_check$sql$;
      execute $sql$alter table public.member_rates add constraint member_rates_event_rate_check CHECK ((event_rate >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_rates_event_rate_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.member_rates') is not null then
    begin
      execute $sql$alter table public.member_rates drop constraint if exists member_rates_home_rate_check$sql$;
      execute $sql$alter table public.member_rates add constraint member_rates_home_rate_check CHECK ((home_rate >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola member_rates_home_rate_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.mic_capsules') is not null then
    begin
      execute $sql$alter table public.mic_capsules drop constraint if exists mic_capsules_fits_check$sql$;
      execute $sql$alter table public.mic_capsules add constraint mic_capsules_fits_check CHECK ((char_length(fits) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola mic_capsules_fits_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.mic_capsules') is not null then
    begin
      execute $sql$alter table public.mic_capsules drop constraint if exists mic_capsules_manufacturer_check$sql$;
      execute $sql$alter table public.mic_capsules add constraint mic_capsules_manufacturer_check CHECK ((char_length(manufacturer) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola mic_capsules_manufacturer_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.mic_capsules') is not null then
    begin
      execute $sql$alter table public.mic_capsules drop constraint if exists mic_capsules_name_check$sql$;
      execute $sql$alter table public.mic_capsules add constraint mic_capsules_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola mic_capsules_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.mic_capsules') is not null then
    begin
      execute $sql$alter table public.mic_capsules drop constraint if exists mic_capsules_note_check$sql$;
      execute $sql$alter table public.mic_capsules add constraint mic_capsules_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola mic_capsules_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.mic_capsules') is not null then
    begin
      execute $sql$alter table public.mic_capsules drop constraint if exists mic_capsules_quantity_check$sql$;
      execute $sql$alter table public.mic_capsules add constraint mic_capsules_quantity_check CHECK (((quantity >= 0) AND (quantity <= 10000))) not valid$sql$;
    exception when others then raise notice 'Kontrola mic_capsules_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.notifications') is not null then
    begin
      execute $sql$alter table public.notifications drop constraint if exists notifications_body_check$sql$;
      execute $sql$alter table public.notifications add constraint notifications_body_check CHECK ((char_length(body) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola notifications_body_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.notifications') is not null then
    begin
      execute $sql$alter table public.notifications drop constraint if exists notifications_title_check$sql$;
      execute $sql$alter table public.notifications add constraint notifications_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola notifications_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.notifications') is not null then
    begin
      execute $sql$alter table public.notifications drop constraint if exists notifications_url_check$sql$;
      execute $sql$alter table public.notifications add constraint notifications_url_check CHECK ((char_length(url) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola notifications_url_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_items') is not null then
    begin
      execute $sql$alter table public.office_items drop constraint if exists office_items_min_quantity_check$sql$;
      execute $sql$alter table public.office_items add constraint office_items_min_quantity_check CHECK ((min_quantity >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola office_items_min_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_items') is not null then
    begin
      execute $sql$alter table public.office_items drop constraint if exists office_items_name_check$sql$;
      execute $sql$alter table public.office_items add constraint office_items_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80))) not valid$sql$;
    exception when others then raise notice 'Kontrola office_items_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_items') is not null then
    begin
      execute $sql$alter table public.office_items drop constraint if exists office_items_quantity_check$sql$;
      execute $sql$alter table public.office_items add constraint office_items_quantity_check CHECK ((quantity >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola office_items_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_items') is not null then
    begin
      execute $sql$alter table public.office_items drop constraint if exists office_items_unit_check$sql$;
      execute $sql$alter table public.office_items add constraint office_items_unit_check CHECK ((char_length(unit) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola office_items_unit_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_purchases') is not null then
    begin
      execute $sql$alter table public.office_purchases drop constraint if exists office_purchases_note_check$sql$;
      execute $sql$alter table public.office_purchases add constraint office_purchases_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola office_purchases_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_purchases') is not null then
    begin
      execute $sql$alter table public.office_purchases drop constraint if exists office_purchases_pack_amount_check$sql$;
      execute $sql$alter table public.office_purchases add constraint office_purchases_pack_amount_check CHECK ((pack_amount > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola office_purchases_pack_amount_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_purchases') is not null then
    begin
      execute $sql$alter table public.office_purchases drop constraint if exists office_purchases_pack_unit_check$sql$;
      execute $sql$alter table public.office_purchases add constraint office_purchases_pack_unit_check CHECK ((pack_unit = ANY (ARRAY[''::text, 'kg'::text, 'g'::text, 'l'::text, 'ml'::text, 'ks'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola office_purchases_pack_unit_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_purchases') is not null then
    begin
      execute $sql$alter table public.office_purchases drop constraint if exists office_purchases_price_check$sql$;
      execute $sql$alter table public.office_purchases add constraint office_purchases_price_check CHECK ((price >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola office_purchases_price_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.office_purchases') is not null then
    begin
      execute $sql$alter table public.office_purchases drop constraint if exists office_purchases_quantity_check$sql$;
      execute $sql$alter table public.office_purchases add constraint office_purchases_quantity_check CHECK (((quantity > (0)::numeric) AND (quantity <= (100000)::numeric))) not valid$sql$;
    exception when others then raise notice 'Kontrola office_purchases_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_item_equipment') is not null then
    begin
      execute $sql$alter table public.order_item_equipment drop constraint if exists order_item_equipment_quantity_check$sql$;
      execute $sql$alter table public.order_item_equipment add constraint order_item_equipment_quantity_check CHECK ((quantity >= 1)) not valid$sql$;
    exception when others then raise notice 'Kontrola order_item_equipment_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_item_equipment') is not null then
    begin
      execute $sql$alter table public.order_item_equipment drop constraint if exists order_item_equipment_unit_numbers_check$sql$;
      execute $sql$alter table public.order_item_equipment add constraint order_item_equipment_unit_numbers_check CHECK ((cardinality(unit_numbers) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola order_item_equipment_unit_numbers_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_items') is not null then
    begin
      execute $sql$alter table public.order_items drop constraint if exists order_items_article_number_check$sql$;
      execute $sql$alter table public.order_items add constraint order_items_article_number_check CHECK ((char_length(article_number) <= 60)) not valid$sql$;
    exception when others then raise notice 'Kontrola order_items_article_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_items') is not null then
    begin
      execute $sql$alter table public.order_items drop constraint if exists order_items_mode_check$sql$;
      execute $sql$alter table public.order_items add constraint order_items_mode_check CHECK ((mode = ANY (ARRAY['none'::text, 'separate'::text, 'bulk'::text, 'existing'::text, 'link'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola order_items_mode_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_items') is not null then
    begin
      execute $sql$alter table public.order_items drop constraint if exists order_items_name_check$sql$;
      execute $sql$alter table public.order_items add constraint order_items_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola order_items_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_items') is not null then
    begin
      execute $sql$alter table public.order_items drop constraint if exists order_items_quantity_check$sql$;
      execute $sql$alter table public.order_items add constraint order_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola order_items_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.order_items') is not null then
    begin
      execute $sql$alter table public.order_items drop constraint if exists order_items_unit_price_check$sql$;
      execute $sql$alter table public.order_items add constraint order_items_unit_price_check CHECK ((unit_price >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola order_items_unit_price_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_currency_check$sql$;
      execute $sql$alter table public.orders add constraint orders_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_currency_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_for_whom_check$sql$;
      execute $sql$alter table public.orders add constraint orders_for_whom_check CHECK ((char_length(for_whom) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_for_whom_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_note_check$sql$;
      execute $sql$alter table public.orders add constraint orders_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_order_number_check$sql$;
      execute $sql$alter table public.orders add constraint orders_order_number_check CHECK ((char_length(order_number) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_order_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_photo_path_check$sql$;
      execute $sql$alter table public.orders add constraint orders_photo_path_check CHECK ((char_length(photo_path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_seller_check$sql$;
      execute $sql$alter table public.orders add constraint orders_seller_check CHECK ((char_length(seller) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_seller_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_source_check$sql$;
      execute $sql$alter table public.orders add constraint orders_source_check CHECK ((source = ANY (ARRAY['shop'::text, 'marketplace'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_source_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.orders') is not null then
    begin
      execute $sql$alter table public.orders drop constraint if exists orders_supplier_check$sql$;
      execute $sql$alter table public.orders add constraint orders_supplier_check CHECK (((char_length(TRIM(BOTH FROM supplier)) >= 1) AND (char_length(TRIM(BOTH FROM supplier)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola orders_supplier_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partner_contacts') is not null then
    begin
      execute $sql$alter table public.partner_contacts drop constraint if exists partner_contacts_email_check$sql$;
      execute $sql$alter table public.partner_contacts add constraint partner_contacts_email_check CHECK ((char_length(email) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola partner_contacts_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partner_contacts') is not null then
    begin
      execute $sql$alter table public.partner_contacts drop constraint if exists partner_contacts_name_check$sql$;
      execute $sql$alter table public.partner_contacts add constraint partner_contacts_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola partner_contacts_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partner_contacts') is not null then
    begin
      execute $sql$alter table public.partner_contacts drop constraint if exists partner_contacts_phone_check$sql$;
      execute $sql$alter table public.partner_contacts add constraint partner_contacts_phone_check CHECK ((char_length(phone) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola partner_contacts_phone_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partner_contacts') is not null then
    begin
      execute $sql$alter table public.partner_contacts drop constraint if exists partner_contacts_role_check$sql$;
      execute $sql$alter table public.partner_contacts add constraint partner_contacts_role_check CHECK ((char_length(role) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola partner_contacts_role_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_address_check$sql$;
      execute $sql$alter table public.partners add constraint partners_address_check CHECK ((char_length(address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_ceo_check$sql$;
      execute $sql$alter table public.partners add constraint partners_ceo_check CHECK ((char_length(ceo) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_ceo_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_dic_check$sql$;
      execute $sql$alter table public.partners add constraint partners_dic_check CHECK ((char_length(dic) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_dic_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_ic_dph_check$sql$;
      execute $sql$alter table public.partners add constraint partners_ic_dph_check CHECK ((char_length(ic_dph) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_ic_dph_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_ico_check$sql$;
      execute $sql$alter table public.partners add constraint partners_ico_check CHECK ((char_length(ico) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_ico_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_legal_name_check$sql$;
      execute $sql$alter table public.partners add constraint partners_legal_name_check CHECK ((char_length(legal_name) <= 160)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_legal_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_name_check$sql$;
      execute $sql$alter table public.partners add constraint partners_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 160))) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.partners') is not null then
    begin
      execute $sql$alter table public.partners drop constraint if exists partners_note_check$sql$;
      execute $sql$alter table public.partners add constraint partners_note_check CHECK ((char_length(note) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola partners_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.permission_group_rules') is not null then
    begin
      execute $sql$alter table public.permission_group_rules drop constraint if exists permission_group_rules_permission_check$sql$;
      execute $sql$alter table public.permission_group_rules add constraint permission_group_rules_permission_check CHECK (is_permission(permission)) not valid$sql$;
    exception when others then raise notice 'Kontrola permission_group_rules_permission_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.permission_groups') is not null then
    begin
      execute $sql$alter table public.permission_groups drop constraint if exists permission_groups_name_check$sql$;
      execute $sql$alter table public.permission_groups add constraint permission_groups_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 40))) not valid$sql$;
    exception when others then raise notice 'Kontrola permission_groups_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_email_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_email_check CHECK ((char_length(email) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_home_address_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_home_address_check CHECK ((char_length(home_address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_home_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_home_lat_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_home_lat_check CHECK (((home_lat >= ('-90'::integer)::double precision) AND (home_lat <= (90)::double precision))) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_home_lat_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_home_lon_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_home_lon_check CHECK (((home_lon >= ('-180'::integer)::double precision) AND (home_lon <= (180)::double precision))) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_home_lon_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_licences_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_licences_check CHECK ((licences <@ ARRAY['AM'::text, 'A1'::text, 'A2'::text, 'A'::text, 'B1'::text, 'B'::text, 'BE'::text, 'C1'::text, 'C1E'::text, 'C'::text, 'CE'::text, 'D1'::text, 'D1E'::text, 'D'::text, 'DE'::text, 'T'::text])) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_licences_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_name_day_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_name_day_check CHECK (((name_day = ''::text) OR (name_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_name_day_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_phone_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_phone_check CHECK ((char_length(phone) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_phone_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_skills_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_skills_check CHECK ((char_length(skills) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_skills_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.personal_profiles') is not null then
    begin
      execute $sql$alter table public.personal_profiles drop constraint if exists personal_profiles_socials_check$sql$;
      execute $sql$alter table public.personal_profiles add constraint personal_profiles_socials_check CHECK (((jsonb_typeof(socials) = 'object'::text) AND (char_length((socials)::text) <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola personal_profiles_socials_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.push_subscriptions') is not null then
    begin
      execute $sql$alter table public.push_subscriptions drop constraint if exists push_subscriptions_auth_check$sql$;
      execute $sql$alter table public.push_subscriptions add constraint push_subscriptions_auth_check CHECK ((char_length(auth) <= 100)) not valid$sql$;
    exception when others then raise notice 'Kontrola push_subscriptions_auth_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.push_subscriptions') is not null then
    begin
      execute $sql$alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_check$sql$;
      execute $sql$alter table public.push_subscriptions add constraint push_subscriptions_endpoint_check CHECK ((char_length(endpoint) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola push_subscriptions_endpoint_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.push_subscriptions') is not null then
    begin
      execute $sql$alter table public.push_subscriptions drop constraint if exists push_subscriptions_p256dh_check$sql$;
      execute $sql$alter table public.push_subscriptions add constraint push_subscriptions_p256dh_check CHECK ((char_length(p256dh) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola push_subscriptions_p256dh_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.push_subscriptions') is not null then
    begin
      execute $sql$alter table public.push_subscriptions drop constraint if exists push_subscriptions_user_agent_check$sql$;
      execute $sql$alter table public.push_subscriptions add constraint push_subscriptions_user_agent_check CHECK ((char_length(user_agent) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola push_subscriptions_user_agent_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_address_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_address_check CHECK ((char_length(address) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_contact_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_contact_check CHECK ((char_length(contact) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_contact_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_dic_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_dic_check CHECK ((char_length(dic) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_dic_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_ic_dph_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_ic_dph_check CHECK ((char_length(ic_dph) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_ic_dph_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_ico_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_ico_check CHECK ((char_length(ico) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_ico_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_kind_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_kind_check CHECK ((kind = ANY (ARRAY['sro'::text, 'zivnost'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_issuers') is not null then
    begin
      execute $sql$alter table public.quote_issuers drop constraint if exists quote_issuers_name_check$sql$;
      execute $sql$alter table public.quote_issuers add constraint quote_issuers_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 160))) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_issuers_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_templates') is not null then
    begin
      execute $sql$alter table public.quote_templates drop constraint if exists quote_templates_part_check$sql$;
      execute $sql$alter table public.quote_templates add constraint quote_templates_part_check CHECK (((jsonb_typeof(part) = 'object'::text) AND (char_length((part)::text) <= 20000))) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_templates_part_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quote_templates') is not null then
    begin
      execute $sql$alter table public.quote_templates drop constraint if exists quote_templates_title_check$sql$;
      execute $sql$alter table public.quote_templates add constraint quote_templates_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 120))) not valid$sql$;
    exception when others then raise notice 'Kontrola quote_templates_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_author_name_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_author_name_check CHECK ((char_length(author_name) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_author_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_budget_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_budget_check CHECK ((budget >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_budget_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_client_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_client_check CHECK (((jsonb_typeof(client) = 'object'::text) AND (char_length((client)::text) <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_client_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_issuer_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_issuer_check CHECK (((jsonb_typeof(issuer) = 'object'::text) AND (char_length((issuer)::text) <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_issuer_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_notes_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_notes_check CHECK ((char_length(notes) <= 3000)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_notes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_number_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_number_check CHECK ((char_length(number) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_place_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_place_check CHECK ((char_length(place) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_place_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_response_note_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_response_note_check CHECK ((char_length(response_note) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_response_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_sections_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_sections_check CHECK (((jsonb_typeof(sections) = 'array'::text) AND (char_length((sections)::text) <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_sections_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_service_dates_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_service_dates_check CHECK ((char_length(service_dates) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_service_dates_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_status_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_title_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_title_check CHECK ((char_length(title) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_total_override_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_total_override_check CHECK ((total_override >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_total_override_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_vat_mode_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_vat_mode_check CHECK ((vat_mode = ANY (ARRAY['with'::text, 'plus'::text, 'none'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_vat_mode_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.quotes') is not null then
    begin
      execute $sql$alter table public.quotes drop constraint if exists quotes_vat_pct_check$sql$;
      execute $sql$alter table public.quotes add constraint quotes_vat_pct_check CHECK (((vat_pct >= (0)::numeric) AND (vat_pct <= (100)::numeric))) not valid$sql$;
    exception when others then raise notice 'Kontrola quotes_vat_pct_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.responsibilities') is not null then
    begin
      execute $sql$alter table public.responsibilities drop constraint if exists responsibilities_check_every_days_check$sql$;
      execute $sql$alter table public.responsibilities add constraint responsibilities_check_every_days_check CHECK (((check_every_days >= 1) AND (check_every_days <= 365))) not valid$sql$;
    exception when others then raise notice 'Kontrola responsibilities_check_every_days_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.responsibilities') is not null then
    begin
      execute $sql$alter table public.responsibilities drop constraint if exists responsibilities_hours_every_days_check$sql$;
      execute $sql$alter table public.responsibilities add constraint responsibilities_hours_every_days_check CHECK (((hours_every_days >= 1) AND (hours_every_days <= 365))) not valid$sql$;
    exception when others then raise notice 'Kontrola responsibilities_hours_every_days_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.responsibilities') is not null then
    begin
      execute $sql$alter table public.responsibilities drop constraint if exists responsibilities_name_check$sql$;
      execute $sql$alter table public.responsibilities add constraint responsibilities_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80))) not valid$sql$;
    exception when others then raise notice 'Kontrola responsibilities_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.responsibilities') is not null then
    begin
      execute $sql$alter table public.responsibilities drop constraint if exists responsibilities_note_check$sql$;
      execute $sql$alter table public.responsibilities add constraint responsibilities_note_check CHECK ((char_length(note) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola responsibilities_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.role_permissions') is not null then
    begin
      execute $sql$alter table public.role_permissions drop constraint if exists role_permissions_permission_check$sql$;
      execute $sql$alter table public.role_permissions add constraint role_permissions_permission_check CHECK (is_permission(permission)) not valid$sql$;
    exception when others then raise notice 'Kontrola role_permissions_permission_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.role_permissions') is not null then
    begin
      execute $sql$alter table public.role_permissions drop constraint if exists role_permissions_role_check$sql$;
      execute $sql$alter table public.role_permissions add constraint role_permissions_role_check CHECK ((role <> 'admin'::app_role)) not valid$sql$;
    exception when others then raise notice 'Kontrola role_permissions_role_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_cost_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_cost_check CHECK ((cost >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_cost_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_hours_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_hours_check CHECK ((hours >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_hours_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_kind_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_kind_check CHECK ((kind = ANY (ARRAY['repair'::text, 'inspection'::text, 'maintenance'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_problem_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_problem_check CHECK ((char_length(problem) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_problem_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_quantity_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_quantity_check CHECK ((quantity >= 1)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_status_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_technician_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_technician_check CHECK ((char_length(technician) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_technician_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_records') is not null then
    begin
      execute $sql$alter table public.service_records drop constraint if exists service_records_work_done_check$sql$;
      execute $sql$alter table public.service_records add constraint service_records_work_done_check CHECK ((char_length(work_done) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_records_work_done_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_requests') is not null then
    begin
      execute $sql$alter table public.service_requests drop constraint if exists service_requests_description_check$sql$;
      execute $sql$alter table public.service_requests add constraint service_requests_description_check CHECK ((char_length(description) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_requests_description_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_requests') is not null then
    begin
      execute $sql$alter table public.service_requests drop constraint if exists service_requests_priority_check$sql$;
      execute $sql$alter table public.service_requests add constraint service_requests_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_requests_priority_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_requests') is not null then
    begin
      execute $sql$alter table public.service_requests drop constraint if exists service_requests_response_check$sql$;
      execute $sql$alter table public.service_requests add constraint service_requests_response_check CHECK ((char_length(response) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_requests_response_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_requests') is not null then
    begin
      execute $sql$alter table public.service_requests drop constraint if exists service_requests_status_check$sql$;
      execute $sql$alter table public.service_requests add constraint service_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text, 'rejected'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_requests_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_requests') is not null then
    begin
      execute $sql$alter table public.service_requests drop constraint if exists service_requests_title_check$sql$;
      execute $sql$alter table public.service_requests add constraint service_requests_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 160))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_requests_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_requests') is not null then
    begin
      execute $sql$alter table public.service_requests drop constraint if exists service_requests_unit_id_check$sql$;
      execute $sql$alter table public.service_requests add constraint service_requests_unit_id_check CHECK (((unit_id >= 1) AND (unit_id <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_requests_unit_id_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_address_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_address_check CHECK ((char_length(address) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_address_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_email_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_email_check CHECK ((char_length(email) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_firm_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_firm_check CHECK ((char_length(firm) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_firm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_name_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_note_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_note_check CHECK ((char_length(note) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_phone_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_phone_check CHECK ((char_length(phone) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_phone_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_scope_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_scope_check CHECK ((scope = ANY (ARRAY['equipment'::text, 'vehicles'::text, 'both'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_scope_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.service_technicians') is not null then
    begin
      execute $sql$alter table public.service_technicians drop constraint if exists service_technicians_specialization_check$sql$;
      execute $sql$alter table public.service_technicians add constraint service_technicians_specialization_check CHECK ((char_length(specialization) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola service_technicians_specialization_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_list_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_list_check CHECK ((list = ANY (ARRAY['want'::text, 'buy'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_list_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_name_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_note_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_order_number_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_order_number_check CHECK ((char_length(order_number) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_order_number_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_photo_path_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_photo_path_check CHECK ((char_length(photo_path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_priority_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_priority_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_quantity_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_quantity_check CHECK (((quantity >= 1) AND (quantity <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_quantity_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_status_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'ordered'::text, 'delivered'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_supplier_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_supplier_check CHECK ((char_length(supplier) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_supplier_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_unit_price_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_unit_price_check CHECK ((unit_price >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_unit_price_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.shopping_items') is not null then
    begin
      execute $sql$alter table public.shopping_items drop constraint if exists shopping_items_url_check$sql$;
      execute $sql$alter table public.shopping_items add constraint shopping_items_url_check CHECK (((char_length(url) <= 500) AND ((url = ''::text) OR (url ~* '^https?://'::text)))) not valid$sql$;
    exception when others then raise notice 'Kontrola shopping_items_url_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_check$sql$;
      execute $sql$alter table public.staff add constraint staff_check CHECK (((member_id IS NOT NULL) OR (char_length(TRIM(BOTH FROM name)) > 0))) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_email_check$sql$;
      execute $sql$alter table public.staff add constraint staff_email_check CHECK ((char_length(email) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_email_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_licences_check$sql$;
      execute $sql$alter table public.staff add constraint staff_licences_check CHECK ((licences <@ ARRAY['AM'::text, 'A1'::text, 'A2'::text, 'A'::text, 'B1'::text, 'B'::text, 'BE'::text, 'C1'::text, 'C1E'::text, 'C'::text, 'CE'::text, 'D1'::text, 'D1E'::text, 'D'::text, 'DE'::text, 'T'::text])) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_licences_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_name_check$sql$;
      execute $sql$alter table public.staff add constraint staff_name_check CHECK ((char_length(name) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_name_day_check$sql$;
      execute $sql$alter table public.staff add constraint staff_name_day_check CHECK (((name_day = ''::text) OR (name_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'::text))) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_name_day_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_note_check$sql$;
      execute $sql$alter table public.staff add constraint staff_note_check CHECK ((char_length(note) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_phone_check$sql$;
      execute $sql$alter table public.staff add constraint staff_phone_check CHECK ((char_length(phone) <= 40)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_phone_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_photo_path_check$sql$;
      execute $sql$alter table public.staff add constraint staff_photo_path_check CHECK ((char_length(photo_path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_position_check$sql$;
      execute $sql$alter table public.staff add constraint staff_position_check CHECK ((char_length("position") <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_position_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_skills_check$sql$;
      execute $sql$alter table public.staff add constraint staff_skills_check CHECK ((char_length(skills) <= 500)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_skills_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff') is not null then
    begin
      execute $sql$alter table public.staff drop constraint if exists staff_socials_check$sql$;
      execute $sql$alter table public.staff add constraint staff_socials_check CHECK (((jsonb_typeof(socials) = 'object'::text) AND (char_length((socials)::text) <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_socials_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff_unavailability') is not null then
    begin
      execute $sql$alter table public.staff_unavailability drop constraint if exists staff_unavailability_check$sql$;
      execute $sql$alter table public.staff_unavailability add constraint staff_unavailability_check CHECK ((ends_on >= starts_on)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_unavailability_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.staff_unavailability') is not null then
    begin
      execute $sql$alter table public.staff_unavailability drop constraint if exists staff_unavailability_note_check$sql$;
      execute $sql$alter table public.staff_unavailability add constraint staff_unavailability_note_check CHECK ((char_length(note) <= 200)) not valid$sql$;
    exception when others then raise notice 'Kontrola staff_unavailability_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.stage_settings') is not null then
    begin
      execute $sql$alter table public.stage_settings drop constraint if exists stage_settings_config_check$sql$;
      execute $sql$alter table public.stage_settings add constraint stage_settings_config_check CHECK (((jsonb_typeof(config) = 'object'::text) AND (pg_column_size(config) <= 20000))) not valid$sql$;
    exception when others then raise notice 'Kontrola stage_settings_config_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.suggestion_comments') is not null then
    begin
      execute $sql$alter table public.suggestion_comments drop constraint if exists suggestion_comments_body_check$sql$;
      execute $sql$alter table public.suggestion_comments add constraint suggestion_comments_body_check CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola suggestion_comments_body_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.suggestions') is not null then
    begin
      execute $sql$alter table public.suggestions drop constraint if exists suggestions_body_check$sql$;
      execute $sql$alter table public.suggestions add constraint suggestions_body_check CHECK ((char_length(body) <= 4000)) not valid$sql$;
    exception when others then raise notice 'Kontrola suggestions_body_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.suggestions') is not null then
    begin
      execute $sql$alter table public.suggestions drop constraint if exists suggestions_status_check$sql$;
      execute $sql$alter table public.suggestions add constraint suggestions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'done'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola suggestions_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.suggestions') is not null then
    begin
      execute $sql$alter table public.suggestions drop constraint if exists suggestions_title_check$sql$;
      execute $sql$alter table public.suggestions add constraint suggestions_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola suggestions_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.task_templates') is not null then
    begin
      execute $sql$alter table public.task_templates drop constraint if exists task_templates_assignee_ids_check$sql$;
      execute $sql$alter table public.task_templates add constraint task_templates_assignee_ids_check CHECK ((cardinality(assignee_ids) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola task_templates_assignee_ids_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.task_templates') is not null then
    begin
      execute $sql$alter table public.task_templates drop constraint if exists task_templates_category_check$sql$;
      execute $sql$alter table public.task_templates add constraint task_templates_category_check CHECK ((char_length(category) <= 60)) not valid$sql$;
    exception when others then raise notice 'Kontrola task_templates_category_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.task_templates') is not null then
    begin
      execute $sql$alter table public.task_templates drop constraint if exists task_templates_days_after_check$sql$;
      execute $sql$alter table public.task_templates add constraint task_templates_days_after_check CHECK (((days_after >= 0) AND (days_after <= 60))) not valid$sql$;
    exception when others then raise notice 'Kontrola task_templates_days_after_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.task_templates') is not null then
    begin
      execute $sql$alter table public.task_templates drop constraint if exists task_templates_title_check$sql$;
      execute $sql$alter table public.task_templates add constraint task_templates_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 160))) not valid$sql$;
    exception when others then raise notice 'Kontrola task_templates_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_assignee_ids_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_assignee_ids_check CHECK ((cardinality(assignee_ids) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_assignee_ids_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_category_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_category_check CHECK ((char_length(category) <= 60)) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_category_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_link_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_link_check CHECK ((char_length(link) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_link_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_note_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_priority_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_priority_check CHECK ((priority = ANY (ARRAY['none'::text, 'low'::text, 'normal'::text, 'high'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_priority_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_status_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.tasks') is not null then
    begin
      execute $sql$alter table public.tasks drop constraint if exists tasks_title_check$sql$;
      execute $sql$alter table public.tasks add constraint tasks_title_check CHECK (((char_length(TRIM(BOTH FROM title)) >= 1) AND (char_length(TRIM(BOTH FROM title)) <= 200))) not valid$sql$;
    exception when others then raise notice 'Kontrola tasks_title_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.trashed_photos') is not null then
    begin
      execute $sql$alter table public.trashed_photos drop constraint if exists trashed_photos_owner_table_check$sql$;
      execute $sql$alter table public.trashed_photos add constraint trashed_photos_owner_table_check CHECK ((owner_table = ANY (ARRAY['equipment'::text, 'vehicles'::text, 'cases'::text, 'orders'::text, 'case_photo'::text, 'shopping_items'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola trashed_photos_owner_table_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.trashed_photos') is not null then
    begin
      execute $sql$alter table public.trashed_photos drop constraint if exists trashed_photos_path_check$sql$;
      execute $sql$alter table public.trashed_photos add constraint trashed_photos_path_check CHECK ((char_length(path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola trashed_photos_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.user_prefs') is not null then
    begin
      execute $sql$alter table public.user_prefs drop constraint if exists user_prefs_prefs_check$sql$;
      execute $sql$alter table public.user_prefs add constraint user_prefs_prefs_check CHECK ((pg_column_size(prefs) <= 16000)) not valid$sql$;
    exception when others then raise notice 'Kontrola user_prefs_prefs_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicle_records') is not null then
    begin
      execute $sql$alter table public.vehicle_records drop constraint if exists vehicle_records_cost_check$sql$;
      execute $sql$alter table public.vehicle_records add constraint vehicle_records_cost_check CHECK ((cost >= (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicle_records_cost_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicle_records') is not null then
    begin
      execute $sql$alter table public.vehicle_records drop constraint if exists vehicle_records_description_check$sql$;
      execute $sql$alter table public.vehicle_records add constraint vehicle_records_description_check CHECK ((char_length(description) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicle_records_description_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicle_records') is not null then
    begin
      execute $sql$alter table public.vehicle_records drop constraint if exists vehicle_records_kind_check$sql$;
      execute $sql$alter table public.vehicle_records add constraint vehicle_records_kind_check CHECK ((kind = ANY (ARRAY['service'::text, 'repair'::text, 'oil'::text, 'tyres'::text, 'fuel'::text, 'accident'::text, 'other'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicle_records_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicle_records') is not null then
    begin
      execute $sql$alter table public.vehicle_records drop constraint if exists vehicle_records_liters_check$sql$;
      execute $sql$alter table public.vehicle_records add constraint vehicle_records_liters_check CHECK ((liters > (0)::numeric)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicle_records_liters_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicle_records') is not null then
    begin
      execute $sql$alter table public.vehicle_records drop constraint if exists vehicle_records_odometer_km_check$sql$;
      execute $sql$alter table public.vehicle_records add constraint vehicle_records_odometer_km_check CHECK (((odometer_km >= 0) AND (odometer_km <= 5000000))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicle_records_odometer_km_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_cargo_height_cm_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_cargo_height_cm_check CHECK (((cargo_height_cm >= 1) AND (cargo_height_cm <= 500))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_cargo_height_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_cargo_length_cm_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_cargo_length_cm_check CHECK (((cargo_length_cm >= 1) AND (cargo_length_cm <= 2000))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_cargo_length_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_cargo_obstacles_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_cargo_obstacles_check CHECK (((jsonb_typeof(cargo_obstacles) = 'array'::text) AND (jsonb_array_length(cargo_obstacles) <= 20))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_cargo_obstacles_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_cargo_width_cm_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_cargo_width_cm_check CHECK (((cargo_width_cm >= 1) AND (cargo_width_cm <= 500))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_cargo_width_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_driver_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_driver_check CHECK ((char_length(driver) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_driver_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_model_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_model_check CHECK ((char_length(model) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_model_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_note_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_note_check CHECK ((char_length(note) <= 2000)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_odometer_km_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_odometer_km_check CHECK (((odometer_km >= 0) AND (odometer_km <= 5000000))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_odometer_km_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_payload_kg_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_payload_kg_check CHECK (((payload_kg >= 1) AND (payload_kg <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_payload_kg_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_photo_path_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_photo_path_check CHECK ((char_length(photo_path) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_photo_path_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_plate_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_plate_check CHECK (((char_length(TRIM(BOTH FROM plate)) >= 1) AND (char_length(TRIM(BOTH FROM plate)) <= 20))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_plate_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_status_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'in_service'::text, 'retired'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_status_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.vehicles') is not null then
    begin
      execute $sql$alter table public.vehicles drop constraint if exists vehicles_vin_check$sql$;
      execute $sql$alter table public.vehicles add constraint vehicles_vin_check CHECK ((char_length(vin) <= 20)) not valid$sql$;
    exception when others then raise notice 'Kontrola vehicles_vin_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_kind_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_kind_check CHECK ((kind = ANY (ARRAY['rack'::text, 'pallet'::text, 'zone'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_length_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_length_check CHECK ((length > 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_length_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_levels_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_levels_check CHECK (((levels >= 1) AND (levels <= 20))) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_levels_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_name_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 60))) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_name_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_width_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_width_check CHECK ((width > 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_width_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_x_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_x_check CHECK ((x >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_x_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouse_spots') is not null then
    begin
      execute $sql$alter table public.warehouse_spots drop constraint if exists warehouse_spots_y_check$sql$;
      execute $sql$alter table public.warehouse_spots add constraint warehouse_spots_y_check CHECK ((y >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouse_spots_y_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouses') is not null then
    begin
      execute $sql$alter table public.warehouses drop constraint if exists warehouses_length_cm_check$sql$;
      execute $sql$alter table public.warehouses add constraint warehouses_length_cm_check CHECK (((length_cm >= 100) AND (length_cm <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouses_length_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.warehouses') is not null then
    begin
      execute $sql$alter table public.warehouses drop constraint if exists warehouses_width_cm_check$sql$;
      execute $sql$alter table public.warehouses add constraint warehouses_width_cm_check CHECK (((width_cm >= 100) AND (width_cm <= 100000))) not valid$sql$;
    exception when others then raise notice 'Kontrola warehouses_width_cm_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_dhcp_end_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_dhcp_end_check CHECK ((char_length(dhcp_end) <= 45)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_dhcp_end_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_dhcp_start_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_dhcp_start_check CHECK ((char_length(dhcp_start) <= 45)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_dhcp_start_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_management_ip_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_management_ip_check CHECK ((char_length(management_ip) <= 45)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_management_ip_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_note_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_note_check CHECK ((char_length(note) <= 1000)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_password_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_password_check CHECK ((char_length(password) <= 63)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_password_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_place_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_place_check CHECK ((char_length(place) <= 120)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_place_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_router_ip_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_router_ip_check CHECK ((char_length(router_ip) <= 45)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_router_ip_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_router_model_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_router_model_check CHECK ((char_length(router_model) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_router_model_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_security_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_security_check CHECK ((security = ANY (ARRAY['WPA'::text, 'WEP'::text, 'nopass'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_security_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_ssid_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_ssid_check CHECK (((char_length(ssid) >= 1) AND (char_length(ssid) <= 32))) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_ssid_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_networks') is not null then
    begin
      execute $sql$alter table public.wifi_networks drop constraint if exists wifi_networks_subnet_check$sql$;
      execute $sql$alter table public.wifi_networks add constraint wifi_networks_subnet_check CHECK ((char_length(subnet) <= 43)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_networks_subnet_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_router_logins') is not null then
    begin
      execute $sql$alter table public.wifi_router_logins drop constraint if exists wifi_router_logins_password_check$sql$;
      execute $sql$alter table public.wifi_router_logins add constraint wifi_router_logins_password_check CHECK ((char_length(password) <= 128)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_router_logins_password_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.wifi_router_logins') is not null then
    begin
      execute $sql$alter table public.wifi_router_logins drop constraint if exists wifi_router_logins_username_check$sql$;
      execute $sql$alter table public.wifi_router_logins add constraint wifi_router_logins_username_check CHECK ((char_length(username) <= 80)) not valid$sql$;
    exception when others then raise notice 'Kontrola wifi_router_logins_username_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_break_minutes_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_break_minutes_check CHECK (((break_minutes >= 0) AND (break_minutes <= 1440))) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_break_minutes_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_check CHECK (((ended_at IS NULL) OR (ended_at > started_at))) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_distance_m_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_distance_m_check CHECK ((distance_m >= 0)) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_distance_m_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_note_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_note_check CHECK ((char_length(note) <= 300)) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_note_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_pause_kind_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_pause_kind_check CHECK ((pause_kind = ANY (ARRAY['break'::text, 'wait'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_pause_kind_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_place_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_place_check CHECK ((place = ANY (ARRAY['company'::text, 'home'::text]))) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_place_check: %', sqlerrm;
    end;
  end if;
  if to_regclass('public.work_sessions') is not null then
    begin
      execute $sql$alter table public.work_sessions drop constraint if exists work_sessions_wait_minutes_check$sql$;
      execute $sql$alter table public.work_sessions add constraint work_sessions_wait_minutes_check CHECK (((wait_minutes >= 0) AND (wait_minutes <= 1440))) not valid$sql$;
    exception when others then raise notice 'Kontrola work_sessions_wait_minutes_check: %', sqlerrm;
    end;
  end if;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.accept_company_link(_link_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.company_links set status = 'accepted', accepted_at = now()
  where id = _link_id and status = 'pending' and public.has_role(target, 'admin');
  if not found then
    raise exception 'Žiadosť neexistuje alebo ju nemôžete potvrdiť' using errcode = 'insufficient_privilege';
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia accept_company_link: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.accept_invitation(_invitation_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _inv public.company_invitations;
begin
  select * into _inv from public.company_invitations i
  where i.id = _invitation_id and i.email = public.current_email();
  if not found then
    raise exception 'Pozvánka neexistuje' using errcode = 'no_data_found';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (_inv.company_id, auth.uid(), _inv.role)
  on conflict do nothing;
  delete from public.company_invitations where id = _inv.id;
  return _inv.company_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia accept_invitation: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.actor_name()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
$function$$repairfn$;
exception when others then raise notice 'Funkcia actor_name: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.add_loan_items(_company_id uuid, _loan_id uuid, _items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _starts date;
  _ends date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
  _units integer[];
  _taken integer;
begin
  select l.starts_on, l.ends_on into _starts, _ends from public.loans l
  where l.id = _loan_id and l.company_id = _company_id;
  if not found then
    raise exception 'Výpožička neexistuje' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    _units := '{}';
    if _equipment.track_units then
      if jsonb_typeof(_item -> 'unit_numbers') = 'array' then
        _units := array(select distinct u::integer from jsonb_array_elements_text(_item -> 'unit_numbers') u order by 1);
      end if;
      if cardinality(_units) = 0 then
        raise exception 'Pri technike „%“ vyberte konkrétne kusy', _equipment.name using errcode = 'check_violation';
      end if;
      if not (_units <@ public.unit_ids_of(_equipment.quantity, _equipment.unit_ids)) then
        raise exception 'Technika „%“ má iba kusy %', _equipment.name,
          array_to_string(public.unit_ids_of(_equipment.quantity, _equipment.unit_ids), ', ')
          using errcode = 'check_violation';
      end if;
      _qty := cardinality(_units);

      select u into _taken
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      cross join unnest(li.unit_numbers) u
      where li.equipment_id = _equipment.id
        and l.id <> _loan_id
        and l.status in ('reserved', 'issued')
        and l.starts_on <= _ends
        and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts
        and u = any (_units)
      limit 1;
      if found then
        raise exception 'Kus #% techniky „%“ je v tomto termíne už na inej výpožičke', _taken, _equipment.name
          using errcode = 'check_violation';
      end if;
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.id <> _loan_id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id, unit_numbers, unit_price)
    values (
      _company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid, _units,
      (_item ->> 'unit_price')::numeric
    );
  end loop;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia add_loan_items: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.all_members_of(_company_id uuid, _users uuid[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(bool_and(public.is_member_of(_company_id, u)), true) from unnest(_users) u;
$function$$repairfn$;
exception when others then raise notice 'Funkcia all_members_of: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.apply_hour_reading()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.unit is null then
    update public.equipment
    set operating_hours = new.hours, hours_read_on = new.read_on
    where id = new.equipment_id and company_id = new.company_id
      and (hours_read_on is null or hours_read_on <= new.read_on);
  else
    with latest as (
      select distinct on (r.unit) r.hours, r.read_on
      from public.equipment_hour_readings r
      where r.equipment_id = new.equipment_id and r.unit is not null
      order by r.unit, r.read_on desc, r.created_at desc
    )
    update public.equipment
    set operating_hours = (select max(hours) from latest), hours_read_on = (select min(read_on) from latest)
    where id = new.equipment_id and company_id = new.company_id;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia apply_hour_reading: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.apply_personal_profile(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.personal_profiles%rowtype;
begin
  select * into p from public.personal_profiles where user_id = _user_id;
  if not found then return; end if;
  update public.staff s
    set phone = p.phone, email = p.email, birth_date = p.birth_date, name_day = p.name_day, licences = p.licences,
        socials = case when p.socials = '{}'::jsonb then s.socials else p.socials end,
        skills = case when p.skills = '' then s.skills else p.skills end
    where s.member_id = _user_id and s.sync_profile;
  if p.home_address <> '' then
    insert into public.member_homes (company_id, user_id, address, lat, lon, updated_at)
      select m.company_id, _user_id, p.home_address, p.home_lat, p.home_lon, now()
      from public.company_members m where m.user_id = _user_id
    on conflict (company_id, user_id) do update set address = excluded.address, lat = excluded.lat, lon = excluded.lon, updated_at = now();
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia apply_personal_profile: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.apply_service_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _record public.service_records;
  _total integer;
  _open integer;
begin
  if tg_op = 'DELETE' then
    _record := old;
  else
    _record := new;
  end if;

  select e.quantity into _total from public.equipment e
  where e.id = _record.equipment_id and e.company_id = _record.company_id;
  -- Technika sa práve maže (kaskáda), niet čo prepínať.
  if not found then
    return null;
  end if;

  if tg_op <> 'DELETE' and new.status <> 'done' and new.quantity > greatest(_total, 1) then
    raise exception 'V servise nemôže byť viac kusov (%), než koľko ich technika má (%)', new.quantity, _total
      using errcode = 'check_violation';
  end if;

  if tg_op <> 'DELETE' and new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    update public.equipment
    set last_service_on = greatest(coalesce(last_service_on, new.happened_on), new.happened_on)
    where id = new.equipment_id and company_id = new.company_id;
  end if;

  select coalesce(sum(s.quantity), 0) into _open from public.service_records s
  where s.equipment_id = _record.equipment_id and s.status <> 'done';

  update public.equipment
  set status = case
    when _open > 0 and _open >= quantity and status in ('available', 'damaged') then 'in_service'::public.equipment_status
    when (_open = 0 or _open < quantity) and status = 'in_service' then 'available'::public.equipment_status
    else status
  end
  where id = _record.equipment_id and company_id = _record.company_id;

  return null;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia apply_service_status: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.bump_vehicle_odometer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.odometer_km is not null then
    update public.vehicles set odometer_km = new.odometer_km
    where id = new.vehicle_id and company_id = new.company_id
      and (odometer_km is null or odometer_km < new.odometer_km);
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia bump_vehicle_odometer: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.can(_company_id uuid, _permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (
      select m.role in ('admin', 'ceo') or coalesce(
        (select mp.allowed from public.member_permissions mp
          where mp.company_id = m.company_id and mp.user_id = m.user_id and mp.permission = _permission),
        (select true from public.permission_group_members gm
          join public.permission_group_rules gr on gr.group_id = gm.group_id and gr.permission = _permission
          where gm.company_id = m.company_id and gm.user_id = m.user_id
          limit 1),
        (select rp.allowed from public.role_permissions rp
          where rp.company_id = m.company_id and rp.role = m.role and rp.permission = _permission),
        (select m.role = any (d.roles) from public.permission_defaults() d where d.permission = _permission),
        false
      )
      from public.company_members m
      where m.company_id = _company_id and m.user_id = auth.uid()
    ),
    false
  )
$function$$repairfn$;
exception when others then raise notice 'Funkcia can: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.can_create_company()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select auth.uid() is not null and (
    not exists (select 1 from public.app_developers)
    or public.is_developer()
    or exists (select 1 from public.company_creators c where c.user_id = auth.uid())
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia can_create_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.check_service_units()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _valid integer[];
  _missing integer;
  _taken integer;
begin
  if cardinality(new.unit_numbers) = 0 then
    return new;
  end if;

  new.unit_numbers := array(select distinct u from unnest(new.unit_numbers) u order by u);
  if exists (select 1 from unnest(new.unit_numbers) u where u is null or u < 1) then
    raise exception 'Neplatné číslo kusu' using errcode = 'check_violation';
  end if;

  if new.status <> 'done' then
    select public.unit_ids_of(e.quantity, e.unit_ids) into _valid from public.equipment e
    where e.id = new.equipment_id and e.company_id = new.company_id;
    select u into _missing from unnest(new.unit_numbers) u where u <> all (_valid) order by u limit 1;
    if found then
      raise exception 'Technika má % ks, kus #% neexistuje', cardinality(_valid), _missing using errcode = 'check_violation';
    end if;

    select u into _taken
    from public.service_records s, unnest(s.unit_numbers) u
    where s.equipment_id = new.equipment_id and s.id <> new.id and s.status <> 'done'
      and u = any (new.unit_numbers)
    limit 1;
    if found then
      raise exception 'Kus #% už je v servise v inom zázname', _taken using errcode = 'check_violation';
    end if;
  end if;

  new.quantity := cardinality(new.unit_numbers);
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia check_service_units: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.company_account_status(_company uuid)
 RETURNS TABLE(email text, user_id uuid, is_member boolean, has_account boolean, confirmed boolean, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_role(_company, 'admin') then
    raise exception 'Only an admin can see account status' using errcode = '42501';
  end if;
  return query
    select u.email::text, u.id, true, true, u.email_confirmed_at is not null, u.last_sign_in_at
    from public.company_members m
    join auth.users u on u.id = m.user_id
    where m.company_id = _company
    union all
    select i.email, u.id, false, u.id is not null, u.email_confirmed_at is not null, u.last_sign_in_at
    from public.company_invitations i
    left join auth.users u on lower(u.email) = i.email
    where i.company_id = _company;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia company_account_status: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_cases_bulk(_company_id uuid, _base_name text, _count integer, _start integer DEFAULT 1, _template_id uuid DEFAULT NULL::uuid, _equipment_id uuid DEFAULT NULL::uuid, _per_case integer DEFAULT NULL::integer)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.case_templates%rowtype;
  _ids uuid[] := '{}';
  _case uuid;
  _available integer;
  i integer;
begin
  if not public.can(_company_id, 'cases.edit') then
    raise exception 'Nemôžete pridávať case' using errcode = 'insufficient_privilege';
  end if;
  if _count is null or _count < 1 or _count > 100 then
    raise exception 'Počet case musí byť 1 až 100' using errcode = 'check_violation';
  end if;
  if _template_id is not null then
    select * into t from public.case_templates where id = _template_id and company_id = _company_id;
  end if;
  if _equipment_id is not null then
    if not public.can(_company_id, 'equipment.edit') then
      raise exception 'Techniku nemôžete meniť' using errcode = 'insufficient_privilege';
    end if;
    select quantity into _available from public.equipment where id = _equipment_id and company_id = _company_id and deleted_at is null;
    if _available is null or coalesce(_per_case, 0) < 1 or _available < _count * _per_case then
      raise exception 'Nie je dosť kusov: treba %, je %', _count * coalesce(_per_case, 0), coalesce(_available, 0) using errcode = 'check_violation';
    end if;
  end if;

  for i in 0 .. _count - 1 loop
    insert into public.cases (company_id, name, label_number, label_category, weight_kg, width_cm, length_cm, depth_cm)
    values (_company_id, trim(_base_name) || ' ' || (coalesce(_start, 1) + i), (coalesce(_start, 1) + i)::text,
            coalesce(t.label_category, ''), t.weight_kg, t.width_cm, t.length_cm, t.depth_cm)
    returning id into _case;
    _ids := _ids || _case;
    if _equipment_id is not null then
      perform public.split_equipment_into_case(_equipment_id, _case, _per_case);
    end if;
  end loop;
  return _ids;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_cases_bulk: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_company(_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can_create_company() then
    raise exception 'Založenie novej firmy musí povoliť správca aplikácie' using errcode = 'insufficient_privilege';
  end if;
  insert into public.companies (name, created_by) values (trim(_name), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_demo_company()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select id into _id from public.companies where demo_owner = auth.uid();
  if _id is not null then
    return _id;
  end if;
  insert into public.companies (name, created_by, demo_owner) values ('DEMO – Ukážková firma', auth.uid(), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  perform public.seed_demo_company(_id);
  perform public.seed_demo_extras(_id, auth.uid());
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_demo_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _loan_id uuid;
begin
  -- Prázdny zoznam odmietneme skôr, než vznikne riadok výpožičky.
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    (_loan ->> 'starts_on')::date, (_loan ->> 'ends_on')::date, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  perform public.add_loan_items(_company_id, _loan_id, _items);
  return _loan_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_loan: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_member_staff_card()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _prev public.staff;
begin
  select * into _prev from public.staff s
  where s.member_id = new.user_id and s.company_id <> new.company_id
  order by (s.phone <> '' or s.birth_date is not null) desc, s.created_at desc
  limit 1;
  insert into public.staff (company_id, member_id, name, phone, email, birth_date, name_day, licences, socials, onboarded)
  values (
    new.company_id, new.user_id,
    coalesce(_prev.name, ''), coalesce(_prev.phone, ''), coalesce(_prev.email, ''),
    _prev.birth_date, coalesce(_prev.name_day, ''), coalesce(_prev.licences, '{}'), coalesce(_prev.socials, '{}'),
    coalesce(_prev.onboarded, false)
  )
  on conflict do nothing;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_member_staff_card: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_order(_company_id uuid, _order jsonb, _items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _kind text;
  _attributes jsonb;
  _qty integer;
  _mode text;
  _units integer[];
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note, source, seller)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), ''),
    coalesce(nullif(_order ->> 'source', ''), 'shop'),
    coalesce(trim(_order ->> 'seller'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');
    _category_id := nullif(_item ->> 'category_id', '')::uuid;
    _kind := coalesce(nullif(_item ->> 'kind', ''), 'general');
    _attributes := coalesce(_item -> 'attributes', '{}'::jsonb);

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price, article_number, mode, category_id)
    values (
      _company_id, _order_id, _position, trim(_item ->> 'name'), _qty,
      coalesce((_item ->> 'unit_price')::numeric, 0),
      coalesce(trim(_item ->> 'article_number'), ''),
      _mode, _category_id
    )
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id, kind, attributes)
        values (_company_id, _equipment_name, _category_id, _kind, _attributes)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, kind, attributes, quantity)
      values (_company_id, _equipment_name, _category_id, _kind, _attributes, _qty)
      returning id into _equipment_id;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'existing' then
      update public.equipment set quantity = quantity + _qty
      where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid
      returning id into _equipment_id;
      if _equipment_id is null then
        raise exception 'Technika na doplnenie neexistuje' using errcode = 'no_data_found';
      end if;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'link' then
      -- Technika už je v evidencii: len prepojenie (počet kusov sa nemení), prípadne s číslami kusov.
      select id into _equipment_id from public.equipment where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid;
      if _equipment_id is null then
        raise exception 'Technika na prepojenie neexistuje' using errcode = 'no_data_found';
      end if;
      _units := coalesce((select array_agg(distinct value::integer order by value::integer) from jsonb_array_elements_text(coalesce(_item -> 'unit_numbers', '[]'::jsonb))), '{}');
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity, unit_numbers)
      values (_company_id, _item_id, _equipment_id, _qty, _units);
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_order: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_own_case(_company_id uuid, _name text, _note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _id uuid;
begin
  insert into public.cases (company_id, name, note, owner_staff_id)
  values (_company_id, trim(_name), coalesce(trim(_note), ''), public.my_staff_card(_company_id))
  returning id into _id;
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_own_case: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_own_equipment(_company_id uuid, _name text, _kind text, _quantity integer, _manufacturer text DEFAULT ''::text, _model text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _id uuid;
begin
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, owner_staff_id)
  values (_company_id, trim(_name), _kind, greatest(1, coalesce(_quantity, 1)), coalesce(trim(_manufacturer), ''), coalesce(trim(_model), ''), public.my_staff_card(_company_id))
  returning id into _id;
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_own_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_partner_company(_partner_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _partner public.partners;
  _id uuid;
begin
  select * into _partner from public.partners p where p.id = _partner_id;
  if not found or not public.can(_partner.company_id, 'events.edit') then
    raise exception 'Firma neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _partner.linked_company_id is not null then
    return _partner.linked_company_id;
  end if;
  insert into public.companies (name, created_by, founded_by) values (left(trim(_partner.name), 120), auth.uid(), _partner.company_id) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  insert into public.company_profile (company_id, legal_name, ico, dic, ic_dph, address, ceo_name)
  values (_id, left(coalesce(nullif(trim(_partner.legal_name), ''), _partner.name), 160), left(_partner.ico, 20), left(_partner.dic, 20),
          left(_partner.ic_dph, 20), left(_partner.address, 200), left(_partner.ceo, 120));
  update public.partners set linked_company_id = _id, uses_app = true where id = _partner_id;
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_partner_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_post_event_tasks(_company_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _count integer;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom firmy' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tasks (company_id, title, category, due_on, event_id, template_id, created_by, assignee_ids)
  select e.company_id, left(t.title || ': ' || e.name, 200), t.category, e.ends_on + t.days_after, e.id, t.id, null,
    -- len riešitelia, ktorí sú stále členmi firmy
    coalesce((select array_agg(a) from unnest(t.assignee_ids) a where public.is_member_of(e.company_id, a)), '{}')
  from public.events e
  join public.task_templates t on t.company_id = e.company_id and t.active
  where e.company_id = _company_id
    and e.ends_on < current_date
    and e.ends_on >= current_date - 60
    and t.created_at::date <= e.ends_on + 60
  on conflict (event_id, template_id) where event_id is not null and template_id is not null do nothing;
  get diagnostics _count = row_count;
  return _count;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_post_event_tasks: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.create_priced_loan(_company_id uuid, _loan jsonb, _items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _loan_id uuid;
begin
  _loan_id := public.create_loan(_company_id, _loan, _items);

  update public.loans
  set
    borrower_ico = coalesce(trim(_loan ->> 'borrower_ico'), ''),
    borrower_address = coalesce(trim(_loan ->> 'borrower_address'), ''),
    billed_days = (_loan ->> 'billed_days')::integer,
    price = (_loan ->> 'price')::numeric,
    deposit = (_loan ->> 'deposit')::numeric
  where id = _loan_id;

  update public.loan_items li
  set unit_price = (i.value ->> 'unit_price')::numeric
  from jsonb_array_elements(_items) i
  where li.loan_id = _loan_id and li.equipment_id = (i.value ->> 'equipment_id')::uuid;

  return _loan_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia create_priced_loan: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.crew_busy_elsewhere(_company_id uuid, _from date, _to date)
 RETURNS TABLE(member_id uuid, events integer, starts_on date, ends_on date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.member_id, count(distinct e.id)::integer, min(e.starts_on), max(e.ends_on)
  from public.event_crew c
  join public.events e on e.id = c.event_id
  where public.can(_company_id, 'events.view')
    and c.company_id <> _company_id
    and c.member_id in (select m.user_id from public.company_members m where m.company_id = _company_id)
    and c.response <> 'no'
    and e.status <> 'cancelled'
    and e.starts_on <= _to and e.ends_on >= _from
  group by c.member_id;
$function$$repairfn$;
exception when others then raise notice 'Funkcia crew_busy_elsewhere: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.current_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select lower(u.email) from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$function$$repairfn$;
exception when others then raise notice 'Funkcia current_email: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.decide_company_request(_request_id uuid, _approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.company_requests%rowtype;
begin
  if not public.is_developer() then
    raise exception 'Len vývojár aplikácie' using errcode = 'insufficient_privilege';
  end if;
  select * into r from public.company_requests where id = _request_id;
  if not found then return; end if;
  update public.company_requests set status = case when _approve then 'approved' else 'rejected' end, decided_at = now() where id = _request_id;
  if _approve then
    insert into public.company_creators (user_id, granted_by) values (r.user_id, auth.uid()) on conflict (user_id) do nothing;
  end if;
  insert into public.notifications (user_id, title, body, url)
  values (
    r.user_id,
    case when _approve then 'Môžete založiť firmu' else 'Žiadosť o firmu zamietnutá' end,
    left(case when _approve then 'Založte ju na „Vyberte firmu“ → Vytvoriť novú firmu: ' else 'Firma: ' end || r.company_name, 300),
    case when _approve then '/company/create' else '/company/select' end
  );
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia decide_company_request: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.delete_company(_company uuid, _confirm_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.has_role(_company, 'admin') then
    raise exception 'Only an admin can delete the company' using errcode = '42501';
  end if;
  select c.name into _name from public.companies c where c.id = _company;
  if _name is null then
    raise exception 'Company not found' using errcode = 'P0002';
  end if;
  if trim(coalesce(_confirm_name, '')) <> trim(_name) then
    raise exception 'Company name does not match' using errcode = '22023';
  end if;
  delete from public.companies where id = _company;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia delete_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.delete_demo_company()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  delete from public.companies where demo_owner = auth.uid();
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia delete_demo_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.drop_attachments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.attachments where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia drop_attachments: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.equipment_sync_copies()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.shared_from is not null then return new; end if;
  update public.equipment c
    set name = new.name, kind = new.kind, attributes = new.attributes, manufacturer = new.manufacturer, model = new.model,
        serial_number = new.serial_number, quantity = new.quantity, track_units = new.track_units, unit_ids = new.unit_ids, note = new.note
    where c.shared_from = new.id
      and (c.name, c.kind, c.attributes, c.manufacturer, c.model, c.serial_number, c.quantity, c.track_units, c.unit_ids, c.note)
          is distinct from (new.name, new.kind, new.attributes, new.manufacturer, new.model, new.serial_number, new.quantity, new.track_units, new.unit_ids, new.note);
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia equipment_sync_copies: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.event_quotes_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform pg_advisory_xact_lock(hashtext('event_quotes:' || new.company_id::text || ':' || new.year::text));
  select coalesce(max(number), 0) + 1 into new.number from public.event_quotes where company_id = new.company_id and year = new.year;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia event_quotes_number: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.fill_staff_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.personal_profiles%rowtype;
begin
  if new.member_id is null or not new.sync_profile then return new; end if;
  if tg_op = 'UPDATE' and old.sync_profile then return new; end if;
  select * into p from public.personal_profiles where user_id = new.member_id;
  if found then
    new.phone := p.phone;
    new.email := p.email;
    new.birth_date := p.birth_date;
    new.name_day := p.name_day;
    new.licences := p.licences;
    if p.socials <> '{}'::jsonb then new.socials := p.socials; end if;
    if p.skills <> '' then new.skills := p.skills; end if;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia fill_staff_from_profile: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.find_rigtrack_companies(_ico text, _name text, _legal_name text DEFAULT ''::text)
 RETURNS TABLE(id uuid, name text, legal_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.id, c.name, coalesce(p.legal_name, '')
  from public.companies c
  left join public.company_profile p on p.company_id = c.id
  where auth.uid() is not null
    and (
      (length(regexp_replace(coalesce(_ico, ''), '\s', '', 'g')) >= 6
        and regexp_replace(coalesce(p.ico, ''), '\s', '', 'g') = regexp_replace(_ico, '\s', '', 'g'))
      or (trim(coalesce(_name, '')) <> '' and (lower(trim(c.name)) = lower(trim(_name)) or lower(trim(coalesce(p.legal_name, ''))) = lower(trim(_name))))
      or (trim(coalesce(_legal_name, '')) <> '' and (lower(trim(c.name)) = lower(trim(_legal_name)) or lower(trim(coalesce(p.legal_name, ''))) = lower(trim(_legal_name))))
    )
  order by c.name
  limit 5;
$function$$repairfn$;
exception when others then raise notice 'Funkcia find_rigtrack_companies: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.finish_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  zone constant text := 'Europe/Bratislava';
  editor boolean := public.can(old.company_id, 'events.edit');
  ending boolean := old.ended_at is null and new.ended_at is not null;
  paused integer;
begin
  new.company_id := old.company_id;
  new.event_id := old.event_id;
  new.user_id := old.user_id;
  new.meeting_id := old.meeting_id;
  new.verified := old.verified;
  new.distance_m := old.distance_m;
  new.work_log_id := old.work_log_id;
  if not editor then
    new.started_at := old.started_at;
    new.break_minutes := old.break_minutes;
    new.wait_minutes := old.wait_minutes;
    new.ended_at := case when ending then now() else old.ended_at end;
  end if;
  if editor and (
    new.started_at is distinct from old.started_at
    or (old.ended_at is not null and new.ended_at is distinct from old.ended_at)
    or new.break_minutes is distinct from old.break_minutes
    or new.wait_minutes is distinct from old.wait_minutes
  ) then
    new.edited_by_name := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  else
    new.edited_by_name := old.edited_by_name;
  end if;

  -- Prestávka: začiatok a koniec určuje server; pri odchode sa prebiehajúca ukončí.
  if old.paused_at is not null and (new.paused_at is null or ending) then
    paused := least(1440, ceil(extract(epoch from (now() - old.paused_at)) / 60)::integer);
    if old.pause_kind = 'wait' then
      new.wait_minutes := least(1440, new.wait_minutes + paused);
    else
      new.break_minutes := least(1440, new.break_minutes + paused);
    end if;
    new.paused_at := null;
    new.pause_kind := null;
  elsif old.paused_at is null and new.paused_at is not null and old.ended_at is null and not ending then
    new.paused_at := now();
    new.pause_kind := coalesce(new.pause_kind, 'break');
  else
    new.paused_at := old.paused_at;
    new.pause_kind := old.pause_kind;
  end if;

  if new.ended_at is not null then
    if new.work_log_id is null then
      insert into public.event_work_logs (company_id, event_id, user_id, work_date, starts_at, ends_at, break_minutes, note)
      values (
        new.company_id, new.event_id, new.user_id,
        (new.started_at at time zone zone)::date,
        (new.started_at at time zone zone)::time(0),
        (new.ended_at at time zone zone)::time(0),
        least(1440, new.break_minutes + new.wait_minutes),
        'Dochádzka' || case when new.wait_minutes > 0 then ' (čakanie ' || new.wait_minutes || ' min)' else '' end
      )
      returning id into new.work_log_id;
    else
      update public.event_work_logs
        set work_date = (new.started_at at time zone zone)::date,
            starts_at = (new.started_at at time zone zone)::time(0),
            ends_at = (new.ended_at at time zone zone)::time(0),
            break_minutes = least(1440, new.break_minutes + new.wait_minutes),
            note = 'Dochádzka' || case when new.wait_minutes > 0 then ' (čakanie ' || new.wait_minutes || ' min)' else '' end
        where id = new.work_log_id;
    end if;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia finish_attendance: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.finish_work_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  editor boolean := public.can(old.company_id, 'staff.manage');
  ending boolean := old.ended_at is null and new.ended_at is not null;
  paused integer;
begin
  new.company_id := old.company_id;
  new.user_id := old.user_id;
  new.place := old.place;
  new.verified := old.verified;
  new.distance_m := old.distance_m;
  if not editor then
    new.started_at := old.started_at;
    new.break_minutes := old.break_minutes;
    new.wait_minutes := old.wait_minutes;
    new.ended_at := case when ending then now() else old.ended_at end;
  end if;
  if editor and (
    new.started_at is distinct from old.started_at
    or (old.ended_at is not null and new.ended_at is distinct from old.ended_at)
    or new.break_minutes is distinct from old.break_minutes
    or new.wait_minutes is distinct from old.wait_minutes
  ) then
    new.edited_by_name := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  else
    new.edited_by_name := old.edited_by_name;
  end if;
  if old.paused_at is not null and (new.paused_at is null or ending) then
    paused := least(1440, ceil(extract(epoch from (now() - old.paused_at)) / 60)::integer);
    if old.pause_kind = 'wait' then
      new.wait_minutes := least(1440, new.wait_minutes + paused);
    else
      new.break_minutes := least(1440, new.break_minutes + paused);
    end if;
    new.paused_at := null;
    new.pause_kind := null;
  elsif old.paused_at is null and new.paused_at is not null and old.ended_at is null and not ending then
    new.paused_at := now();
    new.pause_kind := coalesce(new.pause_kind, 'break');
  else
    new.paused_at := old.paused_at;
    new.pause_kind := old.pause_kind;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia finish_work_session: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.gear_busy_elsewhere(_company_id uuid, _from date, _to date)
 RETURNS TABLE(equipment_id uuid, quantity integer, starts_on date, ends_on date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select x.id, sum(ee.quantity)::integer, min(e.starts_on), max(e.ends_on)
  from public.equipment x
  join public.equipment r on coalesce(r.shared_from, r.id) = coalesce(x.shared_from, x.id) and r.company_id <> x.company_id
  join public.event_equipment ee on ee.equipment_id = r.id
  join public.events e on e.id = ee.event_id
  where public.can(_company_id, 'events.view')
    and x.company_id = _company_id
    and (x.shared_from is not null or exists (select 1 from public.equipment c where c.shared_from = x.id))
    and e.status <> 'cancelled'
    and e.starts_on <= _to and e.ends_on >= _from
  group by x.id;
$function$$repairfn$;
exception when others then raise notice 'Funkcia gear_busy_elsewhere: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.get_shared_offer(_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'number', q.number, 'status', q.status, 'client', q.client, 'issuer', q.issuer, 'title', q.title, 'place', q.place,
    'serviceDates', q.service_dates, 'issuedOn', q.issued_on, 'sections', q.sections, 'vatMode', q.vat_mode, 'vatPct', q.vat_pct,
    'totalOverride', q.total_override, 'notes', q.notes, 'authorName', q.author_name, 'respondedAt', q.responded_at,
    'responseNote', q.response_note, 'companyName', c.name
  )
  from public.quotes q join public.companies c on c.id = q.company_id
  where _token is not null and q.share_token = _token;
$function$$repairfn$;
exception when others then raise notice 'Funkcia get_shared_offer: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.guard_suggestion_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.status is distinct from old.status and not public.has_role(new.company_id, 'admin', 'skladnik') then
    raise exception 'Stav návrhu môže zmeniť iba admin alebo skladník' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia guard_suggestion_status: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia handle_new_user: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.has_role(_company_id uuid, VARIADIC _roles app_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select exists (
      select 1 from public.company_members m
      where m.company_id = _company_id and m.user_id = auth.uid()
        and (m.role = any (_roles) or (m.role = 'ceo' and 'admin' = any (_roles)))
    );
  $function$$repairfn$;
exception when others then raise notice 'Funkcia has_role: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.hook_require_invitation(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _email text := lower(trim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if _email <> '' and exists (select 1 from public.company_invitations i where i.email = _email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Registrácia je len na pozvánku.'));
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia hook_require_invitation: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid()
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_company_member: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_developer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.app_developers d where d.user_id = auth.uid())
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_developer: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_event_crew(_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.event_crew c where c.event_id = _event_id and c.member_id = auth.uid() and c.response <> 'no')
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_event_crew: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_helper(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid() and m.role = 'helper'
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_helper: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_invited_to(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.company_invitations i
    where i.company_id = _company_id and i.email = public.current_email()
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_invited_to: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_member_of(_company_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.company_members m where m.company_id = _company_id and m.user_id = _user_id
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_member_of: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_my_staff(_staff_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.staff s where s.id = _staff_id and s.member_id = auth.uid())
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_my_staff: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.is_permission(_permission text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.permission_defaults() d where d.permission = _permission);
$function$$repairfn$;
exception when others then raise notice 'Funkcia is_permission: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.issue_loan(_loan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.loans set status = 'issued', issued_at = now()
  where id = _loan_id and status = 'reserved';
  if not found then
    raise exception 'Výpožičku nemožno vydať' using errcode = 'check_violation';
  end if;

  update public.equipment e set status = 'loaned'
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id
    and e.status = 'available' and li.quantity >= e.quantity;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia issue_loan: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.link_order_item(_item_id uuid, _equipment_id uuid, _units integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _company uuid;
  _qty integer;
begin
  select i.company_id, i.quantity into _company, _qty from public.order_items i where i.id = _item_id;
  if _company is null or not public.can(_company, 'orders.edit') then
    raise exception 'Na prepojenie nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.equipment e where e.id = _equipment_id and e.company_id = _company) then
    raise exception 'Technika na prepojenie neexistuje' using errcode = 'no_data_found';
  end if;
  _units := coalesce((select array_agg(distinct u order by u) from unnest(_units) u where u > 0), '{}');
  delete from public.order_item_equipment where order_item_id = _item_id and equipment_id = _equipment_id;
  insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity, unit_numbers)
  values (_company, _item_id, _equipment_id, greatest(1, coalesce(nullif(cardinality(_units), 0), _qty)), _units);
  update public.order_items set mode = 'link' where id = _item_id and mode = 'none';
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia link_order_item: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.link_partner_company(_partner_id uuid, _company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _owner uuid;
begin
  select company_id into _owner from public.partners where id = _partner_id;
  if _owner is null or not public.can(_owner, 'events.edit') then
    raise exception 'Firma neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _company_id = _owner then
    raise exception 'Firmu nemožno prepojiť samu so sebou' using errcode = 'check_violation';
  end if;
  update public.partners set linked_company_id = _company_id, uses_app = (_company_id is not null) or uses_app where id = _partner_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia link_partner_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.linked_companies(_company_id uuid)
 RETURNS TABLE(link_id uuid, company_id uuid, name text, status text, incoming boolean, i_share_equipment boolean, they_share_equipment boolean, i_share_contacts boolean, they_share_contacts boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.id,
    case when l.requester = _company_id then l.target else l.requester end,
    c.name, l.status, l.target = _company_id,
    case when l.requester = _company_id then l.requester_shares_equipment else l.target_shares_equipment end,
    case when l.requester = _company_id then l.target_shares_equipment else l.requester_shares_equipment end,
    case when l.requester = _company_id then l.requester_shares_contacts else l.target_shares_contacts end,
    case when l.requester = _company_id then l.target_shares_contacts else l.requester_shares_contacts end
  from public.company_links l
  join public.companies c on c.id = case when l.requester = _company_id then l.target else l.requester end
  where (l.requester = _company_id or l.target = _company_id) and public.is_company_member(_company_id)
  order by c.name;
$function$$repairfn$;
exception when others then raise notice 'Funkcia linked_companies: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.linked_equipment(_company_id uuid)
 RETURNS TABLE(id uuid, company_id uuid, company_name text, name text, kind text, category text, quantity integer, manufacturer text, model text, attributes jsonb, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.id, e.company_id, c.name, e.name, e.kind, coalesce(cat.name, ''), e.quantity, e.manufacturer, e.model, e.attributes, e.status::text
  from public.company_links l
  join public.equipment e on e.company_id = case when l.requester = _company_id then l.target else l.requester end
  join public.companies c on c.id = e.company_id
  left join public.equipment_categories cat on cat.id = e.category_id
  where l.status = 'accepted'
    and (l.requester = _company_id or l.target = _company_id)
    and (case when l.requester = _company_id then l.target_shares_equipment else l.requester_shares_equipment end)
    and public.can(_company_id, 'equipment.view')
    and e.deleted_at is null and e.status <> 'retired' and e.owner_staff_id is null
  order by c.name, e.name;
$function$$repairfn$;
exception when others then raise notice 'Funkcia linked_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.linked_partners(_company_id uuid)
 RETURNS TABLE(id uuid, company_name text, name text, ico text, dic text, address text, note text, contacts jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.id, c.name, p.name, p.ico, p.dic, p.address, p.note,
    coalesce((select jsonb_agg(jsonb_build_object('name', pc.name, 'role', pc.role, 'phone', pc.phone, 'email', pc.email) order by pc.name)
      from public.partner_contacts pc where pc.partner_id = p.id), '[]'::jsonb)
  from public.company_links l
  join public.partners p on p.company_id = case when l.requester = _company_id then l.target else l.requester end
  join public.companies c on c.id = p.company_id
  where l.status = 'accepted'
    and (l.requester = _company_id or l.target = _company_id)
    and (case when l.requester = _company_id then l.target_shares_contacts else l.requester_shares_contacts end)
    and p.shared
    and public.can(_company_id, 'events.view')
  order by c.name, p.name;
$function$$repairfn$;
exception when others then raise notice 'Funkcia linked_partners: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.linked_with(_a uuid, _b uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.company_links l
    where l.status = 'accepted' and ((l.requester = _a and l.target = _b) or (l.requester = _b and l.target = _a))
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia linked_with: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.maintain_label_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.case_id is null or new.case_id is distinct from old.case_id then
    new.label_role := null;
  end if;
  if new.label_role = 'main' and old.label_role is distinct from 'main' then
    update public.equipment set label_role = null
    where case_id = new.case_id and label_role = 'main' and id <> new.id;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia maintain_label_role: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.member_joined_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.apply_personal_profile(new.user_id);
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia member_joined_profile: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.my_demo_company()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select id from public.companies where demo_owner = auth.uid()
$function$$repairfn$;
exception when others then raise notice 'Funkcia my_demo_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.my_link_code(_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _code text;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kód vidí len admin' using errcode = 'insufficient_privilege';
  end if;
  insert into public.company_link_codes (company_id) values (_company_id) on conflict do nothing;
  select code into _code from public.company_link_codes where company_id = _company_id;
  return _code;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia my_link_code: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.my_permissions(_company_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(d.permission order by d.permission), '{}')
  from public.permission_defaults() d
  where public.can(_company_id, d.permission);
$function$$repairfn$;
exception when others then raise notice 'Funkcia my_permissions: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.my_responsibility_tasks(_company_id uuid)
 RETURNS TABLE(responsibility_id uuid, name text, task text, due_count integer, items text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.responsibility_id, d.name, d.task, d.due_count, d.items
  from public.responsibility_due(_company_id) d
  where public.is_company_member(_company_id) and auth.uid() = any (d.member_ids);
$function$$repairfn$;
exception when others then raise notice 'Funkcia my_responsibility_tasks: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.my_staff_card(_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _card uuid;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom tejto firmy' using errcode = 'insufficient_privilege';
  end if;
  select id into _card from public.staff where company_id = _company_id and member_id = auth.uid();
  if _card is null then
    insert into public.staff (company_id, member_id, name) values (_company_id, auth.uid(), '') returning id into _card;
  end if;
  return _card;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia my_staff_card: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.normalize_unit_ids()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not new.track_units then
    new.unit_ids := '{}';
  elsif cardinality(new.unit_ids) > 0 then
    new.unit_ids := array(select distinct u from unnest(new.unit_ids) u order by u);
    if exists (select 1 from unnest(new.unit_ids) u where u is null or u < 1 or u > 100000) then
      raise exception 'Čísla kusov musia byť od 1 do 100000' using errcode = 'check_violation';
    end if;
    new.quantity := cardinality(new.unit_ids);
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia normalize_unit_ids: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notification_send_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _url text;
  _secret text;
begin
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _url using 'push_function_url';
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _secret using 'push_webhook_secret';
    if coalesce(_url, '') = '' or coalesce(_secret, '') = '' then return new; end if;
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using _url, jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', _secret), jsonb_build_object('record', to_jsonb(new));
  exception when others then
    -- Chýba Vault alebo pg_net: upozornenie ostane v appke, len nepríde na mobil.
    return new;
  end;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notification_send_push: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notify_company_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.notifications (user_id, title, body, url)
  select d.user_id, left('Žiadosť o novú firmu: ' || new.company_name, 120), left(new.note, 300), '/settings?tab=developer'
  from public.app_developers d where d.user_id <> new.user_id;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notify_company_request: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notify_crew_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
begin
  if new.member_id is null then return new; end if;
  select name, starts_on, ends_on, venue into e from public.events where id = new.event_id;
  if not found then return new; end if;
  perform public.notify_user(
    new.member_id, new.company_id,
    'Si v posádke: ' || e.name,
    concat_ws(' · ',
      to_char(e.starts_on, 'FMDD. FMMM. YYYY') || case when e.ends_on > e.starts_on then ' – ' || to_char(e.ends_on, 'FMDD. FMMM. YYYY') else '' end,
      nullif(e.venue, ''),
      nullif(new.role, '')),
    '/events/' || new.event_id
  );
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notify_crew_added: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notify_crew_declined()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  _who text;
begin
  if new.response <> 'no' or old.response = 'no' then return new; end if;
  select name, created_by into e from public.events where id = new.event_id;
  if e.created_by is null then return new; end if;
  select coalesce(nullif(full_name, ''), 'Niekto') into _who from public.profiles where id = new.member_id;
  perform public.notify_user(e.created_by, new.company_id, coalesce(_who, 'Niekto') || ' nemôže: ' || e.name, nullif(new.response_note, ''), '/events/' || new.event_id);
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notify_crew_declined: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notify_event_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _member uuid;
  _title text;
  _body text;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    _title := 'Zrušené: ' || new.name;
    _body := to_char(new.starts_on, 'FMDD. FMMM. YYYY');
  elsif new.starts_on <> old.starts_on or new.ends_on <> old.ends_on or new.venue <> old.venue then
    _title := 'Zmena: ' || new.name;
    _body := concat_ws(' · ',
      to_char(new.starts_on, 'FMDD. FMMM. YYYY') || case when new.ends_on > new.starts_on then ' – ' || to_char(new.ends_on, 'FMDD. FMMM. YYYY') else '' end,
      nullif(new.venue, ''));
  else
    return new;
  end if;
  for _member in select distinct c.member_id from public.event_crew c where c.event_id = new.id and c.member_id is not null and c.response <> 'no' loop
    perform public.notify_user(_member, new.company_id, _title, _body, '/events/' || new.id);
  end loop;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notify_event_changed: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notify_task_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  assignee uuid;
  previous uuid[] := case when tg_op = 'UPDATE' then coalesce(old.assignee_ids, '{}') || coalesce(array[old.assignee_id], '{}') else '{}' end;
begin
  for assignee in select distinct unnest(coalesce(new.assignee_ids, '{}') || coalesce(array[new.assignee_id], '{}')) loop
    if assignee is null or assignee = any (previous) then continue; end if;
    perform public.notify_user(
      assignee, new.company_id,
      'Nová úloha: ' || new.title,
      case when new.due_on is not null then 'Termín ' || to_char(new.due_on, 'FMDD. FMMM. YYYY') else '' end,
      '/todos'
    );
  end loop;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notify_task_assigned: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _company_id uuid, _title text, _body text, _url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if _user_id is null or _user_id = auth.uid() then return; end if;
  insert into public.notifications (user_id, company_id, title, body, url)
  values (_user_id, _company_id, left(_title, 120), left(coalesce(_body, ''), 300), left(coalesce(_url, ''), 300));
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia notify_user: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.owns_equipment(_equipment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.equipment e
    join public.staff s on s.id = e.owner_staff_id and s.company_id = e.company_id
    where e.id = _equipment_id and s.member_id = auth.uid()
  )
$function$$repairfn$;
exception when others then raise notice 'Funkcia owns_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.pending_company_requests()
 RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, company_name text, note text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select r.id, r.user_id, coalesce(p.full_name, ''), coalesce(u.email, ''), r.company_name, r.note, r.created_at
  from public.company_requests r
  left join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  where public.is_developer() and r.status = 'pending'
  order by r.created_at;
$function$$repairfn$;
exception when others then raise notice 'Funkcia pending_company_requests: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.permission_defaults()
 RETURNS TABLE(permission text, roles app_role[])
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('cases.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('cases.edit', array['skladnik', 'technik']::public.app_role[]),
    ('cases.delete', array['skladnik']::public.app_role[]),
    ('cases.check', array['skladnik', 'technik']::public.app_role[]),
    ('orders.view', array['skladnik']::public.app_role[]),
    ('orders.edit', array['skladnik']::public.app_role[]),
    ('orders.delete', array[]::public.app_role[]),
    ('vehicles.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('vehicles.log', array['skladnik', 'technik']::public.app_role[]),
    ('vehicles.edit', array['skladnik']::public.app_role[]),
    ('vehicles.delete', array[]::public.app_role[]),
    ('loans.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('loans.edit', array['skladnik', 'technik']::public.app_role[]),
    ('loans.delete', array['skladnik']::public.app_role[]),
    ('events.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('events.edit', array['skladnik', 'technik']::public.app_role[]),
    ('events.delete', array['skladnik']::public.app_role[]),
    ('service.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('service.edit', array['skladnik', 'technik']::public.app_role[]),
    ('service.delete', array['skladnik']::public.app_role[]),
    ('tasks.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('tasks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('tasks.delete', array['skladnik']::public.app_role[]),
    ('shopping.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('shopping.edit', array['skladnik', 'technik']::public.app_role[]),
    ('shopping.delete', array['skladnik']::public.app_role[]),
    ('suggestions.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.add', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.manage', array['skladnik']::public.app_role[]),
    ('suggestions.delete', array[]::public.app_role[]),
    ('payouts.view_all', array[]::public.app_role[]),
    ('payouts.manage', array[]::public.app_role[]),
    ('audit.view', array[]::public.app_role[]),
    ('staff.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('staff.manage', array['skladnik']::public.app_role[]),
    ('report.view', array['skladnik', 'technik']::public.app_role[]),
    ('report.money', array[]::public.app_role[]),
    ('offers.view', array['skladnik']::public.app_role[]),
    ('offers.edit', array['skladnik']::public.app_role[]),
    ('offers.delete', array[]::public.app_role[])
$function$$repairfn$;
exception when others then raise notice 'Funkcia permission_defaults: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.personal_profile_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.apply_personal_profile(new.user_id);
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia personal_profile_changed: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.role = 'admin'
    and (tg_op = 'DELETE' or new.role <> 'admin')
    -- pri mazaní celej firmy (cascade) už rodič neexistuje a kontrola sa preskočí
    and exists (select 1 from public.companies c where c.id = old.company_id)
    and not exists (
      select 1 from public.company_members m
      where m.company_id = old.company_id and m.role = 'admin' and m.user_id <> old.user_id
    )
  then
    raise exception 'Firma musí mať aspoň jedného admina' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia prevent_last_admin_removal: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.purge_bin(_company_id uuid, _mode text, _kind text DEFAULT NULL::text, _id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(bucket text, path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _before timestamptz := case when _mode = 'expired' then now() - interval '30 days' else 'infinity'::timestamptz end;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže vyprázdniť iba admin' using errcode = 'insufficient_privilege';
  end if;
  if _mode not in ('expired', 'all', 'one') or (_mode = 'one' and (_kind is null or _id is null)) then
    raise exception 'Neplatná požiadavka' using errcode = 'check_violation';
  end if;

  create temporary table if not exists _purged_files (bucket text, path text) on commit drop;
  delete from _purged_files;

  -- Technika: s ňou zanikne jej fotka aj prílohy naviazaných záznamov riešia kaskády.
  with gone as (
    delete from public.equipment e
    where e.company_id = _company_id and e.deleted_at is not null and e.deleted_at < _before
      and (_mode <> 'one' or (_kind in ('equipment', 'consumable') and e.id = _id))
    returning e.photo_path
  )
  insert into _purged_files select 'equipment-photos', g.photo_path from gone g where g.photo_path <> '';

  with gone as (
    delete from public.cases c
    where c.company_id = _company_id and c.deleted_at is not null and c.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'case' and c.id = _id))
    returning c.label_photo_path, c.photo_path
  )
  insert into _purged_files
  select 'equipment-photos', p from gone g, unnest(array[g.label_photo_path, g.photo_path]) p where p <> '';

  with gone as (
    delete from public.event_documents d
    where d.company_id = _company_id and d.deleted_at is not null and d.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'event_document' and d.id = _id))
    returning d.path
  )
  insert into _purged_files select 'event-documents', g.path from gone g;

  with gone as (
    delete from public.attachments a
    where a.company_id = _company_id and a.deleted_at is not null and a.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'attachment' and a.id = _id))
    returning a.path
  )
  insert into _purged_files select 'attachments', g.path from gone g;

  with gone as (
    delete from public.trashed_photos p
    where p.company_id = _company_id and p.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'photo' and p.id = _id))
    returning p.path
  )
  insert into _purged_files select 'equipment-photos', g.path from gone g;

  return query select f.bucket, f.path from _purged_files f;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia purge_bin: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.push_setup_status()
 RETURNS TABLE(has_pg_net boolean, has_url boolean, has_secret boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _url boolean := false;
  _secret boolean := false;
begin
  begin
    execute 'select exists (select 1 from vault.decrypted_secrets where name = $1 and decrypted_secret <> '''')' into _url using 'push_function_url';
    execute 'select exists (select 1 from vault.decrypted_secrets where name = $1 and decrypted_secret <> '''')' into _secret using 'push_webhook_secret';
  exception when others then
    null;
  end;
  return query select exists (select 1 from pg_extension where extname = 'pg_net'), _url, _secret;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia push_setup_status: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.recycle_bin_items(_company_id uuid)
 RETURNS TABLE(kind text, id uuid, label text, detail text, deleted_at timestamp with time zone, deleted_by_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name,
      case when d.is_photo then 'fotka eventu: ' else 'dokument eventu: ' end || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla'
        when 'orders' then 'fotka nákupu' when 'case_photo' then 'fotka case'
        when 'shopping_items' then 'fotka položky na nákup' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia recycle_bin_items: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.remind_meetings_and_loans()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m record;
  l record;
  _member uuid;
  _count integer := 0;
begin
  for m in
    select em.id, em.company_id, em.event_id, em.meet_at, em.address, e.name
    from public.event_meetings em join public.events e on e.id = em.event_id
    where em.reminded_at is null and em.meet_at between now() + interval '15 minutes' and now() + interval '75 minutes' and e.status <> 'cancelled'
  loop
    for _member in select distinct c.member_id from public.event_crew c where c.event_id = m.event_id and c.member_id is not null and c.response <> 'no' loop
      -- Pripomienky plánovača idú aj tomu, kto stretávku zadal (notify_user by vynechal „seba“).
      insert into public.notifications (user_id, company_id, title, body, url)
      values (_member, m.company_id, left('Stretávka o ' || to_char(m.meet_at at time zone 'Europe/Bratislava', 'HH24:MI') || ': ' || m.name, 120), left(m.address, 300), '/events/' || m.event_id);
      _count := _count + 1;
    end loop;
    update public.event_meetings set reminded_at = now() where id = m.id;
  end loop;

  for l in
    select id, company_id, borrower, ends_on, created_by from public.loans
    where status = 'issued' and ends_on < current_date and created_by is not null
      and (overdue_notified_on is null or overdue_notified_on <= current_date - 7)
  loop
    insert into public.notifications (user_id, company_id, title, body, url)
    values (l.created_by, l.company_id, left('Výpožička po termíne: ' || l.borrower, 120), 'Mala sa vrátiť ' || to_char(l.ends_on, 'FMDD. FMMM. YYYY'), '/loans/' || l.id);
    update public.loans set overdue_notified_on = current_date where id = l.id;
    _count := _count + 1;
  end loop;
  return _count;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia remind_meetings_and_loans: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.remind_responsibilities()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d record;
  _member uuid;
  _company uuid;
  _count integer := 0;
begin
  for _company in select distinct company_id from public.responsibilities loop
    for d in select * from public.responsibility_due(_company) loop
      foreach _member in array d.member_ids loop
        continue when not exists (select 1 from public.company_members m where m.company_id = _company and m.user_id = _member);
        continue when exists (
          select 1 from public.responsibility_reminders x
          where x.responsibility_id = d.responsibility_id and x.member_id = _member and x.task = d.task and x.reminded_on > current_date - 7
        );
        insert into public.notifications (user_id, company_id, title, body, url)
        values (
          _member, _company,
          left(case d.task when 'hours' then 'Odčítať prevádzkové hodiny: ' else 'Skontrolovať case: ' end || d.name, 120),
          left(d.due_count || ' ks – ' || array_to_string(d.items, ', '), 300),
          case d.task when 'hours' then '/equipment' else '/cases' end
        );
        insert into public.responsibility_reminders (responsibility_id, member_id, task, reminded_on)
        values (d.responsibility_id, _member, d.task, current_date)
        on conflict (responsibility_id, member_id, task) do update set reminded_on = excluded.reminded_on;
        _count := _count + 1;
      end loop;
    end loop;
  end loop;
  return _count;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia remind_responsibilities: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.request_company_link(_company_id uuid, _code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _target uuid;
  _name text;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Prepojiť firmu môže len admin' using errcode = 'insufficient_privilege';
  end if;
  select c.company_id into _target from public.company_link_codes c where c.code = upper(trim(_code));
  if _target is null then
    raise exception 'Firma s týmto kódom neexistuje' using errcode = 'no_data_found';
  end if;
  if _target = _company_id then
    raise exception 'To je kód vašej firmy' using errcode = 'check_violation';
  end if;
  insert into public.company_links (requester, target) values (_company_id, _target) on conflict do nothing;
  select name into _name from public.companies where id = _target;
  return _name;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia request_company_link: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.reset_demo_company()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.delete_demo_company();
  return public.create_demo_company();
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia reset_demo_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.respond_shared_offer(_token uuid, _accept boolean, _note text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q public.quotes%rowtype;
begin
  select * into q from public.quotes where _token is not null and share_token = _token;
  if not found then
    raise exception 'Ponuka sa nenašla' using errcode = 'no_data_found';
  end if;
  if q.responded_at is not null then
    raise exception 'Na ponuku už bolo odpovedané' using errcode = 'check_violation';
  end if;
  update public.quotes
    set status = case when _accept then 'accepted' else 'rejected' end, responded_at = now(), response_note = left(coalesce(_note, ''), 1000)
    where id = q.id;
  if q.created_by is not null then
    insert into public.notifications (user_id, company_id, title, body, url)
    values (
      q.created_by, q.company_id,
      left((case when _accept then 'Ponuka prijatá: ' else 'Ponuka odmietnutá: ' end) || coalesce(nullif(q.title, ''), q.number), 120),
      left(concat_ws(' · ', nullif(q.client ->> 'name', ''), nullif(_note, '')), 300),
      '/offers/' || q.id
    );
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia respond_shared_offer: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.responsibility_due(_company_id uuid)
 RETURNS TABLE(responsibility_id uuid, name text, task text, due_count integer, items text[], member_ids uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with r as (
    select * from public.responsibilities where company_id = _company_id
  ),
  scope_equipment as (
    select r.id as rid, e.id, e.name, e.case_id
    from r join public.equipment e on e.company_id = r.company_id
    where e.deleted_at is null and e.status <> 'retired' and (e.kind = any (r.kinds) or e.case_id = any (r.case_ids))
  ),
  hours as (
    select se.rid, se.name, (select max(h.read_on) from public.equipment_hour_readings h where h.equipment_id = se.id) as last_read
    from scope_equipment se
    join public.equipment e on e.id = se.id
    where coalesce(e.attributes ->> 'trackHours', '') = 'true'
  ),
  scope_cases as (
    select distinct r.id as rid, c.id, c.name
    from r join public.cases c on c.company_id = r.company_id
    where c.deleted_at is null
      and (c.id = any (r.case_ids) or exists (select 1 from scope_equipment se where se.rid = r.id and se.case_id = c.id))
  ),
  checks as (
    select sc.rid, sc.name, (select max(k.checked_at) from public.case_checks k where k.case_id = sc.id) as last_check
    from scope_cases sc
  )
  select r.id, r.name, 'hours', count(*)::integer, (array_agg(h.name order by h.last_read nulls first))[1:10], r.member_ids
  from r join hours h on h.rid = r.id
  where r.hours_every_days is not null and (h.last_read is null or h.last_read < current_date - r.hours_every_days)
  group by r.id, r.name, r.member_ids
  union all
  select r.id, r.name, 'check', count(*)::integer, (array_agg(k.name order by k.last_check nulls first))[1:10], r.member_ids
  from r join checks k on k.rid = r.id
  where r.check_every_days is not null and (k.last_check is null or k.last_check < now() - make_interval(days => r.check_every_days))
  group by r.id, r.name, r.member_ids;
$function$$repairfn$;
exception when others then raise notice 'Funkcia responsibility_due: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _photo public.trashed_photos;
  _restored integer;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Z koša môže obnovovať iba admin' using errcode = 'insufficient_privilege';
  end if;

  if _kind in ('equipment', 'consumable') then
    update public.equipment set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'case' then
    update public.cases set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
    get diagnostics _restored = row_count;
    -- Obsah sa vráti, pokiaľ ho medzitým niekto nedal do iného case.
    update public.equipment e set case_id = _id
    from public.cases c
    where c.id = _id and _restored = 1 and e.id = any (c.trashed_content) and e.case_id is null and e.company_id = _company_id;
    update public.cases set trashed_content = '{}' where id = _id and _restored = 1;
    if _restored = 0 then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    return;
  elsif _kind = 'event_document' then
    update public.event_documents set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'attachment' then
    update public.attachments set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'photo' then
    select * into _photo from public.trashed_photos where id = _id and company_id = _company_id;
    if not found then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    -- Fotka sa vráti len na prázdne miesto; novšiu fotku neprepíše.
    if _photo.owner_table = 'equipment' then
      update public.equipment set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'vehicles' then
      update public.vehicles set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'orders' then
      update public.orders set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'case_photo' then
      update public.cases set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'shopping_items' then
      update public.shopping_items set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    else
      update public.cases set label_photo_path = _photo.path where id = _photo.owner_id and label_photo_path = '';
    end if;
    if not found then
      raise exception 'Fotku nemožno obnoviť: záznam už má inú fotku alebo neexistuje' using errcode = 'check_violation';
    end if;
    delete from public.trashed_photos where id = _id;
    return;
  else
    raise exception 'Neznámy druh položky' using errcode = 'check_violation';
  end if;

  if not found then
    raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia restore_bin_item: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.return_loan(_loan_id uuid, _damaged jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _loan public.loans;
  _row record;
  _units integer[];
  _count integer;
  _any boolean := false;
begin
  update public.loans set status = 'returned', returned_at = now()
  where id = _loan_id and status = 'issued'
  returning * into _loan;
  if not found then
    raise exception 'Výpožičku nemožno vrátiť' using errcode = 'check_violation';
  end if;

  update public.loan_items set damaged = false, damaged_units = '{}', damaged_quantity = 0 where loan_id = _loan_id;

  update public.equipment e set status = 'available'
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id and e.status = 'loaned';

  for _row in
    select li.equipment_id, li.quantity, li.unit_numbers, d.value as entry
    from jsonb_array_elements(case when jsonb_typeof(_damaged) = 'array' then _damaged else '[]'::jsonb end) d
    join public.loan_items li on li.loan_id = _loan_id and li.equipment_id = (d.value ->> 'equipment_id')::uuid
  loop
    if cardinality(_row.unit_numbers) > 0 then
      _units := '{}';
      if jsonb_typeof(_row.entry -> 'units') = 'array' then
        _units := array(
          select distinct u::integer from jsonb_array_elements_text(_row.entry -> 'units') u
          where u::integer = any (_row.unit_numbers) order by 1
        );
      end if;
      _count := cardinality(_units);
    else
      _units := '{}';
      _count := least(greatest(coalesce((_row.entry ->> 'quantity')::integer, _row.quantity), 0), _row.quantity);
    end if;
    continue when _count = 0;

    update public.loan_items set damaged = true, damaged_units = _units, damaged_quantity = _count
    where loan_id = _loan_id and equipment_id = _row.equipment_id;
    _any := true;

    -- Kusy, ktoré už v servise sú, nový záznam nedostanú.
    begin
      insert into public.service_records (company_id, equipment_id, kind, status, problem, unit_numbers, quantity)
      values (
        _loan.company_id, _row.equipment_id, 'repair', 'open',
        left('Vrátené poškodené z výpožičky: ' || _loan.borrower, 2000), _units, _count
      );
    exception when check_violation then
      null;
    end;
  end loop;

  if _any then
    update public.loans set status = 'damaged' where id = _loan_id;
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia return_loan: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.seed_demo_company(_company uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _light uuid;
  _audio uuid;
  _cables uuid;
  _stage uuid;
  _store uuid;
  _van uuid;
  _case_audio uuid;
  _case_light uuid;
  _case_cables uuid;
  _mixer uuid;
  _sharpy uuid;
  _par uuid;
  _speaker uuid;
  _sub uuid;
  _mic uuid;
  _di uuid;
  _xlr10 uuid;
  _xlr5 uuid;
  _dmx uuid;
  _deck uuid;
  _event_next uuid;
  _event_past uuid;
  _loan uuid;
begin
  insert into public.equipment_categories (company_id, name) values (_company, 'Svetlá') returning id into _light;
  insert into public.equipment_categories (company_id, name) values (_company, 'Zvuk') returning id into _audio;
  insert into public.equipment_categories (company_id, name) values (_company, 'Káble') returning id into _cables;
  insert into public.equipment_categories (company_id, name) values (_company, 'Pódium') returning id into _stage;
  insert into public.locations (company_id, name) values (_company, 'Sklad – regál A') returning id into _store;
  insert into public.locations (company_id, name) values (_company, 'Dodávka') returning id into _van;

  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Audio case 1', 'C-01', _store) returning id into _case_audio;
  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Sharpy case', 'C-02', _store) returning id into _case_light;
  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Káble XLR', 'C-03', _store) returning id into _case_cables;

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, ip_address, attributes)
  values (_company, 'Mixpult X32 Rack', 'audio', _audio, _case_audio, 1, 'Behringer', 'X32 Rack', 60, '192.168.1.10', '{"audioType": "mixer"}')
  returning id into _mixer;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, ip_address, attributes)
  values (_company, 'Stagebox S16', 'audio', _audio, _case_audio, 1, 'Behringer', 'S16', 25, '192.168.1.11', '{"audioType": "stagebox"}');
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'DI box', 'audio', _audio, _case_audio, 4, 'Palmer', 'PAN 01', 3, '{"audioType": "di"}') returning id into _di;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'Mikrofón SM58', 'audio', _audio, _case_audio, 6, 'Shure', 'SM58', 4, '{"audioType": "microphone"}') returning id into _mic;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes, track_units)
  values (_company, 'Reprobox K12.2', 'audio', _audio, _store, 4, 'QSC', 'K12.2', 35, '{"audioType": "speaker", "powerW": 2000}', true)
  returning id into _speaker;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes, track_units)
  values (_company, 'Subwoofer KS118', 'audio', _audio, _store, 2, 'QSC', 'KS118', 45, '{"audioType": "subwoofer", "powerW": 3600}', true)
  returning id into _sub;

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, track_units, attributes)
  values (_company, 'Sharpy', 'light', _light, _case_light, 4, 'Clay Paky', 'Sharpy', 40, true,
    '{"powerW": 350, "lightSource": "discharge", "dmxModes": [{"name": "Standard", "channels": 16}, {"name": "Vector", "channels": 24}]}')
  returning id into _sharpy;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, track_units, attributes)
  values (_company, 'LED Par 18x10W', 'light', _light, _store, 12, 'Stairville', 'LED Par 18x10', 8, true,
    '{"powerW": 180, "lightSource": "led", "dmxModes": [{"name": "Basic", "channels": 3}, {"name": "Full", "channels": 8}]}')
  returning id into _par;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'Hazer', 'light', _light, _store, 1, 'Smoke Factory', 'Tour-Hazer II', 30, '{"powerW": 1500}');

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, rental_price, attributes)
  values (_company, 'XLR kábel 10 m', 'cable', _cables, _case_cables, 12, 1, '{"connector": "XLR", "lengthM": 10}') returning id into _xlr10;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, rental_price, attributes)
  values (_company, 'XLR kábel 5 m', 'cable', _cables, _case_cables, 10, 1, '{"connector": "XLR", "lengthM": 5}') returning id into _xlr5;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, rental_price, attributes)
  values (_company, 'DMX kábel 10 m', 'cable', _cables, _store, 8, 1, '{"connector": "DMX 3-pin", "lengthM": 10}') returning id into _dmx;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price)
  values (_company, 'Pódiová doska 2×1 m', 'general', _stage, _store, 24, 'Nivtec', 'Deck 2x1', 15) returning id into _deck;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, rental_price)
  values (_company, 'Noha pódia 60 cm', 'general', _stage, _store, 96, 'Nivtec', 1);

  insert into public.case_checks (company_id, case_id, checked_at, checked_by_name, note)
  values (_company, _case_audio, now() - interval '40 days', 'Demo', 'Všetko na mieste');

  insert into public.events (company_id, name, client, venue, starts_on, ends_on, status, organizer, organizer_phone, description, get_in_time, show_time, show_end_time)
  values (_company, 'Letný festival', 'Mesto Ukážkovo', 'Amfiteáter Ukážkovo', current_date + 10, current_date + 11, 'confirmed',
    'Mesto Ukážkovo', '+421 900 000 000', 'Open air, dve kapely a DJ. Prípojka 32 A pri pódiu.', '12:00', '18:00', '23:30')
  returning id into _event_next;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity, case_id) values
    (_company, _event_next, _mixer, 1, _case_audio),
    (_company, _event_next, _di, 4, _case_audio),
    (_company, _event_next, _mic, 6, _case_audio);
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values
    (_company, _event_next, _speaker, 4),
    (_company, _event_next, _sub, 2),
    (_company, _event_next, _par, 8);
  insert into public.event_crew (company_id, event_id, name, role) values
    (_company, _event_next, 'Peter Zvukár', 'FOH'),
    (_company, _event_next, 'Jana Svetlárka', 'Svetlá');

  insert into public.events (company_id, name, venue, starts_on, ends_on, status)
  values (_company, 'Firemný večierok', 'Hotel Demo', current_date - 20, current_date - 20, 'done')
  returning id into _event_past;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity, case_id) values
    (_company, _event_past, _mixer, 1, _case_audio),
    (_company, _event_past, _di, 4, _case_audio),
    (_company, _event_past, _mic, 6, _case_audio);

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, status, note)
  values (_company, 'Kapela Ukážka', '+421 911 111 111', current_date + 3, current_date + 5, 'reserved', 'Skúška v klube')
  returning id into _loan;
  insert into public.loan_items (company_id, loan_id, equipment_id, quantity, unit_price) values
    (_company, _loan, _xlr5, 6, 1),
    (_company, _loan, _dmx, 2, 1);

  insert into public.vehicles (company_id, plate, model, status, odometer_km, stk_until, vignette_until)
  values (_company, 'DEMO 001', 'Ford Transit', 'active', 182000, current_date + 25, current_date + 120);

  insert into public.tasks (company_id, title, priority, due_on) values
    (_company, 'Skontrolovať káble XLR po festivale', 'normal', current_date + 12),
    (_company, 'Objednať náhradné lampy do Sharpy', 'high', current_date + 5);
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia seed_demo_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.seed_demo_extras(_company uuid, _owner uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _peter uuid;
  _jana uuid;
  _marek uuid;
  _mixer uuid;
  _sharpy uuid;
  _sub uuid;
  _event_next uuid;
  _event_past uuid;
  _garage uuid;
  _av uuid;
begin
  -- Farby kategórií
  update public.equipment_categories set color = case name when 'Svetlá' then 'green' when 'Zvuk' then 'pink' when 'Pódium' then 'yellow' when 'Káble' then 'blue' end
  where company_id = _company;

  select id into _mixer from public.equipment where company_id = _company and name = 'Mixpult X32 Rack';
  select id into _sharpy from public.equipment where company_id = _company and name = 'Sharpy';
  select id into _sub from public.equipment where company_id = _company and name = 'Subwoofer KS118';
  select id into _event_next from public.events where company_id = _company and name = 'Letný festival';
  select id into _event_past from public.events where company_id = _company and name = 'Firemný večierok';

  update public.equipment set attributes = attributes || '{"ipPrefix": 24}' where id = _mixer;
  update public.equipment set attributes = attributes || '{"boxWidthCm": 56, "boxDepthCm": 70, "boxHeightCm": 60, "subDelayMs": 0}' where id = _sub;

  -- Zamestnanci (brigádnici bez účtu)
  insert into public.staff (company_id, name, position, phone, email, skills, birth_date, licences)
  values (_company, 'Peter Zvukár', 'Zvukár', '+421 900 111 222', 'peter@demo.sk', 'X32, dLive, Smaart', (current_date + 1) - interval '31 years', '{B}')
  returning id into _peter;
  insert into public.staff (company_id, name, position, phone, email, skills, name_day, licences)
  values (_company, 'Jana Svetlárka', 'Osvetľovačka', '+421 900 333 444', 'jana@demo.sk', 'GrandMA3, Avolites', to_char(current_date, 'MM-DD'), '{B}')
  returning id into _jana;
  insert into public.staff (company_id, name, position, phone, skills, licences)
  values (_company, 'Marek Stagehand', 'Stagehand, vodič', '+421 900 555 666', 'Práca vo výškach, Nivtec', '{B,C,CE}')
  returning id into _marek;
  insert into public.staff (company_id, name, position, phone, licences)
  values (_company, 'Lucia Produkčná', 'Produkcia', '+421 900 777 888', '{B}');
  insert into public.staff_unavailability (company_id, staff_id, starts_on, ends_on, note)
  values (_company, _marek, current_date + 9, current_date + 12, 'Dovolenka');

  -- Karta majiteľa dema (založí ju trigger pri pridaní do firmy)
  update public.staff set position = 'Majiteľ, technik', phone = '+421 900 000 001', onboarded = true, licences = '{B}'
  where company_id = _company and member_id = _owner;

  -- Zariadenia majiteľa; tablet má výnimku, aby nesvietilo červené upozornenie
  insert into public.member_devices (company_id, user_id, kind, name, mac, networks) values
    (_company, _owner, 'phone', 'Môj mobil', 'A4:83:E7:00:00:01', '[{"ssid": "DEMO-FOH", "ip": "", "mac": "DA:A1:19:00:00:01", "dhcp": true}]'),
    (_company, _owner, 'laptop', 'Notebook (FOH)', 'A4:83:E7:00:00:02', '[{"ssid": "DEMO-FOH", "ip": "192.168.1.50", "mac": ""}]');
  insert into public.device_exemptions (company_id, user_id, kind) values (_company, _owner, 'tablet');

  -- Wi-Fi siete
  insert into public.wifi_networks (company_id, ssid, password, security, subnet, router_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note)
  values (_company, 'DEMO-FOH', 'demo-heslo-123', 'WPA', '192.168.1.0/24', '192.168.1.1', 'Ubiquiti UniFi U6 Lite', true, '192.168.1.100', '192.168.1.199', _mixer, 'FOH rack',
    'Router k mixu X32; tablet na mix cez Wi-Fi.');
  insert into public.wifi_networks (company_id, ssid, password, security, subnet, router_ip, router_model, dhcp, place)
  values (_company, 'DEMO-Kancelária', 'kancelaria-2026', 'WPA', '10.0.0.0/24', '10.0.0.1', 'TP-Link Archer AX55', true, 'Sklad / kancelária');

  -- Servisní technici a servis
  insert into public.service_technicians (company_id, name, firm, phone, email, address, scope, specialization)
  values (_company, 'Tomáš Opravár', 'AV Servis Košice', '+421 905 123 456', 'servis@avservis.demo', 'Košice', 'equipment', 'Clay Paky, Robe, Behringer')
  returning id into _av;
  insert into public.service_technicians (company_id, name, firm, phone, address, scope, specialization)
  values (_company, 'Ján Mechanik', 'Autoservis Stropkov', '+421 905 654 321', 'Stropkov', 'vehicles', 'Ford Transit, pneuservis')
  returning id into _garage;
  update public.vehicles set technician_id = _garage where company_id = _company;
  insert into public.service_records (company_id, equipment_id, kind, status, problem, technician, technician_id, unit_numbers)
  values (_company, _sharpy, 'repair', 'in_progress', 'Kus #2 nesvieti – asi lampa.', 'Tomáš Opravár', _av, '{2}');

  -- Posádka: majiteľ na festivale (čaká na potvrdenie)
  insert into public.event_crew (company_id, event_id, member_id, role) values (_company, _event_next, _owner, 'Produkcia');

  -- Odmeny majiteľa a príjem z minulej akcie
  insert into public.member_payments (company_id, member_id, amount, kind, happened_on, event_id, note, paid_at)
  values (_company, _owner, 120, 'reward', current_date - 20, _event_past, 'Firemný večierok', now() - interval '15 days');
  insert into public.member_payments (company_id, member_id, amount, kind, happened_on, note)
  values (_company, _owner, 50, 'advance', current_date - 3, 'Záloha na festival');
  insert into public.event_payments (company_id, event_id, amount, method, vat, received_on, note, created_by_name)
  values (_company, _event_past, 900, 'invoice', 'without', current_date - 15, 'Faktúra hotelu', 'Demo');

  -- Vlastná technika zamestnanca
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, owner_staff_id, attributes)
  values (_company, 'Mikrofón Beta 58A (Petrov)', 'audio', 1, 'Shure', 'Beta 58A', _peter, '{"audioType": "microphone"}');
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia seed_demo_extras: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.set_link_sharing(_link_id uuid, _company_id uuid, _equipment boolean, _contacts boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Zdieľanie nastavuje admin' using errcode = 'insufficient_privilege';
  end if;
  update public.company_links set
    requester_shares_equipment = case when requester = _company_id then _equipment else requester_shares_equipment end,
    requester_shares_contacts = case when requester = _company_id then _contacts else requester_shares_contacts end,
    target_shares_equipment = case when target = _company_id then _equipment else target_shares_equipment end,
    target_shares_contacts = case when target = _company_id then _contacts else target_shares_contacts end
  where id = _link_id and (requester = _company_id or target = _company_id);
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia set_link_sharing: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.set_partner_part(_event_id uuid, _company_id uuid, _part text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.can(_company_id, 'events.edit') then
    raise exception 'Nemáte oprávnenie upravovať eventy' using errcode = 'insufficient_privilege';
  end if;
  update public.event_shares set partner_part = left(coalesce(_part, ''), 1000)
  where event_id = _event_id and partner_company = _company_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia set_partner_part: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.share_offer(_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _company uuid;
  _token uuid;
begin
  select company_id, share_token into _company, _token from public.quotes where id = _id;
  if _company is null or not public.can(_company, 'offers.edit') then
    raise exception 'Ponuka neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _token is null then
    _token := gen_random_uuid();
    update public.quotes set share_token = _token, status = case when status = 'draft' then 'sent' else status end where id = _id;
  end if;
  return _token;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia share_offer: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.share_own_equipment(_equipment_id uuid, _company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.equipment%rowtype;
  _card uuid;
  _copy uuid;
begin
  if not public.owns_equipment(_equipment_id) then
    raise exception 'Táto technika vám nepatrí' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom tejto firmy' using errcode = 'insufficient_privilege';
  end if;
  select * into e from public.equipment where id = _equipment_id;
  if e.company_id = _company_id then return e.id; end if;
  select id into _copy from public.equipment where company_id = _company_id and shared_from = _equipment_id and deleted_at is null limit 1;
  if _copy is not null then return _copy; end if;

  select id into _card from public.staff where company_id = _company_id and member_id = auth.uid();
  if _card is null then
    insert into public.staff (company_id, member_id, name) values (_company_id, auth.uid(), '') returning id into _card;
  end if;
  insert into public.equipment (company_id, name, kind, attributes, manufacturer, model, serial_number, quantity, track_units, unit_ids, note, owner_staff_id, shared_from)
  values (_company_id, e.name, e.kind, e.attributes, e.manufacturer, e.model, e.serial_number, e.quantity, e.track_units, e.unit_ids, e.note, _card, e.id)
  returning id into _copy;
  return _copy;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia share_own_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.shared_events(_company_id uuid)
 RETURNS TABLE(event_id uuid, owner_name text, name text, starts_on date, ends_on date, venue text, address text, status text, owner_part text, partner_part text, days jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.id, c.name, e.name, e.starts_on, e.ends_on, e.venue, e.address, e.status::text, s.owner_part, s.partner_part,
    coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'kind', d.kind, 'starts_at', d.starts_at, 'ends_at', d.ends_at, 'note', d.note) order by d.day)
      from public.event_days d where d.event_id = e.id), '[]'::jsonb)
  from public.event_shares s
  join public.events e on e.id = s.event_id
  join public.companies c on c.id = s.company_id
  where s.partner_company = _company_id and public.can(_company_id, 'events.view') and public.linked_with(s.company_id, _company_id)
  order by e.starts_on desc;
$function$$repairfn$;
exception when others then raise notice 'Funkcia shared_events: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.shares_company(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.company_members mine
    join public.company_members theirs using (company_id)
    where mine.user_id = auth.uid() and theirs.user_id = _user_id
  );
$function$$repairfn$;
exception when others then raise notice 'Funkcia shares_company: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.split_equipment_into_case(_equipment_id uuid, _case_id uuid, _count integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.equipment%rowtype;
  _all integer[];
  _id uuid;
begin
  select * into e from public.equipment where id = _equipment_id and deleted_at is null;
  if e.id is null or not public.can(e.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete meniť' using errcode = 'insufficient_privilege';
  end if;
  if _count is null or _count < 1 then
    raise exception 'Počet musí byť aspoň 1' using errcode = 'check_violation';
  end if;
  if _count >= e.quantity then
    if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
      raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
    end if;
    update public.equipment set case_id = _case_id, label_role = null where id = e.id;
    return e.id;
  end if;
  if e.track_units then
    _all := case when cardinality(coalesce(e.unit_ids, '{}')) > 0 then e.unit_ids else array(select generate_series(1, e.quantity)) end;
    return public.split_equipment_units(_equipment_id, _case_id, _all[1:_count]);
  end if;
  -- Kusy bez čísel (napr. káble): len počet.
  if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
    raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
  end if;
  _id := gen_random_uuid();
  insert into public.equipment
  select (jsonb_populate_record(null::public.equipment,
    to_jsonb(e) || jsonb_build_object('id', _id, 'case_id', _case_id, 'label_role', null, 'quantity', _count, 'inventory_number', '', 'shared_from', null, 'created_at', now(), 'updated_at', now())
  )).*;
  update public.equipment set quantity = e.quantity - _count where id = e.id;
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia split_equipment_into_case: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.split_equipment_units(_equipment_id uuid, _case_id uuid, _unit_ids integer[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.equipment%rowtype;
  _id uuid;
  _all integer[];
  _picked integer[];
  _rest integer[];
begin
  select * into e from public.equipment where id = _equipment_id and deleted_at is null;
  if e.id is null or not public.can(e.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete meniť' using errcode = 'insufficient_privilege';
  end if;
  if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
    raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
  end if;
  _all := case when cardinality(coalesce(e.unit_ids, '{}')) > 0 then e.unit_ids else array(select generate_series(1, e.quantity)) end;
  _picked := array(select distinct u from unnest(coalesce(_unit_ids, '{}')) u where u = any (_all) order by u);
  if cardinality(_picked) = 0 then
    raise exception 'Vyberte aspoň jeden kus' using errcode = 'check_violation';
  end if;
  _rest := array(select u from unnest(_all) u where not (u = any (_picked)) order by u);
  if cardinality(_rest) = 0 then
    update public.equipment set case_id = _case_id, label_role = null, track_units = true, unit_ids = _all where id = e.id;
    return e.id;
  end if;

  _id := gen_random_uuid();
  insert into public.equipment
  select (jsonb_populate_record(null::public.equipment,
    to_jsonb(e) || jsonb_build_object(
      'id', _id,
      'case_id', _case_id,
      'label_role', null,
      'quantity', cardinality(_picked),
      'track_units', true,
      'inventory_number', '',
      'unit_ids', to_jsonb(_picked),
      'shared_from', null,
      'created_at', now(),
      'updated_at', now()
    ))).*;
  -- Čísla kusov priamo (jsonb_populate_record ich nie všade prevedie na pole).
  update public.equipment set track_units = true, unit_ids = _picked where id = _id;
  update public.equipment set track_units = true, unit_ids = _rest, quantity = cardinality(_rest) where id = e.id;
  return _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia split_equipment_units: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.user_id := auth.uid();
  new.started_at := now();
  new.ended_at := null;
  new.work_log_id := null;
  new.edited_by_name := '';
  new.paused_at := null;
  new.pause_kind := null;
  new.break_minutes := 0;
  new.wait_minutes := 0;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_attendance: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_author()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.created_by := auth.uid();
  new.author_name := coalesce(
    (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()),
    ''
  );
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_author: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_bug_report()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.reporter_id := auth.uid();
  new.reporter_name := public.actor_name();
  new.status := 'new';
  new.notified_at := null;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_bug_report: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_case_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.checked_at := now();
  new.checked_by := auth.uid();
  new.checked_by_name := coalesce(
    (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()),
    ''
  );
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_case_check: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_event_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.created_by_name := public.actor_name();
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_event_payment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_loan_handover()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _name text;
begin
  if new.status is distinct from old.status and (new.status = 'issued' or old.status = 'issued') then
    select coalesce(nullif(trim(p.full_name), ''), p.email, '') into _name from public.profiles p where p.id = auth.uid();
    if new.status = 'issued' then
      new.issued_by_name := coalesce(_name, '');
    else
      new.returned_by_name := coalesce(_name, '');
    end if;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_loan_handover: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_loan_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.signed_by := auth.uid();
  new.signed_at := now();
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_loan_signature: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_office_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.bought_by is null or not public.is_member_of(new.company_id, new.bought_by) then
      new.bought_by := auth.uid();
    end if;
    new.bought_by_name := coalesce(
      (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = new.bought_by), '');
    update public.office_items set quantity = quantity + new.quantity where id = new.item_id;
    return new;
  end if;
  update public.office_items set quantity = greatest(quantity - old.quantity, 0) where id = old.item_id;
  return old;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_office_purchase: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_pack_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.checked_by := auth.uid();
  new.checked_at := now();
  new.checked_by_name := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_pack_check: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_service_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.requested_by := auth.uid();
    new.requested_by_name := coalesce(
      (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
    new.created_at := now();
    new.status := 'open';
    new.resolved_at := null;
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (new.company_id, 'other', left('Žiadosť o servis: ' || new.title, 200), '/service/requests', new.requested_by_name);
  elsif new.status in ('done', 'rejected') and old.status not in ('done', 'rejected') then
    new.resolved_at := now();
  elsif new.status in ('open', 'in_progress') then
    new.resolved_at := null;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_service_request: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.done_at := case when new.status = 'done' then now() end;
    if cardinality(new.assignee_ids) > 0 then
      new.assignee_id := new.assignee_ids[1];
    elsif new.assignee_id is not null then
      new.assignee_ids := array[new.assignee_id];
    end if;
    return new;
  end if;
  if new.status = 'done' and old.status <> 'done' then
    new.done_at := now();
  elsif new.status <> 'done' then
    new.done_at := null;
  end if;
  if new.assignee_ids is distinct from old.assignee_ids then
    new.assignee_id := new.assignee_ids[1];
  elsif new.assignee_id is distinct from old.assignee_id then
    -- Staršia verzia appky mení len jedného riešiteľa.
    new.assignee_ids := case when new.assignee_id is null then '{}' else array[new.assignee_id] end;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_task: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.stamp_work_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.user_id := auth.uid();
  new.started_at := now();
  new.ended_at := null;
  new.paused_at := null;
  new.pause_kind := null;
  new.break_minutes := 0;
  new.wait_minutes := 0;
  new.edited_by_name := '';
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia stamp_work_session: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.suggest_company_profiles()
 RETURNS TABLE(name text, ico text, dic text, address text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select distinct p.name, p.ico, p.dic, p.address
  from public.partner_contacts c
  join public.partners p on p.id = c.partner_id
  where lower(c.email) = lower(public.current_email()) and public.current_email() <> ''
  limit 5;
$function$$repairfn$;
exception when others then raise notice 'Funkcia suggest_company_profiles: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.sync_own_equipment(_equipment_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.equipment%rowtype;
  _count integer;
begin
  if not public.owns_equipment(_equipment_id) then
    raise exception 'Táto technika vám nepatrí' using errcode = 'insufficient_privilege';
  end if;
  select * into e from public.equipment where id = _equipment_id;
  update public.equipment c
    set name = e.name, kind = e.kind, attributes = e.attributes, manufacturer = e.manufacturer, model = e.model,
        serial_number = e.serial_number, quantity = e.quantity, track_units = e.track_units, unit_ids = e.unit_ids, note = e.note
    where c.shared_from = _equipment_id;
  get diagnostics _count = row_count;
  return _count;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia sync_own_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.sync_profile_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_table_name = 'profiles' then
    update public.staff set name = new.full_name where member_id = new.id and name is distinct from new.full_name;
  elsif new.member_id is not null and new.member_id = auth.uid() and trim(new.name) <> '' then
    update public.profiles set full_name = new.name where id = new.member_id and full_name is distinct from new.name;
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia sync_profile_name: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia touch_updated_at: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.trash_attachment(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.attachments set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null
    and public.can(company_id, case entity_type when 'service' then 'service.edit' else 'vehicles.log' end);
  if not found then
    raise exception 'Prílohu sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia trash_attachment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.trash_case(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.cases c
  set deleted_at = now(), deleted_by_name = public.actor_name(),
      trashed_content = array(select e.id from public.equipment e where e.case_id = c.id)
  where c.id = _id and c.deleted_at is null and public.can(c.company_id, 'cases.delete');
  if not found then
    raise exception 'Case sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
  update public.equipment set case_id = null where case_id = _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia trash_case: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.trash_equipment(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.equipment set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null and public.can(company_id, 'equipment.delete');
  if not found then
    raise exception 'Techniku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia trash_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.trash_event_document(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.event_documents set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null and public.can(company_id, 'events.edit');
  if not found then
    raise exception 'Dokument sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia trash_event_document: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.trash_photo(_owner_table text, _owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _company uuid;
  _path text;
  _label text;
begin
  if _owner_table = 'equipment' then
    select company_id, photo_path, name into _company, _path, _label from public.equipment
    where id = _owner_id and deleted_at is null and public.can(company_id, 'equipment.edit');
  elsif _owner_table = 'vehicles' then
    select company_id, photo_path, plate into _company, _path, _label from public.vehicles
    where id = _owner_id and public.can(company_id, 'vehicles.edit');
  elsif _owner_table = 'cases' then
    select company_id, label_photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'orders' then
    select company_id, photo_path, supplier into _company, _path, _label from public.orders
    where id = _owner_id and public.can(company_id, 'orders.edit');
  elsif _owner_table = 'case_photo' then
    select company_id, photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'shopping_items' then
    select company_id, photo_path, name into _company, _path, _label from public.shopping_items
    where id = _owner_id and public.can(company_id, 'shopping.edit');
  end if;
  if _company is null or coalesce(_path, '') = '' then
    raise exception 'Fotku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;

  insert into public.trashed_photos (company_id, owner_table, owner_id, path, label, deleted_by_name)
  values (_company, _owner_table, _owner_id, _path, _label, public.actor_name());
  if _owner_table = 'equipment' then
    update public.equipment set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'vehicles' then
    update public.vehicles set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'orders' then
    update public.orders set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'case_photo' then
    update public.cases set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'shopping_items' then
    update public.shopping_items set photo_path = '' where id = _owner_id;
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia trash_photo: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.unit_ids_of(_quantity integer, _unit_ids integer[])
 RETURNS integer[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when cardinality(_unit_ids) > 0 then _unit_ids
    else array(select generate_series(1, greatest(_quantity, 1)))
  end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia unit_ids_of: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.unlink_order_item(_item_id uuid, _equipment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _company uuid;
  _mode text;
begin
  select i.company_id, i.mode into _company, _mode from public.order_items i where i.id = _item_id;
  if _company is null or not public.can(_company, 'orders.edit') then
    raise exception 'Na zmenu nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _mode <> 'link' then
    raise exception 'Zrušiť sa dá len prepojenie s existujúcou technikou' using errcode = 'check_violation';
  end if;
  delete from public.order_item_equipment where order_item_id = _item_id and equipment_id = _equipment_id;
  if not exists (select 1 from public.order_item_equipment where order_item_id = _item_id) then
    update public.order_items set mode = 'none' where id = _item_id;
  end if;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia unlink_order_item: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.unshare_offer(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _company uuid;
begin
  select company_id into _company from public.quotes where id = _id;
  if _company is null or not public.can(_company, 'offers.edit') then
    raise exception 'Ponuka neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  update public.quotes set share_token = null where id = _id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia unshare_offer: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.unshare_own_equipment(_copy_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.owns_equipment(_copy_id) or not exists (select 1 from public.equipment where id = _copy_id and shared_from is not null) then
    raise exception 'Odobrať sa dá len kópia vašej techniky' using errcode = 'insufficient_privilege';
  end if;
  delete from public.equipment where id = _copy_id;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia unshare_own_equipment: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.update_loan(_loan_id uuid, _loan jsonb, _items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  _company_id uuid;
begin
  update public.loans
  set
    borrower = trim(_loan ->> 'borrower'),
    contact = coalesce(trim(_loan ->> 'contact'), ''),
    starts_on = (_loan ->> 'starts_on')::date,
    ends_on = (_loan ->> 'ends_on')::date,
    note = coalesce(trim(_loan ->> 'note'), ''),
    borrower_ico = coalesce(trim(_loan ->> 'borrower_ico'), ''),
    borrower_address = coalesce(trim(_loan ->> 'borrower_address'), ''),
    billed_days = (_loan ->> 'billed_days')::integer,
    price = (_loan ->> 'price')::numeric,
    deposit = (_loan ->> 'deposit')::numeric
  where id = _loan_id and status = 'reserved'
  returning company_id into _company_id;
  if not found then
    raise exception 'Upraviť sa dá len rezervácia, ktorá ešte nebola vydaná' using errcode = 'check_violation';
  end if;

  delete from public.loan_items where loan_id = _loan_id;
  perform public.add_loan_items(_company_id, _loan_id, _items);
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia update_loan: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.write_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _row jsonb;
  _old jsonb;
  _changed text[];
  _company uuid;
begin
  if tg_op = 'DELETE' then
    _row := to_jsonb(old);
  else
    _row := to_jsonb(new);
  end if;
  _company := (_row ->> 'company_id')::uuid;

  -- Pri mazaní celej firmy (cascade) už rodič neexistuje; históriu niet kam zapísať.
  if not exists (select 1 from public.companies c where c.id = _company) then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    _old := to_jsonb(old);
    select array_agg(e.key order by e.key) into _changed
    from jsonb_each(_row) e
    where e.key <> 'updated_at' and e.value is distinct from _old -> e.key;
    if _changed is null then
      return new;
    end if;
  end if;

  insert into public.audit_log (company_id, actor_id, actor_name, action, entity, entity_id, label, changed)
  values (
    _company,
    auth.uid(),
    coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), ''),
    lower(tg_op),
    tg_table_name,
    (_row ->> 'id')::uuid,
    left(coalesce(_row ->> 'name', _row ->> 'title', _row ->> 'plate', _row ->> 'borrower', _row ->> 'supplier', ''), 200),
    _changed
  );
  return coalesce(new, old);
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia write_audit: %', sqlerrm;
end;
$repair$;

do $repair$
begin
  execute $repairfn$CREATE OR REPLACE FUNCTION public.write_event_news()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  _actor text := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  _event record;
begin
  if tg_table_name = 'events' then
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (new.company_id, 'event', left('Nový event: ' || new.name || ' (' || to_char(new.starts_on, 'DD. MM. YYYY') || ')', 200), '/events/' || new.id, _actor);
  elsif new.member_id is not null and new.member_id is distinct from auth.uid() then
    select e.name, e.starts_on into _event from public.events e where e.id = new.event_id;
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (
      new.company_id, 'crew',
      left(coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = new.member_id), 'Člen')
        || ' je v posádke: ' || _event.name || ' (' || to_char(_event.starts_on, 'DD. MM. YYYY') || ')', 200),
      '/events/' || new.event_id, _actor
    );
  end if;
  return new;
end;
$function$$repairfn$;
exception when others then raise notice 'Funkcia write_event_news: %', sqlerrm;
end;
$repair$;
