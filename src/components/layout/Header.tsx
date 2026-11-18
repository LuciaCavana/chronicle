import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, Globe, LogOut, Menu, SlidersHorizontal, UserRound } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { authService } from '../../services/authService'
import { usePerfilSesion } from '../../hooks/usePerfilSesion'
import { useLanguage } from '../../i18n/useLanguage'
import { migasDeRuta } from '../../lib/navegacion'
import '../../styles/layout/Header.css'

type HeaderProps = {
  title: string
  subtitle?: string
  volverA?: string
  onOpenMenu?: () => void
}

export default function Header({ title, subtitle, volverA, onOpenMenu }: HeaderProps) {
  const { session, role } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const contenedorPerfil = useRef<HTMLDivElement>(null)

  const email = session?.user.email ?? ''
  const userId = session?.user.id
  const datos = usePerfilSesion(userId)
  const nombre = datos?.nombre || email.split('@')[0] || ''
  const inicial = (nombre.charAt(0) || email.charAt(0) || '?').toUpperCase()
  const etiquetaRol = role === 'admin' ? t('role.admin') : role === 'creator' ? t('role.creator') : ''
  const migas = migasDeRuta(pathname, search)
  const anterior = migas.length > 1 ? migas[migas.length - 2] : null
  const rutaAnterior = volverA ?? anterior?.ruta

  useEffect(() => {
    if (!menuOpen) return
    const fuera = (evento: MouseEvent) => {
      if (contenedorPerfil.current && !contenedorPerfil.current.contains(evento.target as Node)) setMenuOpen(false)
    }
    const tecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla) }
  }, [menuOpen])

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

  const avatar = (clase: string) => <span className={`app-avatar ${clase}`} aria-hidden="true">
    {datos?.avatar ? <img src={datos.avatar} alt="" className="app-avatar-img" /> : inicial}
  </span>

  return (
    <header className="app-header">
      <button type="button" className="app-header-mobile-menu" aria-label={t('nav.openMenu')} onClick={onOpenMenu}><Menu size={22} aria-hidden="true" /></button>

      <div className="app-header-title">
        {migas.length > 1 && <nav className="app-header-migas" aria-label={t('nav.breadcrumb')}>
          <ol>
            {migas.map((miga, i) => {
              const ultima = i === migas.length - 1
              return <li key={`${miga.etiqueta}-${i}`}>
                {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
                {ultima || !miga.ruta ? <span aria-current={ultima ? 'page' : undefined}>{t(miga.etiqueta)}</span> : <Link to={i === migas.length - 2 && volverA ? volverA : miga.ruta}>{t(miga.etiqueta)}</Link>}
              </li>
            })}
          </ol>
        </nav>}
        {anterior && rutaAnterior && <Link className="app-header-volver" to={rutaAnterior} aria-label={`${t('nav.back')} ${t(anterior.etiqueta)}`}><ChevronLeft size={14} aria-hidden="true" />{t(anterior.etiqueta)}</Link>}
        <h1>{title}</h1>
        {migas.length <= 1 && subtitle && <p>{subtitle}</p>}
      </div>

      <div className="app-header-actions">
        {error && <span className="app-header-error" role="alert">{error}</span>}

        <div className="app-header-profile" ref={contenedorPerfil}>
          <button type="button" className={`app-header-perfil${menuOpen ? ' app-header-perfil--abierto' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label={t('nav.userMenu')}>
            {avatar('app-avatar--chico')}
            <span className="app-header-perfil-datos">
              <span className="app-header-perfil-nombre">{nombre}</span>
              {etiquetaRol && <span className="app-header-perfil-rol">{etiquetaRol}</span>}
            </span>
            <ChevronDown className="app-header-perfil-flecha" size={16} aria-hidden="true" />
          </button>

          {menuOpen && <>
            <button type="button" className="app-header-fondo" aria-label={t('nav.closeMenu')} onClick={() => setMenuOpen(false)} />
            <div className="app-header-dropdown" role="menu" aria-label={t('nav.userMenu')}>
              <span className="app-header-agarre" aria-hidden="true" />
              <div className="app-header-tarjeta">
                {avatar('app-avatar--grande')}
                <span className="app-header-tarjeta-datos">
                  <strong>{nombre}</strong>
                  <span>{email}</span>
                  {etiquetaRol && <span className="app-header-rol">{etiquetaRol}</span>}
                </span>
              </div>
              <div className="app-header-dropdown-divider" />
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/perfil') }}>
                <UserRound size={18} aria-hidden="true" />{t('nav.profile')}
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/configuracion') }}>
                <SlidersHorizontal size={18} aria-hidden="true" />{t('nav.settings')}
              </button>
              <div className="app-header-idioma">
                <span><Globe size={18} aria-hidden="true" />{t('nav.language')}</span>
                <span className="app-header-idioma-opciones" role="group" aria-label={t('nav.language')}>
                  <button type="button" aria-pressed={language === 'es'} onClick={() => setLanguage('es')}>ES</button>
                  <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
                </span>
              </div>
              <div className="app-header-dropdown-divider" />
              <button type="button" role="menuitem" className="app-header-salir" onClick={handleLogout} disabled={loading}>
                <LogOut size={18} aria-hidden="true" />{loading ? t('nav.loggingOut') : t('nav.logout')}
              </button>
            </div>
          </>}
        </div>
      </div>
    </header>
  )
}
