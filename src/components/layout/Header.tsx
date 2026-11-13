
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CircleUserRound, LogOut, Settings, UserRound, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { authService } from '../../services/authService'
import { supabase } from '../../lib/supabase'
import { EVENTO_AVATAR, urlAvatar, type AvatarPerfil } from '../../services/avatar'
import '../../styles/Header.css'

type HeaderProps = {
  title: string
  subtitle?: string
  onOpenMenu?: () => void
}

export default function Header({ title, subtitle, onOpenMenu }: HeaderProps) {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const email = session?.user.email ?? ''
  const initial = email.charAt(0).toUpperCase() || '?'
  const userId = session?.user.id
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) { setAvatar(null); return }
    let activo = true
    void supabase.from('profiles').select('avatar_url,avatar_source').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (activo) setAvatar(urlAvatar(data)) })
    const alCambiar = (evento: Event) => setAvatar(urlAvatar((evento as CustomEvent<AvatarPerfil>).detail))
    window.addEventListener(EVENTO_AVATAR, alCambiar)
    return () => { activo = false; window.removeEventListener(EVENTO_AVATAR, alCambiar) }
  }, [userId])

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
      <button type="button" className="app-header-mobile-menu" aria-label="Abrir menú" onClick={onOpenMenu}><Menu size={24} /></button>
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
            {avatar ? <img src={avatar} alt="" className="app-header-avatar-img" /> : initial}
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
