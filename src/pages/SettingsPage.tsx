import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Loader2, Mail, Pencil, Sparkles, Truck, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/auth/useAuth'
import { useMailConnectionQuery } from '../lib/settings/useMailConnectionQuery'
import { useOutboundApiQuery } from '../lib/settings/useOutboundApiQuery'
import { useConfidenceThresholdQuery } from '../lib/settings/useConfidenceThresholdQuery'
import { useProfilesQuery, type ProfileRow } from '../lib/settings/useProfilesQuery'
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

interface OutlookOauthStartResult {
  authorize_url: string
}

interface UpdateOutboundApiResult {
  url: string
}

interface UpdateConfidenceThresholdResult {
  threshold: number
}

interface UpdateProfileResult {
  id: string
  full_name: string | null
  role: string
  active: boolean
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

  const { user } = useAuth()
  const {
    data: profiles,
    isLoading: isProfilesLoading,
    isError: isProfilesError,
    error: profilesError,
  } = useProfilesQuery()

  const updateProfileMutation = useMutation({
    mutationFn: async (update: { profile_id: string; active?: boolean; role?: string }) => {
      const { data, error } = await supabase.functions.invoke<UpdateProfileResult>('update-profile', {
        body: update,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'profiles'] })
    },
  })

  function isSelf(profile: ProfileRow): boolean {
    return profile.id === user?.id
  }

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

      <section className="settings-card settings-card--users">
        <h2>Utilizatori</h2>

        {isProfilesLoading && (
          <p className="settings-inline-state">
            <Loader2 aria-hidden="true" size={14} className="settings-inline-state__spinner" /> Se încarcă utilizatorii...
          </p>
        )}

        {isProfilesError && (
          <p className="settings-inline-state settings-inline-state--error">
            <TriangleAlert aria-hidden="true" size={14} />
            Utilizatorii nu au putut fi încărcați{profilesError instanceof Error ? `: ${profilesError.message}` : '.'}
          </p>
        )}

        {!isProfilesLoading && !isProfilesError && (
          <table className="settings-users-table">
            <thead>
              <tr>
                <th>Nume</th>
                <th>Rol</th>
                <th>Activ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.full_name ?? '—'}</td>
                  <td>
                    <select
                      value={profile.role}
                      disabled={isSelf(profile) || updateProfileMutation.isPending}
                      onChange={(e) => updateProfileMutation.mutate({ profile_id: profile.id, role: e.target.value })}
                    >
                      <option value="operator">Operator</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td>{profile.active ? 'Da' : 'Nu'}</td>
                  <td>
                    <button
                      type="button"
                      disabled={isSelf(profile) || updateProfileMutation.isPending}
                      title={isSelf(profile) ? 'Nu vă puteți dezactiva propriul cont' : undefined}
                      onClick={() => updateProfileMutation.mutate({ profile_id: profile.id, active: !profile.active })}
                    >
                      {profile.active ? 'Dezactivează' : 'Activează'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {updateProfileMutation.isError && (
          <p className="settings-inline-state settings-inline-state--error">
            {updateProfileMutation.error instanceof Error ? updateProfileMutation.error.message : 'Actualizarea utilizatorului a eșuat.'}
          </p>
        )}
      </section>
    </div>
  )
}
