-- Settings page: wiring the "simple" controls that previously rendered as
-- DisabledToggle/DisabledSelect (figura6-setari.png cards: Setări Generale,
-- Setări Extracție AI, Notificări, Setări Import în AscendTMS — Securitate
-- și Acces / Backup și Jurnale stay deferred/disabled).
--
-- Same generic app_settings(key text, value_json jsonb) store used by
-- outbound_api (20260730090000) and confidence_threshold (20260731090000).
-- Grouped one row per settings card, rather than one row per control, to
-- avoid ~20 near-identical app_settings rows / query hooks — each row is
-- read/written as a whole object by the matching card's UI.
--
-- Seeded values mirror exactly what the disabled controls showed before
-- this migration, so switching them to real, wired controls doesn't change
-- anything a user currently sees on first load.
insert into public.app_settings (key, value_json, encrypted)
values
  (
    'general_preferences',
    '{
      "timezone": "Europe/Bucharest",
      "date_format": "DD.MM.YYYY",
      "time_format": "24h",
      "currency": "EUR",
      "weight_unit": "kg",
      "volume_unit": "m3",
      "theme": "light"
    }'::jsonb,
    false
  ),
  (
    'ai_extraction_preferences',
    '{
      "document_language": "ro",
      "auto_detect_file_type": true,
      "extract_inline_attachments": true,
      "continuous_learning": true,
      "notify_below_threshold": true,
      "ai_confidence_visible": true
    }'::jsonb,
    false
  ),
  (
    'notification_preferences',
    '{
      "new_emails": true,
      "low_confidence_orders": true,
      "ascend_import_errors": true,
      "import_succeeded": true,
      "client_confirmations_sent": false,
      "channel": "all"
    }'::jsonb,
    false
  ),
  (
    'ascend_import_settings',
    '{
      "auto_import_above_threshold": true,
      "check_duplicate_before_import": true,
      "update_order_status_after_import": true,
      "proforma_requirement": "optional",
      "ascend_username": "MVT_ORDER_HUB"
    }'::jsonb,
    false
  ),
  (
    -- "Mapare câmpuri": minimal honest version of a field-mapping UI —
    -- order_field (this app's own field name, from orderFields.ts) ->
    -- ascend_field (free-text target field name in AscendTMS), rather than
    -- a full drag-and-drop mapper.
    'ascend_field_mapping',
    '{"mappings": {}}'::jsonb,
    false
  )
on conflict (key) do nothing;
