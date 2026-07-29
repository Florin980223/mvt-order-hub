import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/auth/useAuth'
import { useProfilesQuery, type ProfileRow } from '../lib/settings/useProfilesQuery'
// .settings-card/.settings-users-table/.settings-inline-state are defined
// in SettingsPage.css — reused here rather than duplicated, same pattern
// DashboardPage.tsx already uses for EmailsPage.css/PendingOrdersPage.css.
import './SettingsPage.css'
import './UsersPage.css'

interface UpdateProfileResult {
  id: string
  full_name: string | null
  role: string
  active: boolean
}

/**
 * Extracted out of SettingsPage.tsx (Phase 7g-2) so "Gestionează
 * utilizatori" in the Securitate și Acces card can be a real navigation
 * link, matching figura6-setari.png's own button/chevron affordance —
 * not part of any brief mockup itself, so no figura reference for this
 * page's own layout beyond reusing the app's existing card conventions.
 */
export function UsersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles, isLoading, isError, error } = useProfilesQuery()

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
    <div className="users-page">
      <Link to="/settings" className="users-page__back">
        <ArrowLeft aria-hidden="true" size={16} />
        Înapoi la Setări
      </Link>
      <header className="users-page__header">
        <h1>Gestionează utilizatori</h1>
        <p className="users-page__subtitle">Rolurile și accesul utilizatorilor din aplicație.</p>
      </header>

      <section className="settings-card settings-card--users">
        {isLoading && (
          <p className="settings-inline-state">
            <Loader2 aria-hidden="true" size={14} className="settings-inline-state__spinner" /> Se încarcă utilizatorii...
          </p>
        )}

        {isError && (
          <p className="settings-inline-state settings-inline-state--error">
            <TriangleAlert aria-hidden="true" size={14} />
            Utilizatorii nu au putut fi încărcați{error instanceof Error ? `: ${error.message}` : '.'}
          </p>
        )}

        {!isLoading && !isError && (
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
