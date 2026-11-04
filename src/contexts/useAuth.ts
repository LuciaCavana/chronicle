
import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthContextType = {
  session: Session | null
  loading: boolean
  isPasswordRecovery: boolean
  finishPasswordRecovery: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider'
    )
  }

  return context
}
