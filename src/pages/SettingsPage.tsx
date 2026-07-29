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
  ScrollText,
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
import { useSubmissionJobsQuery } from '../lib/reports/useSubmissionJobsQuery'
import { formatDateTime } from '../lib/emails/format'
import { IntegrationRow } from '../components/settings/IntegrationRow'
import { DisabledToggle } from '../components/settings/DisabledToggle'
import { DisabledSelect } from '../components/settings/DisabledSelect'
import { ThemeToggle } from '../components/settings/ThemeToggle'
import './SettingsPage.css'

const CONNECTABLE_STATUSES = ['disconnected', 'error']
const CONFIDENCE_THRESHOLD_OPTIONS = [70, 75, 80, 85, 90, 95, 99]
const NOT_CONFIGURABLE_TITLE = 'Această setare nu este încă configurabilă'
const ALWAYS_ON_LOG_TITLE = 'Jurnalizarea activității este întotdeauna activă și nu poate fi dezactivată'

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
              <Loader2 aria-hidden="true" size={14} className="settings-inline-state__spinner" /> Se încarcă...
            </p>
          )}
          {isError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={14} />
              Conexiunea nu a putut fi încărcată{error instanceof Error ? `: ${error.message}` : '.'}
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
                <button type="button" className="settings-btn" onClick={() => startMutation.mutate()} disabled={connectDisabled}>
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
            {!isOutboundApiLoading && !isOutboundApiError && !isEditingEndpoint && (
              <p className="settings-endpoint-line">
                Endpoint: {currentUrl || '—'}
                <button type="button" className="settings-icon-btn" onClick={() => setIsEditingEndpoint(true)} aria-label="Editează endpoint-ul">
                  <Pencil aria-hidden="true" size={12} />
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
            <p>Model: —</p>
            {!isConfidenceThresholdLoading && !isConfidenceThresholdError && <p>Nivel încredere implicit: {currentThresholdPercent}%</p>}
          </IntegrationRow>

          <button
            type="button"
            className="settings-link-btn"
            disabled
            title="Nu există încă un ecran centralizat pentru toate integrările"
          >
            Vezi toate integrările
            <ChevronRight aria-hidden="true" size={14} />
          </button>
        </section>

        {/* Setări Extracție AI */}
        <section className="settings-card" id="settings-extractie-ai">
          <h2>Setări Extracție AI</h2>

          {isConfidenceThresholdError && (
            <p className="settings-inline-state settings-inline-state--error">
              <TriangleAlert aria-hidden="true" size={14} />
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

          <DisabledSelect label="Limbă documente" value="Română" title={NOT_CONFIGURABLE_TITLE} />

          <DisabledToggle label="Detectare automată tip fișier" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Extrage și atașamente în email (inline)" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Învățare continuă din corecții manuale" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Notifică la încredere sub prag" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="AI Confidence vizibil în UI" checked title={NOT_CONFIGURABLE_TITLE} />
        </section>

        {/* Setări Generale */}
        <section className="settings-card">
          <h2>Setări Generale</h2>

          <DisabledSelect label="Fus orar" value="(UTC+02:00) București" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Format dată" value="DD.MM.YYYY" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Format oră" value="24 ore" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Monedă implicită" value="EUR" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Unități măsură greutate" value="Kilograme (kg)" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Unități măsură volum" value="Metri cubi (m³)" title={NOT_CONFIGURABLE_TITLE} />

          <ThemeToggle />
        </section>
      </div>

      <div className="settings-row">
        {/* Notificări */}
        <section className="settings-card">
          <h2>Notificări</h2>
          <DisabledToggle label="Emailuri noi" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Comenzi cu încredere scăzută" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Erori la import în AscendTMS" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Import reușit" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Confirmări trimise clienților" checked={false} title={NOT_CONFIGURABLE_TITLE} />

          <div className="settings-field-row">
            <span className="settings-field-row__label">Canal notificări</span>
            <div className="settings-channel-select" title={NOT_CONFIGURABLE_TITLE}>
              <button type="button" className="settings-channel-select__btn settings-channel-select__btn--active" disabled>
                <Bell aria-hidden="true" size={13} />
                Toate
              </button>
              <button type="button" className="settings-channel-select__btn" disabled>
                <Mail aria-hidden="true" size={13} />
                Email
              </button>
              <button type="button" className="settings-channel-select__btn" disabled>
                <Smartphone aria-hidden="true" size={13} />
                Aplicație
              </button>
            </div>
          </div>
        </section>

        {/* Setări Import în AscendTMS */}
        <section className="settings-card">
          <h2>Setări Import în AscendTMS</h2>
          <DisabledToggle label="Import automat dacă încredere ≥ prag" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Verifică duplicat înainte de import" checked title={NOT_CONFIGURABLE_TITLE} />
          <DisabledToggle label="Actualizează status comandă după import" checked title={NOT_CONFIGURABLE_TITLE} />

          <div className="settings-field-row">
            <span className="settings-field-row__label">Mapare câmpuri</span>
            <button
              type="button"
              className="settings-link-btn settings-link-btn--field"
              disabled
              title="Configurarea mapării de câmpuri nu este încă disponibilă"
            >
              Configurează maparea
              <ChevronRight aria-hidden="true" size={14} />
            </button>
          </div>
          <DisabledSelect label="Proformă înainte de import" value="Opțională" title={NOT_CONFIGURABLE_TITLE} />
          <DisabledSelect label="Utilizator AscendTMS" value="MVT_ORDER_HUB" title={NOT_CONFIGURABLE_TITLE} />
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
              <Info aria-hidden="true" size={13} className="settings-field-row__info" />
            </span>
            <input type="text" className="settings-text-input" disabled placeholder="ex: 192.168.1.1, 10.0.0.0/24" />
          </label>
          {/* Real data (audit_logs) exists and is actively populated by 10
              edge functions, but logging is unconditional in code — there is
              no flag to actually gate, so this renders permanently on rather
              than as a fake toggle. */}
          <DisabledToggle label="Log activități" checked title={ALWAYS_ON_LOG_TITLE} />
          <Link to="/users" className="settings-link-btn settings-link-btn--field settings-link-btn--nav">
            <Shield aria-hidden="true" size={14} />
            Gestionează utilizatori
            <ChevronRight aria-hidden="true" size={14} />
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
              <Info aria-hidden="true" size={13} className="settings-field-row__info" />
            </span>
            <input type="text" className="settings-text-input" disabled value="365" readOnly title={NOT_CONFIGURABLE_TITLE} />
          </div>
          <div className="settings-backup-col">
            <span className="settings-field-row__label">Jurnale sistem</span>
            <DisabledSelect label="Nivel logare" value="Informațional" title={NOT_CONFIGURABLE_TITLE} />
            <Link to="/technical-logs" className="settings-link-btn settings-link-btn--field settings-link-btn--nav">
              <ScrollText aria-hidden="true" size={14} />
              Deschide jurnale
              <ChevronRight aria-hidden="true" size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
