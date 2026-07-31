import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  ChevronRight,
  Info,
  Loader2,
  Mail,
  Pencil,
  Shield,
  Smartphone,
  Sparkles,
  Truck,
  TriangleAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useMailConnectionQuery } from '../lib/settings/useMailConnectionQuery'
import { useOutboundApiQuery } from '../lib/settings/useOutboundApiQuery'
import { useConfidenceThresholdQuery } from '../lib/settings/useConfidenceThresholdQuery'
import { useAppSettingQuery } from '../lib/settings/useAppSettingQuery'
import { useUpdateAppSettingMutation } from '../lib/settings/useUpdateAppSettingMutation'
import {
  type AiExtractionPreferences,
  type AscendFieldMapping,
  type AscendImportSettings,
  type GeneralPreferences,
  type NotificationPreferences,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DEFAULT_AI_EXTRACTION_PREFERENCES,
  DEFAULT_ASCEND_FIELD_MAPPING,
  DEFAULT_ASCEND_IMPORT_SETTINGS,
  DEFAULT_GENERAL_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DOCUMENT_LANGUAGE_OPTIONS,
  PROFORMA_REQUIREMENT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
  VOLUME_UNIT_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
} from '../lib/settings/appSettingsTypes'
import { useSubmissionJobsQuery } from '../lib/reports/useSubmissionJobsQuery'
import { formatDateTime } from '../lib/emails/format'
import { IntegrationRow } from '../components/settings/IntegrationRow'
import { DisabledToggle } from '../components/settings/DisabledToggle'
import { DisabledSelect } from '../components/settings/DisabledSelect'
import { ThemeToggle } from '../components/settings/ThemeToggle'
import { Toggle } from '../components/settings/Toggle'
import { SettingSelect } from '../components/settings/SettingSelect'
import { FieldMappingPanel } from '../components/settings/FieldMappingPanel'
import './SettingsPage.css'

const CONNECTABLE_STATUSES = ['disconnected', 'error', 'expiring_soon', 'connecting']
const CONFIDENCE_THRESHOLD_OPTIONS = [70, 75, 80, 85, 90, 95, 99]
const NOT_CONFIGURABLE_TITLE = 'Această setare nu este încă configurabilă'
const ALWAYS_ON_LOG_TITLE = 'Jurnalizarea activității este întotdeauna activă și nu poate fi dezactivată'
// Mirrors supabase/functions/extract-order-ai/index.ts's OPENAI_MODEL —
// not user-configurable/no app_setting exists for it, but it's a real,
// constant fact about the wired AI provider, not a fabricated value.
const AI_MODEL_LABEL = 'GPT-4o mini (OpenAI)'

interface OutlookOauthStartResult {
  authorize_url: string
}

interface UpdateOutboundApiResult {
  url: string
}

