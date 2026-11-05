
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'

const RECOVERY_KEY = 'chronicle_password_recovery'

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => sessionStorage.getItem(RECOVERY_KEY) === 'true'
  )

  function finishPasswordRecovery() {
    sessionStorage.removeItem(RECOVERY_KEY)
    setIsPasswordRecovery(false)
  }

  useEffect(() => {
    let active = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!active) return
console.log('[Chronicle Auth]', {
  event,
  path: window.location.pathname,
  hasSession: Boolean(newSession),
})
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem(RECOVERY_KEY, 'true')
          setIsPasswordRecovery(true)
        }

        if (event === 'SIGNED_OUT' || !newSession) {
          sessionStorage.removeItem(RECOVERY_KEY)
          setIsPasswordRecovery(false)
        }

        setSession(newSession)

        if (
          event === 'INITIAL_SESSION' ||
          event === 'PASSWORD_RECOVERY'
        ) {
          setLoading(false)
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isPasswordRecovery,
        finishPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
