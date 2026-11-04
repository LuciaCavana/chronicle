
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { authService } from '../services/authService'
import AuthLayout from '../components/auth/AuthLayout'

export default function Home() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (loading) return

    setError('')
    setLoading(true)

    try {
      const { error: authError } = await authService.logout()

      if (authError) {
        setError('No se pudo cerrar la sesión.')
        return
      }

      navigate('/login', { replace: true })
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2>¡Bienvenido a Chronicle!</h2>

      <p>Sesión iniciada como:</p>
      <p>{session?.user.email}</p>

      {error && (
        <div className="mensaje error" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </AuthLayout>
  )
}
