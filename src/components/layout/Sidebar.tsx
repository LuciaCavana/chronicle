
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import { soyAdminMotor } from '../../services/chronicleLibros'
import { NavLink } from 'react-router-dom'
import '../../styles/Sidebar.css'
import {
  House,
  UsersRound,
  ScrollText,
  BookOpen,
  Backpack,
  ShieldCheck,
} from 'lucide-react'



const menuItems = [
  { label: 'Inicio', icon: House, path: '/home' },
  { label: 'Personajes', icon: UsersRound, path: '/personajes' },
  { label: 'Campañas', icon: ScrollText, path: '/campanas' },
  { label: 'Biblioteca', icon: BookOpen, path: '/biblioteca' },
  { label: 'Inventario', icon: Backpack, path: '/inventario' },
]

export default function Sidebar({ mobileOpen = false, onNavigate }: { mobileOpen?: boolean; onNavigate?: () => void }) {
  const [collapsed, setCollapsed] = useState(true)
  const { session } = useAuth()
  const [esAdmin, setEsAdmin] = useState(false)
  useEffect(() => {
    let activo = true
    setEsAdmin(false)
    if (session) void soyAdminMotor().then(valor => { if (activo) setEsAdmin(valor) }).catch(() => { if (activo) setEsAdmin(false) })
    return () => { activo = false }
  }, [session?.user.id])

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className="sidebar-header">
        {!collapsed && (
          <span className="sidebar-brand">CHRONICLE</span>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Menú principal">
        {[...menuItems, ...(esAdmin ? [{ label: 'Administración', icon: ShieldCheck, path: '/administracion' }] : [])].map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              onClick={onNavigate}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className="sidebar-icon"
                size={22}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              {!collapsed && (
                <span className="sidebar-label">
                  {item.label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
