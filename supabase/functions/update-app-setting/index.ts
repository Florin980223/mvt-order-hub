import { createClient } from 'npm:@supabase/supabase-js@2'
import { CORS_HEADERS, handleCorsPreflight } from '../_shared/cors.ts'

// Generic counterpart to update-outbound-api-setting / update-confidence-
// threshold-setting — same admin-gated, service-role, app_settings +
// audit_logs pattern, but parameterized by `key` instead of one Edge
// Function per setting. Introduced when the Settings page grew from 2 real
// settings to ~20+ (SettingsPage.tsx) — one bespoke function per toggle
// would have meant ~20 nearly-identical files. Each key's shape is
// whitelisted and structurally validated below; unknown keys are rejected,
// so this can't be used to write arbitrary app_settings rows.
const TIMEZONES = new Set([
  'Europe/Bucharest',
  'Europe/Chisinau',
  'Europe/Sofia',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Vienna',
  'Europe/Budapest',
  'Europe/London',
])

interface UpdateAppSettingPayload {
  key: string
  value_json: unknown
}

type Validator = (value: unknown) => { ok: true; value: Record<string, unknown> } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isNonEmptyString(value: unknown, maxLength = 200): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

const validateGeneralPreferences: Validator = (value) => {
  if (!isRecord(value)) return { ok: false, error: 'value_json must be an object' }
  const { timezone, date_format, time_format, currency, weight_unit, volume_unit, theme } = value
  if (typeof timezone !== 'string' || !TIMEZONES.has(timezone)) return { ok: false, error: 'invalid timezone' }
  if (!oneOf(date_format, ['DD.MM.YYYY', 'MM.DD.YYYY', 'YYYY-MM-DD'])) return { ok: false, error: 'invalid date_format' }
  if (!oneOf(time_format, ['24h', '12h'])) return { ok: false, error: 'invalid time_format' }
  if (!oneOf(currency, ['EUR', 'RON', 'USD'])) return { ok: false, error: 'invalid currency' }
  if (!oneOf(weight_unit, ['kg', 't'])) return { ok: false, error: 'invalid weight_unit' }
  if (!oneOf(volume_unit, ['m3', 'l'])) return { ok: false, error: 'invalid volume_unit' }
  if (!oneOf(theme, ['light', 'dark'])) return { ok: false, error: 'invalid theme' }
  return { ok: true, value: { timezone, date_format, time_format, currency, weight_unit, volume_unit, theme } }
}

const validateAiExtractionPreferences: Validator = (value) => {
  if (!isRecord(value)) return { ok: false, error: 'value_json must be an object' }
  const {
    document_language,
    auto_detect_file_type,
    extract_inline_attachments,
    continuous_learning,
    notify_below_threshold,
    ai_confidence_visible,
  } = value
  if (!oneOf(document_language, ['ro', 'en'])) return { ok: false, error: 'invalid document_language' }
  for (const [name, v] of Object.entries({
    auto_detect_file_type,
    extract_inline_attachments,
    continuous_learning,
    notify_below_threshold,
    ai_confidence_visible,
  })) {
    if (!isBoolean(v)) return { ok: false, error: `${name} must be a boolean` }
  }
  return {
    ok: true,
    value: {
      document_language,
      auto_detect_file_type,
      extract_inline_attachments,
      continuous_learning,
      notify_below_threshold,
      ai_confidence_visible,
    },
  }
}

const validateNotificationPreferences: Validator = (value) => {
  if (!isRecord(value)) return { ok: false, error: 'value_json must be an object' }
  const { new_emails, low_confidence_orders, ascend_import_errors, import_succeeded, client_confirmations_sent, channel } =
    value
  for (const [name, v] of Object.entries({
    new_emails,
    low_confidence_orders,
    ascend_import_errors,
    import_succeeded,
    client_confirmations_sent,
  })) {
    if (!isBoolean(v)) return { ok: false, error: `${name} must be a boolean` }
  }
  if (!oneOf(channel, ['all', 'email', 'app'])) return { ok: false, error: 'invalid channel' }
  return {
    ok: true,
    value: { new_emails, low_confidence_orders, ascend_import_errors, import_succeeded, client_confirmations_sent, channel },
  }
}

