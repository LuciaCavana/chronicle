
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/auth/AuthLayout'
import { authService } from '../../services/authService'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')
    setMensaje('')
    setLoading(true)

    try {
      const { error: authError } =
        await authService.forgotPassword(email)

        if (authError) {
        console.error('Error de recuperación:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
      })

      setError(
        'No se pudo procesar la solicitud. Intentá nuevamente más tarde.'
      )
      return
    }

      setMensaje(
        'Si existe una cuenta asociada a ese correo, recibirás un enlace para recuperar tu contraseña.'
      )
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit}>
        <h2>Recuperar contraseña</h2>

        <p>
          Ingresá tu correo electrónico y te enviaremos
          un enlace para restablecer tu contraseña.
        </p>

        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
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
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>

        <Link className="auth-link" to="/login">
          Volver al inicio de sesión
        </Link>
      </form>
    </AuthLayout>
  )
}
