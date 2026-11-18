import { NavLink } from 'react-router-dom'
import { ClipboardCheck, UsersRound } from 'lucide-react'
import { usePendientesRevision } from '../../hooks/usePendientesRevision'
import '../../styles/administracion/NavAdministracion.css'

/** Pestañas de Administración: usuarios y permisos, y revisión de libros. */
export default function NavAdministracion() {
  const pendientes = usePendientesRevision(true)
  return (
    <nav className="admin-nav" aria-label="Secciones de administración">
      <NavLink end to="/administracion" className={({ isActive }) => `admin-nav-tab${isActive ? ' admin-nav-tab--activa' : ''}`}>
        <UsersRound size={18} aria-hidden="true" />Usuarios y permisos
      </NavLink>
      <NavLink to="/administracion/revision" className={({ isActive }) => `admin-nav-tab${isActive ? ' admin-nav-tab--activa' : ''}`}>
        <ClipboardCheck size={18} aria-hidden="true" />Revisión de libros
        {pendientes > 0 && <span className="admin-nav-insignia" aria-label={`${pendientes} pendientes`}>{pendientes > 99 ? '99+' : pendientes}</span>}
      </NavLink>
    </nav>
  )
}