const validateAscendImportSettings: Validator = (value) => {
  if (!isRecord(value)) return { ok: false, error: 'value_json must be an object' }
  const {
    auto_import_above_threshold,
    check_duplicate_before_import,
    update_order_status_after_import,
    proforma_requirement,
    ascend_username,
  } = value
  for (const [name, v] of Object.entries({
    auto_import_above_threshold,
    check_duplicate_before_import,
    update_order_status_after_import,
  })) {
    if (!isBoolean(v)) return { ok: false, error: `${name} must be a boolean` }
  }
  if (!oneOf(proforma_requirement, ['optional', 'required', 'disabled'])) {
    return { ok: false, error: 'invalid proforma_requirement' }
  }
  if (!isNonEmptyString(ascend_username, 100)) return { ok: false, error: 'ascend_username must be a non-empty string' }
  return {
    ok: true,
    value: {
      auto_import_above_threshold,
      check_duplicate_before_import,
      update_order_status_after_import,
      proforma_requirement,
      ascend_username: (ascend_username as string).trim(),
    },
  }
}

const MAX_FIELD_MAPPINGS = 50

const validateAscendFieldMapping: Validator = (value) => {
  if (!isRecord(value)) return { ok: false, error: 'value_json must be an object' }
  const { mappings } = value
  if (!isRecord(mappings)) return { ok: false, error: 'mappings must be an object' }
  const entries = Object.entries(mappings)
  if (entries.length > MAX_FIELD_MAPPINGS) return { ok: false, error: 'too many field mappings' }
  const cleaned: Record<string, string> = {}
  for (const [orderField, ascendField] of entries) {
    if (!isNonEmptyString(orderField, 100)) return { ok: false, error: 'invalid order field name' }
    if (typeof ascendField !== 'string' || ascendField.length > 100) {
      return { ok: false, error: 'invalid ascend field name' }
    }
    const trimmed = ascendField.trim()
    if (trimmed.length > 0) cleaned[orderField] = trimmed
  }
  return { ok: true, value: { mappings: cleaned } }
}

const VALIDATORS: Record<string, Validator> = {
  general_preferences: validateGeneralPreferences,
  ai_extraction_preferences: validateAiExtractionPreferences,
  notification_preferences: validateNotificationPreferences,
  ascend_import_settings: validateAscendImportSettings,
  ascend_field_mapping: validateAscendFieldMapping,
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let payload: UpdateAppSettingPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid payload' }, 400)
  }

  if (typeof payload.key !== 'string' || !(payload.key in VALIDATORS)) {
    return jsonResponse({ error: 'unknown or unsupported settings key' }, 400)
  }

  const validation = VALIDATORS[payload.key](payload.value_json)
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, 400)
  }
  const newValueJson = validation.value
  const settingKey = payload.key

  const supabase = serviceClient()

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }
    const userId = userData.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, active')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile?.active || profile.role !== 'admin') {
      return jsonResponse({ error: 'forbidden' }, 403)
    }

    const { data: existing, error: existingError } = await supabase
      .from('app_settings')
      .select('value_json')
      .eq('key', settingKey)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)

    const { data: updated, error: updateError } = await supabase
      .from('app_settings')
      .update({ value_json: newValueJson, updated_by: userId })
      .eq('key', settingKey)
      .select('value_json, updated_at')
      .maybeSingle()
    if (updateError) throw new Error(updateError.message)
    if (!updated) {
      throw new Error(`app_settings row '${settingKey}' does not exist`)
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: userId,
        action: 'update',
        entity: 'app_settings',
        old_data: { key: settingKey, value_json: existing?.value_json ?? null },
        new_data: { key: settingKey, value_json: newValueJson },
      })
    } catch (auditErr) {
      console.error('update-app-setting audit log error:', (auditErr as Error).message)
    }

    return jsonResponse({ value_json: updated.value_json, updated_at: updated.updated_at }, 200)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('update-app-setting error:', errorMessage)
    return jsonResponse({ error: 'internal error' }, 500)
  }
})
