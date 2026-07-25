import { useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { AuthContext, type AuthContextValue, type UserRole } from './AuthContext'

async function fetchRole(userId: string): Promise<UserRole | null> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()

  return (data?.role as UserRole | undefined) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function syncSession(nextSession: Session | null) {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (!nextSession?.user) {
        setRole(null)
        return
      }

      const nextRole = await fetchRole(nextSession.user.id)
      if (active) {
        setRole(nextRole)
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

  const value: AuthContextValue = { user, session, role, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
