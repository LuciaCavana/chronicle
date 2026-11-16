
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
  const [role, setRole] = useState<'creator' | 'admin' | 'user' | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

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
    if (loading) return
    if (!session?.user.id) {
      setRole(null)
      setRoleLoading(false)
      return
    }
    let active = true
    setRoleLoading(true)
    setRole(null)
    void supabase.rpc('chronicle_mi_rol').then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('No se pudo cargar el rol de la sesión:', error.message)
        setRole(null)
      } else {
        setRole(data === 'creator' || data === 'admin' ? data : 'user')
      }
      setRoleLoading(false)
    })
    return () => { active = false }
  }, [session?.user.id, loading])

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
