import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useMailConnectionQuery } from '../lib/settings/useMailConnectionQuery'
import { formatConnectionStatus } from '../lib/settings/format'
import { formatDateTime } from '../lib/emails/format'

const CONNECTABLE_STATUSES = ['disconnected', 'error']

interface OutlookOauthStartResult {
  authorize_url: string
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
    </div>
  )
}
