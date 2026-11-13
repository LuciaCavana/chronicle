
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout'
import { useAuth } from '../../contexts/useAuth'
import { authService } from '../../services/authService'

export default function Register() {
  const { session } = useAuth()

  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')
    setMensaje('')

    const nombreLimpio = nombre.trim()

    if (!nombreLimpio || nombreLimpio.length > 80) {
      setError('El nombre debe tener entre 1 y 80 caracteres.')
      return
    }

    const usuarioLimpio = username.trim().toLowerCase()
    if (usuarioLimpio && !/^[a-z0-9_]{3,30}$/.test(usuarioLimpio)) {
      setError('El usuario debe tener entre 3 y 30 caracteres: letras minúsculas, números o guion bajo.')
      return
    }

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
      const { error: authError } = await authService.register(
        nombreLimpio,
        email,
        password,
        usuarioLimpio
      )

      if (authError) {
        setError(authError.message.includes('Database error') ? 'No se pudo crear el perfil. Es posible que el nombre de usuario ya esté ocupado.' : authError.message)
        return
      }

      setPassword('')
      setConfirmPassword('')
      setMensaje(
        'Solicitud recibida. Revisá tu correo para confirmar tu cuenta. Si ya tenés una cuenta, intentá iniciar sesión.'
      )
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return <Navigate to="/home" replace />
  }

  return (
    <AuthLayout>
      <form onSubmit={handleRegister}>
        <h2>Crear cuenta</h2>

        <label htmlFor="nombre">Nombre visible</label>
        <input
          id="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={80}
          autoComplete="nickname"
          required
        />

        <label htmlFor="username">Nombre de usuario (opcional)</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          maxLength={30}
          autoComplete="username"
          placeholder="Se genera automáticamente si lo dejás vacío"
        />

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

        {mensaje && (
          <div className="mensaje exito" role="status">
            {mensaje}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>

        <p>¿Ya tenés cuenta?</p>

        <Link className="auth-link" to="/login">
          Iniciar sesión
        </Link>
      </form>
    </AuthLayout>
  )
}
