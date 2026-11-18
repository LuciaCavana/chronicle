import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Backpack, BookOpen, ClipboardCheck, House, PanelLeftClose, PanelLeftOpen, ScrollText, ShieldCheck, UsersRound, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'
import { seccionActual, type SeccionMenu } from '../../lib/navegacion'
import { usePendientesRevision } from '../../hooks/usePendientesRevision'
import '../../styles/layout/Sidebar.css'

const CLAVE_FIJADO = 'chronicle.menuFijado'

function leerFijado(): boolean {
  try { return localStorage.getItem(CLAVE_FIJADO) !== 'false' } catch { return true }
}

type Props = { mobileOpen?: boolean; onNavigate?: () => void; onCloseMobile?: () => void }

export default function Sidebar({ mobileOpen = false, onNavigate, onCloseMobile }: Props) {
  const { t } = useLanguage()
  const { role } = useAuth()
  const { pathname, search } = useLocation()
  const [fijado, setFijado] = useState(leerFijado)
  const esAdmin = role === 'creator' || role === 'admin'
  const pendientes = usePendientesRevision(esAdmin, pathname + search)
  const actual = seccionActual(pathname, search)
  const enBiblioteca = actual === 'biblioteca' || actual === 'libros' || actual === 'clases' || actual === 'conjuros'

  useEffect(() => {
    try { localStorage.setItem(CLAVE_FIJADO, String(fijado)) } catch { /* Almacenamiento no disponible */ }
  }, [fijado])

  const enlace = (seccion: SeccionMenu, ruta: string, etiqueta: TranslationKey, Icono: LucideIcon, extra?: ReactNode) => {
    const activo = actual === seccion
    return <Link to={ruta} onClick={onNavigate} className={`sidebar-item${activo ? ' sidebar-item--activo' : ''}`} aria-current={activo ? 'page' : undefined}>
      <Icono className="sidebar-icono" size={20} strokeWidth={1.8} aria-hidden="true"/>
      <span className="sidebar-texto">{t(etiqueta)}</span>
      {extra}
      <span className="sidebar-flotante" aria-hidden="true">{t(etiqueta)}</span>
    </Link>
  }

  const pronto = (etiqueta: TranslationKey, Icono: LucideIcon) =>
    <span className="sidebar-item sidebar-item--pronto" aria-disabled="true">
      <Icono className="sidebar-icono" size={20} strokeWidth={1.8} aria-hidden="true"/>
      <span className="sidebar-texto">{t(etiqueta)}</span>
      <span className="sidebar-pronto">{t('sidebar.soon')}</span>
      <span className="sidebar-flotante" aria-hidden="true">{t(etiqueta)} · {t('sidebar.soon').toLowerCase()}</span>
    </span>

  const subitem = (seccion: SeccionMenu, ruta: string, etiqueta: TranslationKey) =>
    <Link to={ruta} onClick={onNavigate} className={`sidebar-subitem${actual === seccion ? ' sidebar-subitem--activo' : ''}`} aria-current={actual === seccion ? 'page' : undefined}>{t(etiqueta)}</Link>

  const insignia = pendientes > 0
    ? <span className="sidebar-insignia" aria-label={`${pendientes} ${t('sidebar.pending')}`}>{pendientes > 99 ? '99+' : pendientes}</span>
    : null

  return (
    <aside className={`sidebar${fijado ? '' : ' sidebar--riel'}${mobileOpen ? ' sidebar--movil-abierto' : ''}`}>
      <div className="sidebar-cabecera">
        <Link to="/home" onClick={onNavigate} className="sidebar-marca" aria-label={t('sidebar.home.aria')}>
          <span className="sidebar-monograma" aria-hidden="true">C</span>
          <span className="sidebar-nombre">CHRONICLE</span>
        </Link>
        <button type="button" className="sidebar-cerrar-movil" aria-label={t('nav.closeMenu')} onClick={onCloseMobile}><X size={20} aria-hidden="true"/></button>
      </div>

      <nav className="sidebar-nav" aria-label={t('sidebar.menu')}>
        {enlace('inicio', '/home', 'sidebar.home', House)}

        <div className="sidebar-grupo">{t('sidebar.content')}</div>
        <div className="sidebar-bloque">
          <Link to="/biblioteca" onClick={onNavigate} className={`sidebar-item${enBiblioteca ? ' sidebar-item--activo' : ''}`} aria-current={actual === 'biblioteca' ? 'page' : undefined}>
            <BookOpen className="sidebar-icono" size={20} strokeWidth={1.8} aria-hidden="true"/>
            <span className="sidebar-texto">{t('sidebar.library')}</span>
          </Link>
          <div className="sidebar-subitems">
            <span className="sidebar-subitems-titulo">{t('sidebar.library')}</span>
            {subitem('libros', '/biblioteca/libros', 'sidebar.books')}
            {subitem('clases', '/biblioteca/clases', 'sidebar.classes')}
            {subitem('conjuros', '/biblioteca/conjuros', 'sidebar.spells')}
          </div>
        </div>

        <div className="sidebar-grupo">{t('sidebar.game')}</div>
        {pronto('sidebar.characters', UsersRound)}
        {pronto('sidebar.campaigns', ScrollText)}
        {pronto('sidebar.inventory', Backpack)}

        {esAdmin && <>
          <div className="sidebar-grupo">{t('sidebar.management')}</div>
          {enlace('revision', '/biblioteca/libros?tab=administracion', 'sidebar.review', ClipboardCheck, insignia)}
          {enlace('administracion', '/administracion', 'sidebar.admin', ShieldCheck)}
        </>}
      </nav>

      <div className="sidebar-pie">
        <button type="button" className="sidebar-fijar" onClick={() => setFijado(!fijado)} aria-label={t(fijado ? 'sidebar.collapse' : 'sidebar.pin')} title={t(fijado ? 'sidebar.collapse' : 'sidebar.pin')}>
          {fijado ? <PanelLeftClose size={20} aria-hidden="true"/> : <PanelLeftOpen size={20} aria-hidden="true"/>}
          <span className="sidebar-texto">{t('sidebar.collapse')}</span>
        </button>
      </div>
    </aside>
  )
}
