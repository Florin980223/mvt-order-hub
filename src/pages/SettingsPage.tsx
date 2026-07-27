import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/auth/useAuth'
import { useMailConnectionQuery } from '../lib/settings/useMailConnectionQuery'
import { useOutboundApiQuery } from '../lib/settings/useOutboundApiQuery'
import { useConfidenceThresholdQuery } from '../lib/settings/useConfidenceThresholdQuery'
import { useProfilesQuery, type ProfileRow } from '../lib/settings/useProfilesQuery'
import { formatConnectionStatus } from '../lib/settings/format'
import { formatDateTime } from '../lib/emails/format'

const CONNECTABLE_STATUSES = ['disconnected', 'error']

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

function isValidPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
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

  const {
    data: outboundApi,
    isLoading: isOutboundApiLoading,
    isError: isOutboundApiError,
    error: outboundApiError,
  } = useOutboundApiQuery()

  const [urlInput, setUrlInput] = useState<string | null>(null)

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
    },
  })

  const currentUrl = outboundApi?.value_json.url ?? ''
  const resolvedUrl = urlInput ?? currentUrl
  const isUrlValid = isValidHttpUrl(resolvedUrl)
  const saveDisabled = !isUrlValid || resolvedUrl === currentUrl || updateOutboundApiMutation.isPending

  const {
    data: confidenceThresholdSetting,
    isLoading: isConfidenceThresholdLoading,
    isError: isConfidenceThresholdError,
    error: confidenceThresholdError,
  } = useConfidenceThresholdQuery()

  const [thresholdPercentInput, setThresholdPercentInput] = useState<number | null>(null)

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
  const resolvedThresholdPercent = thresholdPercentInput ?? currentThresholdPercent
  const isThresholdValid = isValidPercent(resolvedThresholdPercent)
  const thresholdSaveDisabled =
    !isThresholdValid || resolvedThresholdPercent === currentThresholdPercent || updateConfidenceThresholdMutation.isPending

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
    <div>
      <h1>Setări</h1>

      <section>
        <h2>Conectare Outlook</h2>

        {isLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă starea conexiunii...
          </p>
        )}

        {isError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Starea conexiunii nu a putut fi încărcată
            {error instanceof Error ? `: ${error.message}` : '.'}
          </p>
        )}

        {!isLoading && !isError && (
          <>
            <p>
              Status: {formatConnectionStatus(connection?.status ?? 'disconnected')}
              {connection && (
                <>
                  {' — '}
                  {connection.mailbox_address}
                </>
              )}
            </p>
            {connection?.last_sync_at && <p>Ultima sincronizare: {formatDateTime(connection.last_sync_at)}</p>}

            <button type="button" onClick={() => startMutation.mutate()} disabled={connectDisabled}>
              {startMutation.isPending ? 'Se deschide Microsoft...' : 'Conectează Outlook'}
            </button>
            <button type="button" onClick={() => refetch()}>
              <RefreshCw aria-hidden="true" size={16} />
              Reîmprospătează
            </button>

            {startMutation.isError && (
              <p role="alert">
                {startMutation.error instanceof Error ? startMutation.error.message : 'Conectarea a eșuat.'}
              </p>
            )}
          </>
        )}
      </section>

      <section>
        <h2>API extern</h2>

        {isOutboundApiLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă configurația API extern...
          </p>
        )}

        {isOutboundApiError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Configurația nu a putut fi încărcată
            {outboundApiError instanceof Error ? `: ${outboundApiError.message}` : '.'}
          </p>
        )}

        {!isOutboundApiLoading && !isOutboundApiError && (
          <>
            <label htmlFor="outbound-api-url">URL API extern</label>
            <input
              id="outbound-api-url"
              type="text"
              value={resolvedUrl}
              onChange={(e) => setUrlInput(e.target.value)}
            />

            <button
              type="button"
              onClick={() => updateOutboundApiMutation.mutate(resolvedUrl)}
              disabled={saveDisabled}
            >
              {updateOutboundApiMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </button>

            {resolvedUrl !== '' && !isUrlValid && <p role="alert">URL invalid.</p>}

            {updateOutboundApiMutation.isError && (
              <p role="alert">
                {updateOutboundApiMutation.error instanceof Error
                  ? updateOutboundApiMutation.error.message
                  : 'Salvarea a eșuat.'}
              </p>
            )}

            {updateOutboundApiMutation.isSuccess && <p>Salvat.</p>}
          </>
        )}
      </section>

      <section>
        <h2>Prag de încredere</h2>

        {isConfidenceThresholdLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă pragul de încredere...
          </p>
        )}

        {isConfidenceThresholdError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Pragul nu a putut fi încărcat
            {confidenceThresholdError instanceof Error ? `: ${confidenceThresholdError.message}` : '.'}
          </p>
        )}

        {!isConfidenceThresholdLoading && !isConfidenceThresholdError && (
          <>
            <label htmlFor="confidence-threshold">Prag minim de încredere pentru import (%)</label>
            <input
              id="confidence-threshold"
              type="number"
              min={0}
              max={100}
              value={resolvedThresholdPercent}
              onChange={(e) => setThresholdPercentInput(e.target.valueAsNumber)}
            />

            <button
              type="button"
              onClick={() => updateConfidenceThresholdMutation.mutate(resolvedThresholdPercent / 100)}
              disabled={thresholdSaveDisabled}
            >
              {updateConfidenceThresholdMutation.isPending ? 'Se salvează...' : 'Salvează'}
            </button>

            {!isThresholdValid && <p role="alert">Valoare invalidă — introduceți un număr între 0 și 100.</p>}

            {updateConfidenceThresholdMutation.isError && (
              <p role="alert">
                {updateConfidenceThresholdMutation.error instanceof Error
                  ? updateConfidenceThresholdMutation.error.message
                  : 'Salvarea a eșuat.'}
              </p>
            )}

            {updateConfidenceThresholdMutation.isSuccess && <p>Salvat.</p>}
          </>
        )}
      </section>

      <section>
        <h2>Utilizatori</h2>

        {isProfilesLoading && (
          <p>
            <Loader2 aria-hidden="true" size={16} /> Se încarcă utilizatorii...
          </p>
        )}

        {isProfilesError && (
          <p>
            <TriangleAlert aria-hidden="true" size={16} /> Utilizatorii nu au putut fi încărcați
            {profilesError instanceof Error ? `: ${profilesError.message}` : '.'}
          </p>
        )}

        {!isProfilesLoading && !isProfilesError && (
          <table>
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
                      onChange={(e) =>
                        updateProfileMutation.mutate({ profile_id: profile.id, role: e.target.value })
                      }
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
                      onClick={() =>
                        updateProfileMutation.mutate({ profile_id: profile.id, active: !profile.active })
                      }
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
          <p role="alert">
            {updateProfileMutation.error instanceof Error
              ? updateProfileMutation.error.message
              : 'Actualizarea utilizatorului a eșuat.'}
          </p>
        )}
      </section>
    </div>
  )
}
