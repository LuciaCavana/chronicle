import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout'
import { useAuth } from '../../contexts/useAuth'
import { authService } from '../../services/authService'
import { FaDiscord } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'


export default function Login() {
  const { session } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')
    setLoading(true)

    try {
      const { error: authError } = await authService.login(
        email,
        password
      )

      if (authError) {
        setError(
          'Correo o contraseña incorrectos, o cuenta no confirmada.'
        )
        return
      }

      setPassword('')
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return <Navigate to="/home" replace />
  }

async function handleGoogleLogin() {
  setError('')

  try {
    const { error: authError } =
      await authService.loginWithGoogle()

    if (authError) {
      setError('No se pudo iniciar sesión con Google.')
    }
  } catch {
    setError('No se pudo conectar con Google.')
  }
}
async function handleDiscordLogin() {
  setError('')

  try {
    const { error: authError } =
      await authService.loginWithDiscord()

    if (authError) {
      setError('No se pudo iniciar sesión con Discord.')
    }
  } catch {
    setError('No se pudo conectar con Discord.')
  }
}

  return (
    <AuthLayout>
      <form onSubmit={handleLogin}>
        <h2>Iniciar sesión</h2>
        
      


        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <div className="mensaje error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
                  
    <div className="social-login">
      <button
        type="button"
        className="discord-login-button"
        onClick={handleDiscordLogin}
        aria-label="Iniciar sesión con Discord"
      >
        <FaDiscord size={28} />
      </button>

      <button
        type="button"
        className="google-login-button"
        onClick={handleGoogleLogin}
        aria-label="Iniciar sesión con Google"
      >
        <FcGoogle size={28} />
      </button>
    </div>
        

        <div className="auth-links">
          <Link to="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>

          <p>
            ¿No tenés una cuenta?{' '}
            <Link to="/register">
              Crear cuenta
            </Link>
          </p>
        </div>

      </form>
    </AuthLayout>
  )
}
