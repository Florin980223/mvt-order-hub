import { useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { AuthContext, type AuthContextValue, type UserRole } from './AuthContext'

interface ProfileFetchResult {
  role: UserRole | null
  fullName: string | null
}

async function fetchProfile(userId: string): Promise<ProfileFetchResult> {
  const { data } = await supabase.from('profiles').select('role, full_name').eq('id', userId).single()

  return {
    role: (data?.role as UserRole | undefined) ?? null,
    fullName: data?.full_name ?? null,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function syncSession(nextSession: Session | null) {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (!nextSession?.user) {
        setRole(null)
        setFullName(null)
        return
      }

      const profile = await fetchProfile(nextSession.user.id)
      if (active) {
        setRole(profile.role)
        setFullName(profile.fullName)
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      await syncSession(data.session)
      if (active) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      void syncSession(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextValue = { user, session, role, fullName, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
