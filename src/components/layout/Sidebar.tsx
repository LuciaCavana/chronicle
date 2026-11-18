import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Backpack, BookOpen, ChevronDown, ClipboardCheck, House, ScrollText, ShieldCheck, UsersRound, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'
import { seccionActual, type SeccionMenu } from '../../lib/navegacion'
import { usePendientesRevision } from '../../hooks/usePendientesRevision'
import '../../styles/layout/Sidebar.css'
import logoMenu36 from '../../assets/logo-menu-36.png'
import logoMenu72 from '../../assets/logo-menu-72.png'
import logoMenu108 from '../../assets/logo-menu-108.png'

type Props = { mobileOpen?: boolean; onNavigate?: () => void; onCloseMobile?: () => void }

export default function Sidebar({ mobileOpen = false, onNavigate, onCloseMobile }: Props) {
  const { t } = useLanguage()
  const { role } = useAuth()
  const { pathname } = useLocation()
  const esAdmin = role === 'creator' || role === 'admin'
  const pendientes = usePendientesRevision(esAdmin)
  const actual = seccionActual(pathname)
  const enBiblioteca = actual === 'biblioteca' || actual === 'libros' || actual === 'clases' || actual === 'conjuros'

  const enlace = (seccion: SeccionMenu, ruta: string, etiqueta: TranslationKey, Icono: LucideIcon, extra?: ReactNode) => {
    const activo = actual === seccion
    return <Link to={ruta} onClick={onNavigate} className={`sidebar-item${activo ? ' sidebar-item--activo' : ''}`} aria-current={activo ? 'page' : undefined}>
      <Icono className="sidebar-icono" size={20} strokeWidth={1.8} aria-hidden="true"/>
      <span className="sidebar-texto">{t(etiqueta)}</span>
      {extra}
    </Link>
  }

  const pronto = (etiqueta: TranslationKey, Icono: LucideIcon) =>
    <span className="sidebar-item sidebar-item--pronto" aria-disabled="true">
      <Icono className="sidebar-icono" size={20} strokeWidth={1.8} aria-hidden="true"/>
      <span className="sidebar-texto">{t(etiqueta)}</span>
      <span className="sidebar-pronto">{t('sidebar.soon')}</span>
    </span>

  const subitem = (seccion: SeccionMenu, ruta: string, etiqueta: TranslationKey) =>
    <Link to={ruta} onClick={onNavigate} className={`sidebar-subitem${actual === seccion ? ' sidebar-subitem--activo' : ''}`} aria-current={actual === seccion ? 'page' : undefined}>{t(etiqueta)}</Link>

  const insignia = pendientes > 0
    ? <span className="sidebar-insignia" aria-label={`${pendientes} ${t('sidebar.pending')}`}>{pendientes > 99 ? '99+' : pendientes}</span>
    : null

  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar--movil-abierto' : ''}`}>
      <div className="sidebar-panel">
      <div className="sidebar-cabecera">
        <Link to="/home" onClick={onNavigate} className="sidebar-marca" aria-label={t('sidebar.home.aria')}>
          <span className="sidebar-monograma" aria-hidden="true"><img src={logoMenu36} srcSet={`${logoMenu36} 1x, ${logoMenu72} 2x, ${logoMenu108} 3x`} alt="" width={36} height={36} /></span>
          <span className="sidebar-nombre">CHRONICLE</span>
        </Link>
        <button type="button" className="sidebar-cerrar-movil" aria-label={t('nav.closeMenu')} onClick={onCloseMobile}><X size={20} aria-hidden="true"/></button>
      </div>

      <nav className="sidebar-nav" aria-label={t('sidebar.menu')}>
        {enlace('inicio', '/home', 'sidebar.home', House)}

        <div className="sidebar-grupo">{t('sidebar.content')}</div>
        {/* Los subítems se despliegan al pasar el mouse o con el teclado; quedan abiertos dentro de Biblioteca. */}
        <div className={`sidebar-bloque${enBiblioteca ? ' sidebar-bloque--abierto' : ''}`}>
          <Link to="/biblioteca" onClick={onNavigate} className={`sidebar-item${enBiblioteca ? ' sidebar-item--activo' : ''}`} aria-current={actual === 'biblioteca' ? 'page' : undefined}>
            <BookOpen className="sidebar-icono" size={20} strokeWidth={1.8} aria-hidden="true"/>
            <span className="sidebar-texto">{t('sidebar.library')}</span>
            <ChevronDown className="sidebar-flecha" size={16} strokeWidth={1.8} aria-hidden="true"/>
          </Link>
          <div className="sidebar-subitems">
            <div className="sidebar-subitems-lista">
              {subitem('libros', '/biblioteca/libros', 'sidebar.books')}
              {subitem('clases', '/biblioteca/clases', 'sidebar.classes')}
              {subitem('conjuros', '/biblioteca/conjuros', 'sidebar.spells')}
            </div>
          </div>
        </div>

        <div className="sidebar-grupo">{t('sidebar.game')}</div>
        {pronto('sidebar.characters', UsersRound)}
        {pronto('sidebar.campaigns', ScrollText)}
        {pronto('sidebar.inventory', Backpack)}

        {esAdmin && <>
          <div className="sidebar-grupo">{t('sidebar.management')}</div>
          {enlace('revision', '/administracion/revision', 'sidebar.review', ClipboardCheck, insignia)}
          {enlace('administracion', '/administracion', 'sidebar.admin', ShieldCheck)}
        </>}
      </nav>

      </div>
    </aside>
  )
}
