
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { recuperacionDetectadaEnUrl, supabase } from '../lib/supabase'
import { AuthContext } from './useAuth'

const RECOVERY_KEY = 'chronicle_password_recovery'

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [rolCargado, setRolCargado] = useState<{
    userId: string
    role: 'creator' | 'admin' | 'user' | null
  } | null>(null)
  const userId = session?.user.id
  const rolVigente = userId && rolCargado?.userId === userId ? rolCargado : null
  const role = rolVigente?.role ?? null
  const roleLoading = loading || (Boolean(userId) && !rolVigente)

  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (recuperacionDetectadaEnUrl) {
      sessionStorage.setItem(RECOVERY_KEY, 'true')
      return true
    }
    return sessionStorage.getItem(RECOVERY_KEY) === 'true'
  })

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

  // El rol en React es solo para la interfaz; Supabase verifica permisos en cada RPC.
  useEffect(() => {
    if (loading || !userId) return
    let active = true
    void supabase.rpc('chronicle_mi_rol').then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('No se pudo cargar el rol de la sesión:', error.message)
        setRolCargado({ userId, role: null })
      } else {
        setRolCargado({ userId, role: data === 'creator' || data === 'admin' ? data : 'user' })
      }
    })
    return () => { active = false }
  }, [userId, loading])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        role,
        roleLoading,
        isPasswordRecovery,
        finishPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
