// Shapes for the app_settings rows seeded by migration
// 20260806090000_seed_settings_preferences.sql, written through the
// generic update-app-setting Edge Function (supabase/functions/update-app-setting).
// One row per Settings-page card rather than one row per control — see
// that migration's header comment for why.

export interface GeneralPreferences {
  timezone: string
  date_format: 'DD.MM.YYYY' | 'MM.DD.YYYY' | 'YYYY-MM-DD'
  time_format: '24h' | '12h'
  currency: 'EUR' | 'RON' | 'USD'
  weight_unit: 'kg' | 't'
  volume_unit: 'm3' | 'l'
  theme: 'light' | 'dark'
}

export interface AiExtractionPreferences {
  document_language: 'ro' | 'en'
  auto_detect_file_type: boolean
  extract_inline_attachments: boolean
  continuous_learning: boolean
  notify_below_threshold: boolean
  ai_confidence_visible: boolean
}

export interface NotificationPreferences {
  new_emails: boolean
  low_confidence_orders: boolean
  ascend_import_errors: boolean
  import_succeeded: boolean
  client_confirmations_sent: boolean
  channel: 'all' | 'email' | 'app'
}

export interface AscendImportSettings {
  auto_import_above_threshold: boolean
  check_duplicate_before_import: boolean
  update_order_status_after_import: boolean
  proforma_requirement: 'optional' | 'required' | 'disabled'
  ascend_username: string
}

/** order_field (src/lib/orders/orderFields.ts fieldName) -> free-text AscendTMS field name. */
export interface AscendFieldMapping {
  mappings: Record<string, string>
}

// Matches the migration's seed rows exactly — used only as a render
// fallback while a query is loading/hasn't returned yet, never written.
export const DEFAULT_GENERAL_PREFERENCES: GeneralPreferences = {
  timezone: 'Europe/Bucharest',
  date_format: 'DD.MM.YYYY',
  time_format: '24h',
  currency: 'EUR',
  weight_unit: 'kg',
  volume_unit: 'm3',
  theme: 'light',
}

export const DEFAULT_AI_EXTRACTION_PREFERENCES: AiExtractionPreferences = {
  document_language: 'ro',
  auto_detect_file_type: true,
  extract_inline_attachments: true,
  continuous_learning: true,
  notify_below_threshold: true,
  ai_confidence_visible: true,
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  new_emails: true,
  low_confidence_orders: true,
  ascend_import_errors: true,
  import_succeeded: true,
  client_confirmations_sent: false,
  channel: 'all',
}

export const DEFAULT_ASCEND_IMPORT_SETTINGS: AscendImportSettings = {
  auto_import_above_threshold: true,
  check_duplicate_before_import: true,
  update_order_status_after_import: true,
  proforma_requirement: 'optional',
  ascend_username: 'MVT_ORDER_HUB',
}

export const DEFAULT_ASCEND_FIELD_MAPPING: AscendFieldMapping = { mappings: {} }

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/London', label: '(UTC+00:00) Londra' },
  { value: 'Europe/Berlin', label: '(UTC+01:00) Berlin' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris' },
  { value: 'Europe/Madrid', label: '(UTC+01:00) Madrid' },
  { value: 'Europe/Rome', label: '(UTC+01:00) Roma' },
  { value: 'Europe/Vienna', label: '(UTC+01:00) Viena' },
  { value: 'Europe/Warsaw', label: '(UTC+01:00) Varșovia' },
  { value: 'Europe/Budapest', label: '(UTC+01:00) Budapesta' },
  { value: 'Europe/Bucharest', label: '(UTC+02:00) București' },
  { value: 'Europe/Chisinau', label: '(UTC+02:00) Chișinău' },
  { value: 'Europe/Sofia', label: '(UTC+02:00) Sofia' },
  { value: 'Europe/Athens', label: '(UTC+02:00) Atena' },
  { value: 'Europe/Istanbul', label: '(UTC+03:00) Istanbul' },
]

export const DATE_FORMAT_OPTIONS = [
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'MM.DD.YYYY', label: 'MM.DD.YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

export const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24 ore' },
  { value: '12h', label: '12 ore' },
]

export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'RON', label: 'RON' },
  { value: 'USD', label: 'USD' },
]

export const WEIGHT_UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilograme (kg)' },
  { value: 't', label: 'Tone (t)' },
]

export const VOLUME_UNIT_OPTIONS = [
  { value: 'm3', label: 'Metri cubi (m³)' },
  { value: 'l', label: 'Litri (l)' },
]

export const DOCUMENT_LANGUAGE_OPTIONS = [
  { value: 'ro', label: 'Română' },
  { value: 'en', label: 'Engleză' },
]

export const PROFORMA_REQUIREMENT_OPTIONS = [
  { value: 'optional', label: 'Opțională' },
  { value: 'required', label: 'Obligatorie' },
  { value: 'disabled', label: 'Dezactivată' },
]
