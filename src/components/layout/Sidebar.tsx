
import { useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import { NavLink } from 'react-router-dom'
import '../../styles/Sidebar.css'
import { useLanguage } from '../../i18n/LanguageContext'
import type { TranslationKey } from '../../i18n/translations'
import {
  House,
  UsersRound,
  ScrollText,
  BookOpen,
  Backpack,
  ShieldCheck,
} from 'lucide-react'



const menuItems: { label: TranslationKey; icon: typeof House; path: string }[] = [
  { label: 'sidebar.home', icon: House, path: '/home' },
  { label: 'sidebar.characters', icon: UsersRound, path: '/personajes' },
  { label: 'sidebar.campaigns', icon: ScrollText, path: '/campanas' },
  { label: 'sidebar.library', icon: BookOpen, path: '/biblioteca' },
  { label: 'sidebar.inventory', icon: Backpack, path: '/inventario' },
]

export default function Sidebar({ mobileOpen = false, onNavigate }: { mobileOpen?: boolean; onNavigate?: () => void }) {
  const [collapsed, setCollapsed] = useState(true)
  const { t } = useLanguage()
  // El rol viene del contexto de sesión; Supabase verifica los permisos reales.
  const { role } = useAuth()
  const esAdmin = role === 'creator' || role === 'admin'

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className="sidebar-header">
        {(!collapsed || mobileOpen) && (
          <span className="sidebar-brand">CHRONICLE</span>
        )}
      </div>

      <nav className="sidebar-nav" aria-label={t('sidebar.menu')}>
        {[...menuItems, ...(esAdmin ? [{ label: 'sidebar.admin', icon: ShieldCheck, path: '/administracion' }] : [])].map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              onClick={onNavigate}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
              title={collapsed && !mobileOpen ? t(item.label) : undefined}
            >
              <Icon
                className="sidebar-icon"
                size={22}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              {!collapsed && (
                <span className="sidebar-label">
                  {t(item.label)}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
