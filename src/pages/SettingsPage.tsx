import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useMailConnectionQuery } from '../lib/settings/useMailConnectionQuery'
import { useOutboundApiQuery } from '../lib/settings/useOutboundApiQuery'
import { formatConnectionStatus } from '../lib/settings/format'
import { formatDateTime } from '../lib/emails/format'

const CONNECTABLE_STATUSES = ['disconnected', 'error']

interface OutlookOauthStartResult {
  authorize_url: string
}

interface UpdateOutboundApiResult {
  url: string
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
    </div>
  )
}