interface UpdateConfidenceThresholdResult {
  threshold: number
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function SettingsPage() {
  const { data: connection, isLoading, isError, error, refetch } = useMailConnectionQuery()
  const queryClient = useQueryClient()

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<OutlookOauthStartResult>('outlook-oauth-start')
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data?.authorize_url) {
        window.open(data.authorize_url, '_blank', 'noopener,noreferrer')
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'mail-connection'] })
    },
  })

  const isConnectable = !connection || CONNECTABLE_STATUSES.includes(connection.status)
  const connectDisabled = !isConnectable || startMutation.isPending
  const isOutlookConnected = connection?.status === 'connected'

  const { data: outboundApi, isLoading: isOutboundApiLoading, isError: isOutboundApiError, error: outboundApiError } =
    useOutboundApiQuery()

  const [urlInput, setUrlInput] = useState<string | null>(null)
  const [isEditingEndpoint, setIsEditingEndpoint] = useState(false)

  const updateOutboundApiMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke<UpdateOutboundApiResult>(
        'update-outbound-api-setting',
        { body: { url } },
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'outbound-api'] })
      setIsEditingEndpoint(false)
    },
  })

  const currentUrl = outboundApi?.value_json.url ?? ''
  const resolvedUrl = urlInput ?? currentUrl
  const isUrlValid = isValidHttpUrl(resolvedUrl)
  const saveDisabled = !isUrlValid || resolvedUrl === currentUrl || updateOutboundApiMutation.isPending
  // Seeded placeholder from migration 20260730090000 — a real endpoint
  // hasn't been configured yet if this is still the value.
  const isAscendTmsConfigured = currentUrl !== '' && !currentUrl.includes('example.invalid')

  const submissionJobsQuery = useSubmissionJobsQuery()
  const ascendTmsLastSync = useMemo(() => {
    const succeeded = (submissionJobsQuery.data ?? []).filter((job) => job.status === 'succeeded')
    if (succeeded.length === 0) return null
    return succeeded.reduce((latest, job) => (job.updated_at > latest ? job.updated_at : latest), succeeded[0].updated_at)
  }, [submissionJobsQuery.data])

  const {
    data: confidenceThresholdSetting,
    isLoading: isConfidenceThresholdLoading,
    isError: isConfidenceThresholdError,
    error: confidenceThresholdError,
  } = useConfidenceThresholdQuery()

  const updateConfidenceThresholdMutation = useMutation({
    mutationFn: async (threshold: number) => {
      const { data, error } = await supabase.functions.invoke<UpdateConfidenceThresholdResult>(
        'update-confidence-threshold-setting',
        { body: { threshold } },
      )
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'confidence-threshold'] })
    },
  })

  const currentThresholdPercent = Math.round((confidenceThresholdSetting?.value_json.threshold ?? 0.85) * 100)

  // Setări Generale — one app_settings row for the whole card (see
  // migration 20260806090000's header comment for why), read/written as a
  // whole object per field change through the generic update-app-setting
  // Edge Function.
  const {
    data: generalPreferencesSetting,
    isLoading: isGeneralPreferencesLoading,
    isError: isGeneralPreferencesError,
    error: generalPreferencesError,
  } = useAppSettingQuery<GeneralPreferences>('general_preferences')
  const updateGeneralPreferencesMutation = useUpdateAppSettingMutation<GeneralPreferences>('general_preferences')
  const generalPreferences = generalPreferencesSetting?.value_json ?? DEFAULT_GENERAL_PREFERENCES
  const generalPreferencesDisabled = isGeneralPreferencesLoading || updateGeneralPreferencesMutation.isPending

  function updateGeneralPreference<K extends keyof GeneralPreferences>(field: K, value: GeneralPreferences[K]) {
    updateGeneralPreferencesMutation.mutate({ ...generalPreferences, [field]: value })
  }

  // Setări Extracție AI (the non-threshold controls)
  const {
    data: aiExtractionSetting,
    isLoading: isAiExtractionLoading,
    isError: isAiExtractionError,
    error: aiExtractionError,
  } = useAppSettingQuery<AiExtractionPreferences>('ai_extraction_preferences')
  const updateAiExtractionMutation = useUpdateAppSettingMutation<AiExtractionPreferences>('ai_extraction_preferences')
  const aiExtractionPreferences = aiExtractionSetting?.value_json ?? DEFAULT_AI_EXTRACTION_PREFERENCES
  const aiExtractionDisabled = isAiExtractionLoading || updateAiExtractionMutation.isPending

  function updateAiExtractionPreference<K extends keyof AiExtractionPreferences>(
    field: K,
    value: AiExtractionPreferences[K],
  ) {
    updateAiExtractionMutation.mutate({ ...aiExtractionPreferences, [field]: value })
  }

  // Notificări
  const {
    data: notificationSetting,
    isLoading: isNotificationLoading,
    isError: isNotificationError,
    error: notificationError,
  } = useAppSettingQuery<NotificationPreferences>('notification_preferences')
  const updateNotificationMutation = useUpdateAppSettingMutation<NotificationPreferences>('notification_preferences')
  const notificationPreferences = notificationSetting?.value_json ?? DEFAULT_NOTIFICATION_PREFERENCES
  const notificationDisabled = isNotificationLoading || updateNotificationMutation.isPending

  function updateNotificationPreference<K extends keyof NotificationPreferences>(
    field: K,
    value: NotificationPreferences[K],
  ) {
    updateNotificationMutation.mutate({ ...notificationPreferences, [field]: value })
  }

  // Setări Import în AscendTMS
  const {
    data: ascendImportSetting,
    isLoading: isAscendImportLoading,
    isError: isAscendImportError,
    error: ascendImportError,
  } = useAppSettingQuery<AscendImportSettings>('ascend_import_settings')
  const updateAscendImportMutation = useUpdateAppSettingMutation<AscendImportSettings>('ascend_import_settings')
  const ascendImportSettings = ascendImportSetting?.value_json ?? DEFAULT_ASCEND_IMPORT_SETTINGS
  const ascendImportDisabled = isAscendImportLoading || updateAscendImportMutation.isPending

  function updateAscendImportSetting<K extends keyof AscendImportSettings>(field: K, value: AscendImportSettings[K]) {
    updateAscendImportMutation.mutate({ ...ascendImportSettings, [field]: value })
  }

  const [ascendUsernameInput, setAscendUsernameInput] = useState<string | null>(null)
  const [isEditingAscendUsername, setIsEditingAscendUsername] = useState(false)
  const resolvedAscendUsername = ascendUsernameInput ?? ascendImportSettings.ascend_username
  const isAscendUsernameValid = resolvedAscendUsername.trim().length > 0
  const ascendUsernameSaveDisabled =
    !isAscendUsernameValid ||
    resolvedAscendUsername.trim() === ascendImportSettings.ascend_username ||
    updateAscendImportMutation.isPending

  // "Mapare câmpuri" — minimal field-mapping config (see FieldMappingPanel).
  const {
    data: fieldMappingSetting,
    isLoading: isFieldMappingLoading,
    isError: isFieldMappingError,
  } = useAppSettingQuery<AscendFieldMapping>('ascend_field_mapping')
  const updateFieldMappingMutation = useUpdateAppSettingMutation<AscendFieldMapping>('ascend_field_mapping')
  const fieldMapping = fieldMappingSetting?.value_json ?? DEFAULT_ASCEND_FIELD_MAPPING
  const [isFieldMappingOpen, setIsFieldMappingOpen] = useState(false)

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1>Setări</h1>
        <p className="settings-page__subtitle">Configurează aplicația, conexiunile și preferințele sistemului.</p>
      </header>

      <div className="settings-row">
        {/* Conectări și Integrări */}
        <section className="settings-card">
          <h2>Conectări și Integrări</h2>

          {isLoading && (
            <p className="settings-inline-state">
              <Loader2 aria-hidden="true" size={12} className="settings-inline-state__spinner" /> Se încarcă...
            </p>
          )}
          {isError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Conexiunea nu a putut fi încărcată{error instanceof Error ? `: ${error.message}` : '.'}
              <button type="button" className="settings-link-btn" onClick={() => refetch()}>
                Reîncearcă
              </button>
            </p>
          )}

          {!isLoading && !isError && (
            <IntegrationRow
              icon={Mail}
              iconVariant="blue"
              name="Microsoft Outlook"
              statusText={isOutlookConnected ? 'Conectat cu succes' : 'Neconectat'}
              active={isOutlookConnected}
              action={
                <button
                  type="button"
                  className="settings-btn settings-btn--outline"
                  onClick={() => startMutation.mutate()}
                  disabled={connectDisabled}
                >
                  {startMutation.isPending ? 'Se conectează...' : isOutlookConnected ? 'Reconectează' : 'Conectează'}
                </button>
              }
            >
              {connection && <p>Cont: {connection.mailbox_address}</p>}
              {connection?.last_sync_at && <p>Ultima sincronizare: {formatDateTime(connection.last_sync_at)}</p>}
              {startMutation.isError && (
                <p className="settings-inline-state settings-inline-state--error">
                  {startMutation.error instanceof Error ? startMutation.error.message : 'Conectarea a eșuat.'}
                </p>
              )}
            </IntegrationRow>
          )}

          <IntegrationRow
            icon={Truck}
            iconVariant="teal"
            name="AscendTMS"
            statusText={isAscendTmsConfigured ? 'Conectat' : 'Neconfigurat'}
            active={isAscendTmsConfigured}
            action={
              <button type="button" className="settings-btn settings-btn--outline" disabled title="Testarea conexiunii nu este încă disponibilă">
                Testează conexiune
              </button>
            }
          >
            {isOutboundApiError && (
              <p className="settings-inline-state settings-inline-state--error">
                <TriangleAlert aria-hidden="true" size={12} />
                Endpoint-ul nu a putut fi încărcat{outboundApiError instanceof Error ? `: ${outboundApiError.message}` : '.'}
              </p>
            )}
            {!isOutboundApiLoading && !isOutboundApiError && !isEditingEndpoint && (
              <p className="settings-endpoint-line">
                Endpoint: {currentUrl || '—'}
                <button type="button" className="settings-icon-btn" onClick={() => setIsEditingEndpoint(true)} aria-label="Editează endpoint-ul">
                  <Pencil aria-hidden="true" size={11} />
                </button>
              </p>
            )}
            {isEditingEndpoint && (
              <div className="settings-endpoint-edit">
                <input
                  type="text"
                  value={resolvedUrl}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="settings-endpoint-edit__input"
                />
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => updateOutboundApiMutation.mutate(resolvedUrl)}
                  disabled={saveDisabled}
                >
                  {updateOutboundApiMutation.isPending ? 'Se salvează...' : 'Salvează'}
                </button>
                {resolvedUrl !== '' && !isUrlValid && <p className="settings-inline-state settings-inline-state--error">URL invalid.</p>}
              </div>
            )}
            <p>Ultima sincronizare: {ascendTmsLastSync ? formatDateTime(ascendTmsLastSync) : '—'}</p>
          </IntegrationRow>

          <IntegrationRow
            icon={Sparkles}
            iconVariant="violet"
            name="AI Engine (Extracție date)"
            active
            action={
              <a href="#settings-extractie-ai" className="settings-btn settings-btn--outline">
                Configurează
              </a>
            }
          >
            <p>Model: {AI_MODEL_LABEL}</p>
            {!isConfidenceThresholdLoading && !isConfidenceThresholdError && <p>Nivel încredere implicit: {currentThresholdPercent}%</p>}
          </IntegrationRow>

          <button
            type="button"
            className="settings-link-btn"
            disabled
            title="Nu există încă un ecran centralizat pentru toate integrările"
          >
            Vezi toate integrările
            <ChevronRight aria-hidden="true" size={12} />
          </button>
        </section>

        {/* Setări Extracție AI */}
        <section className="settings-card" id="settings-extractie-ai">
          <h2>Setări Extracție AI</h2>

          {isConfidenceThresholdError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Pragul nu a putut fi încărcat{confidenceThresholdError instanceof Error ? `: ${confidenceThresholdError.message}` : '.'}
            </p>
          )}

          {!isConfidenceThresholdLoading && !isConfidenceThresholdError && (
            <label className="settings-field-row" title="Comenzile cu încredere sub acest prag necesită validare manuală înainte de import">
              <span className="settings-field-row__label">Nivel minim încredere pentru import automat</span>
              <select
                className="settings-select"
                value={currentThresholdPercent}
                onChange={(e) => updateConfidenceThresholdMutation.mutate(Number(e.target.value) / 100)}
                disabled={updateConfidenceThresholdMutation.isPending}
              >
                {CONFIDENCE_THRESHOLD_OPTIONS.map((percent) => (
                  <option key={percent} value={percent}>
                    {percent}%
                  </option>
                ))}
              </select>
            </label>
          )}
          {updateConfidenceThresholdMutation.isError && (
            <p className="settings-inline-state settings-inline-state--error">
              {updateConfidenceThresholdMutation.error instanceof Error
                ? updateConfidenceThresholdMutation.error.message
                : 'Salvarea a eșuat.'}
            </p>
          )}

          {isAiExtractionError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Preferințele de extracție nu au putut fi încărcate
              {aiExtractionError instanceof Error ? `: ${aiExtractionError.message}` : '.'}
            </p>
          )}

          <SettingSelect
            label="Limbă documente"
            value={aiExtractionPreferences.document_language}
            options={DOCUMENT_LANGUAGE_OPTIONS}
            onChange={(value) =>
              updateAiExtractionPreference('document_language', value as AiExtractionPreferences['document_language'])
            }
            disabled={aiExtractionDisabled}
          />

          <Toggle
            label="Detectare automată tip fișier"
            checked={aiExtractionPreferences.auto_detect_file_type}
            onChange={(checked) => updateAiExtractionPreference('auto_detect_file_type', checked)}
            disabled={aiExtractionDisabled}
          />
          <Toggle
            label="Extrage și atașamente în email (inline)"
            checked={aiExtractionPreferences.extract_inline_attachments}
            onChange={(checked) => updateAiExtractionPreference('extract_inline_attachments', checked)}
            disabled={aiExtractionDisabled}
          />
          <Toggle
            label="Învățare continuă din corecții manuale"
            checked={aiExtractionPreferences.continuous_learning}
            onChange={(checked) => updateAiExtractionPreference('continuous_learning', checked)}
            disabled={aiExtractionDisabled}
          />
          <Toggle
            label="Notifică la încredere sub prag"
            checked={aiExtractionPreferences.notify_below_threshold}
            onChange={(checked) => updateAiExtractionPreference('notify_below_threshold', checked)}
            disabled={aiExtractionDisabled}
          />
          <Toggle
            label="AI Confidence vizibil în UI"
            checked={aiExtractionPreferences.ai_confidence_visible}
            onChange={(checked) => updateAiExtractionPreference('ai_confidence_visible', checked)}
            disabled={aiExtractionDisabled}
          />
          {updateAiExtractionMutation.isError && (
            <p className="settings-inline-state settings-inline-state--error">
              {updateAiExtractionMutation.error instanceof Error
                ? updateAiExtractionMutation.error.message
                : 'Salvarea a eșuat.'}
            </p>
          )}
        </section>

        {/* Setări Generale */}
        <section className="settings-card">
          <h2>Setări Generale</h2>

          {isGeneralPreferencesError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Preferințele generale nu au putut fi încărcate
              {generalPreferencesError instanceof Error ? `: ${generalPreferencesError.message}` : '.'}
            </p>
          )}

          <SettingSelect
            label="Fus orar"
            value={generalPreferences.timezone}
            options={TIMEZONE_OPTIONS}
            onChange={(value) => updateGeneralPreference('timezone', value)}
            disabled={generalPreferencesDisabled}
          />
          <SettingSelect
            label="Format dată"
            value={generalPreferences.date_format}
            options={DATE_FORMAT_OPTIONS}
            onChange={(value) => updateGeneralPreference('date_format', value as GeneralPreferences['date_format'])}
            disabled={generalPreferencesDisabled}
          />
          <SettingSelect
            label="Format oră"
            value={generalPreferences.time_format}
            options={TIME_FORMAT_OPTIONS}
            onChange={(value) => updateGeneralPreference('time_format', value as GeneralPreferences['time_format'])}
            disabled={generalPreferencesDisabled}
          />
          <SettingSelect
            label="Monedă implicită"
            value={generalPreferences.currency}
            options={CURRENCY_OPTIONS}
            onChange={(value) => updateGeneralPreference('currency', value as GeneralPreferences['currency'])}
            disabled={generalPreferencesDisabled}
          />
          <SettingSelect
            label="Unități măsură greutate"
            value={generalPreferences.weight_unit}
            options={WEIGHT_UNIT_OPTIONS}
            onChange={(value) => updateGeneralPreference('weight_unit', value as GeneralPreferences['weight_unit'])}
            disabled={generalPreferencesDisabled}
          />
          <SettingSelect
            label="Unități măsură volum"
            value={generalPreferences.volume_unit}
            options={VOLUME_UNIT_OPTIONS}
            onChange={(value) => updateGeneralPreference('volume_unit', value as GeneralPreferences['volume_unit'])}
            disabled={generalPreferencesDisabled}
          />

          <ThemeToggle
            value={generalPreferences.theme}
            onChange={(theme) => updateGeneralPreference('theme', theme)}
            disabled={generalPreferencesDisabled}
          />
          {updateGeneralPreferencesMutation.isError && (
            <p className="settings-inline-state settings-inline-state--error">
              {updateGeneralPreferencesMutation.error instanceof Error
                ? updateGeneralPreferencesMutation.error.message
                : 'Salvarea a eșuat.'}
            </p>
          )}
        </section>
      </div>

      <div className="settings-row">
        {/* Notificări */}
        <section className="settings-card">
          <h2>Notificări</h2>

          {isNotificationError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Preferințele de notificare nu au putut fi încărcate
              {notificationError instanceof Error ? `: ${notificationError.message}` : '.'}
            </p>
          )}

          <Toggle
            label="Emailuri noi"
            checked={notificationPreferences.new_emails}
            onChange={(checked) => updateNotificationPreference('new_emails', checked)}
            disabled={notificationDisabled}
          />
          <Toggle
            label="Comenzi cu încredere scăzută"
            checked={notificationPreferences.low_confidence_orders}
            onChange={(checked) => updateNotificationPreference('low_confidence_orders', checked)}
            disabled={notificationDisabled}
          />
          <Toggle
            label="Erori la import în AscendTMS"
            checked={notificationPreferences.ascend_import_errors}
            onChange={(checked) => updateNotificationPreference('ascend_import_errors', checked)}
            disabled={notificationDisabled}
          />
          <Toggle
            label="Import reușit"
            checked={notificationPreferences.import_succeeded}
            onChange={(checked) => updateNotificationPreference('import_succeeded', checked)}
            disabled={notificationDisabled}
          />
          <Toggle
            label="Confirmări trimise clienților"
            checked={notificationPreferences.client_confirmations_sent}
            onChange={(checked) => updateNotificationPreference('client_confirmations_sent', checked)}
            disabled={notificationDisabled}
          />

          <div className="settings-field-row">
            <span className="settings-field-row__label">Canal notificări</span>
            <div className="settings-channel-select">
              <button
                type="button"
                className={
                  notificationPreferences.channel === 'all'
                    ? 'settings-channel-select__btn settings-channel-select__btn--active'
                    : 'settings-channel-select__btn'
                }
                disabled={notificationDisabled}
                onClick={() => updateNotificationPreference('channel', 'all')}
              >
                <Bell aria-hidden="true" size={11} />
                Toate
              </button>
              <button
                type="button"
                className={
                  notificationPreferences.channel === 'email'
                    ? 'settings-channel-select__btn settings-channel-select__btn--active'
                    : 'settings-channel-select__btn'
                }
                disabled={notificationDisabled}
                onClick={() => updateNotificationPreference('channel', 'email')}
              >
                <Mail aria-hidden="true" size={11} />
                Email
              </button>
              <button
                type="button"
                className={
                  notificationPreferences.channel === 'app'
                    ? 'settings-channel-select__btn settings-channel-select__btn--active'
                    : 'settings-channel-select__btn'
                }
                disabled={notificationDisabled}
                onClick={() => updateNotificationPreference('channel', 'app')}
              >
                <Smartphone aria-hidden="true" size={11} />
                Aplicație
              </button>
            </div>
          </div>
          {updateNotificationMutation.isError && (
            <p className="settings-inline-state settings-inline-state--error">
              {updateNotificationMutation.error instanceof Error
                ? updateNotificationMutation.error.message
                : 'Salvarea a eșuat.'}
            </p>
          )}
        </section>

        {/* Setări Import în AscendTMS */}
        <section className="settings-card">
          <h2>Setări Import în AscendTMS</h2>

          {isAscendImportError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Setările de import nu au putut fi încărcate
              {ascendImportError instanceof Error ? `: ${ascendImportError.message}` : '.'}
            </p>
          )}

          <Toggle
            label="Import automat dacă încredere ≥ prag"
            checked={ascendImportSettings.auto_import_above_threshold}
            onChange={(checked) => updateAscendImportSetting('auto_import_above_threshold', checked)}
            disabled={ascendImportDisabled}
          />
          <Toggle
            label="Verifică duplicat înainte de import"
            checked={ascendImportSettings.check_duplicate_before_import}
            onChange={(checked) => updateAscendImportSetting('check_duplicate_before_import', checked)}
            disabled={ascendImportDisabled}
          />
          <Toggle
            label="Actualizează status comandă după import"
            checked={ascendImportSettings.update_order_status_after_import}
            onChange={(checked) => updateAscendImportSetting('update_order_status_after_import', checked)}
            disabled={ascendImportDisabled}
          />

          <div className="settings-field-row">
            <span className="settings-field-row__label">Mapare câmpuri</span>
            <button
              type="button"
              className="settings-link-btn settings-link-btn--field"
              onClick={() => setIsFieldMappingOpen((open) => !open)}
            >
              {isFieldMappingOpen ? 'Ascunde maparea' : 'Configurează maparea'}
              <ChevronRight aria-hidden="true" size={12} />
            </button>
          </div>
          {isFieldMappingOpen && isFieldMappingError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={12} />
              Maparea de câmpuri nu a putut fi încărcată.
            </p>
          )}
          {isFieldMappingOpen && !isFieldMappingLoading && !isFieldMappingError && (
            <FieldMappingPanel
              value={fieldMapping}
              isSaving={updateFieldMappingMutation.isPending}
              error={
                updateFieldMappingMutation.isError
                  ? updateFieldMappingMutation.error instanceof Error
                    ? updateFieldMappingMutation.error.message
                    : 'Salvarea a eșuat.'
                  : null
              }
              onCancel={() => setIsFieldMappingOpen(false)}
              onSave={(next) =>
                updateFieldMappingMutation.mutate(next, { onSuccess: () => setIsFieldMappingOpen(false) })
              }
            />
          )}

          <SettingSelect
            label="Proformă înainte de import"
            value={ascendImportSettings.proforma_requirement}
            options={PROFORMA_REQUIREMENT_OPTIONS}
            onChange={(value) =>
              updateAscendImportSetting('proforma_requirement', value as AscendImportSettings['proforma_requirement'])
            }
            disabled={ascendImportDisabled}
          />

          <div className="settings-field-row">
            <span className="settings-field-row__label">Utilizator AscendTMS</span>
            {!isEditingAscendUsername ? (
              <span className="settings-endpoint-line">
                {ascendImportSettings.ascend_username || '—'}
                <button
                  type="button"
                  className="settings-icon-btn"
                  onClick={() => setIsEditingAscendUsername(true)}
                  aria-label="Editează utilizatorul AscendTMS"
                  disabled={ascendImportDisabled}
                >
                  <Pencil aria-hidden="true" size={11} />
                </button>
              </span>
            ) : (
              <span className="settings-endpoint-edit">
                <input
                  type="text"
                  value={resolvedAscendUsername}
                  onChange={(e) => setAscendUsernameInput(e.target.value)}
                  className="settings-endpoint-edit__input"
                />
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() =>
                    updateAscendImportMutation.mutate(
                      { ...ascendImportSettings, ascend_username: resolvedAscendUsername.trim() },
                      {
                        onSuccess: () => {
                          setIsEditingAscendUsername(false)
                          setAscendUsernameInput(null)
                        },
                      },
                    )
                  }
                  disabled={ascendUsernameSaveDisabled}
                >
                  {updateAscendImportMutation.isPending ? 'Se salvează...' : 'Salvează'}
                </button>
              </span>
            )}
          </div>
          {updateAscendImportMutation.isError && (
            <p className="settings-inline-state settings-inline-state--error">
              {updateAscendImportMutation.error instanceof Error
                ? updateAscendImportMutation.error.message
                : 'Salvarea a eșuat.'}
            </p>
          )}
        </section>

        {/* Securitate și Acces */}
        <section className="settings-card">
          <h2>Securitate și Acces</h2>
          <DisabledToggle label="Autentificare în doi pași (2FA)" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Sesiune automată (timeout)" value="30 minute" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Rol implicit utilizatori noi" value="Operator" title={NOT_CONFIGURABLE_TITLE} />
          <label className="settings-field-row" title={NOT_CONFIGURABLE_TITLE}>
            <span className="settings-field-row__label">
              IP-uri permise (opțional)
              <Info aria-hidden="true" size={11} className="settings-field-row__info" />
            </span>
            <input type="text" className="settings-text-input" disabled placeholder="ex: 192.168.1.1, 10.0.0.0/24" />
          </label>
          {/* Real data (audit_logs) exists and is actively populated by 10
              edge functions, but logging is unconditional in code — there is
              no flag to actually gate, so this renders permanently on rather
              than as a fake toggle. */}
          <DisabledToggle label="Log activități" checked title={ALWAYS_ON_LOG_TITLE} />
          <Link to="/users" className="settings-link-btn settings-link-btn--field settings-link-btn--nav">
            <Shield aria-hidden="true" size={12} />
            Gestionează utilizatori
            <ChevronRight aria-hidden="true" size={12} />
          </Link>
        </section>
      </div>

      {/* Backup și Jurnale — full width */}
      <section className="settings-card settings-card--backup">
        <h2>Backup și Jurnale</h2>
        <div className="settings-backup-row">
          <div className="settings-backup-col">
            <span className="settings-field-row__label">Backup baze de date</span>
            <button type="button" className="settings-btn settings-btn--outline" disabled title={NOT_CONFIGURABLE_TITLE}>
              Backup manual
            </button>
            <p className="settings-backup-col__note">Ultimul backup: —</p>
          </div>
          <div className="settings-backup-col">
            <span className="settings-field-row__label">
              Păstrare date (zile)
              <Info aria-hidden="true" size={11} className="settings-field-row__info" />
            </span>
            <input type="text" className="settings-text-input" disabled value="365" readOnly title={NOT_CONFIGURABLE_TITLE} />
          </div>
          <div className="settings-backup-col">
            <span className="settings-field-row__label">Jurnale sistem</span>
            <DisabledSelect label="Nivel logare" value="Informațional" title={NOT_CONFIGURABLE_TITLE} />
            {/* No leading icon here — confirmed against figura6-setari.png
                at native resolution: unlike "Gestionează utilizatori",
                "Deschide jurnale" is text + chevron only. */}
            <Link to="/technical-logs" className="settings-link-btn settings-link-btn--field settings-link-btn--nav">
              Deschide jurnale
              <ChevronRight aria-hidden="true" size={12} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
