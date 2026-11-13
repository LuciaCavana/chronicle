
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CircleUserRound, LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { authService } from '../../services/authService'
import '../../styles/Header.css'

type HeaderProps = {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const email = session?.user.email ?? ''
  const initial = email.charAt(0).toUpperCase() || '?'

  async function handleLogout() {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const { error: logoutError } = await authService.logout()

      if (logoutError) {
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
    <header className="app-header">
      <div className="app-header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="app-header-actions">
        {error && (
          <span className="app-header-error" role="alert">
            {error}
          </span>
        )}

        <button
          type="button"
          className="app-header-icon-button"
          title="Notificaciones (próximamente)"
          aria-label="Notificaciones (próximamente)"
          disabled
        >
          <Bell size={21} />
        </button>

        <div className="app-header-profile">
          <button
            type="button"
            className="app-header-avatar"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú de usuario"
          >
            {initial}
          </button>

          {menuOpen && (
            <div className="app-header-dropdown">
              <div className="app-header-user">
                <CircleUserRound size={20} />
                <span>{email}</span>
              </div>

              <div className="app-header-dropdown-divider" />

              <button type="button" onClick={() => { setMenuOpen(false); navigate("/perfil") }}>
                <UserRound size={17} />
                Mi perfil
              </button>

              <button type="button" onClick={() => { setMenuOpen(false); navigate("/configuracion") }}>
                <Settings size={17} />
                Configuración
              </button>

              <div className="app-header-dropdown-divider" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut size={17} />
                {loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
