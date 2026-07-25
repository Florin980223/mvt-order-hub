import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'operator'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  role: UserRole | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
