
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout'
import { useAuth } from '../../contexts/useAuth'
import { authService } from '../../services/authService'

export default function ResetPassword() {
  const {
  session,
  loading: verificando,
  isPasswordRecovery,
  finishPasswordRecovery,
  } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || !session || !isPasswordRecovery) return

    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const { error: authError } =
        await authService.updatePassword(password)

      if (authError) {
        setError('No se pudo actualizar la contraseña.')
        return
      }
      finishPasswordRecovery()
      const { error: logoutError } =
        await authService.logout()

      if (logoutError) {
        setError(
          'Contraseña actualizada, pero no se pudo cerrar la sesión.'
        )
        return
      }

      navigate('/login', { replace: true })
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (verificando) {
    return (
      <AuthLayout>
        <p>Verificando enlace...</p>
      </AuthLayout>
    )
  }
if (session && !isPasswordRecovery) {
  return (
    <AuthLayout>
      <h2>Enlace de recuperación no reconocido</h2>
      <p>
        No se pudo confirmar que esta sesión provenga
        de un enlace de recuperación de contraseña.
      </p>
      <Link className="auth-link" to="/forgot-password">
        Solicitar otro enlace
      </Link>
    </AuthLayout>
  )
}

  if (!session) {
    return (
      <AuthLayout>
        <h2>Enlace no disponible</h2>
        <p>
          El enlace es inválido, expiró o ya fue utilizado.
          Solicitá uno nuevo.
        </p>

        <Link className="auth-link" to="/forgot-password">
          Solicitar otro enlace
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit}>
        <h2>Nueva contraseña</h2>

        <label htmlFor="password">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirmPassword">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && (
          <div className="mensaje error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Actualizando...' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  )
}
