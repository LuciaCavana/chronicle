
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../../styles/Sidebar.css'
import {
  House,
  UsersRound,
  ScrollText,
  BookOpen,
  Backpack,
} from 'lucide-react'



const menuItems = [
  { label: 'Inicio', icon: House, path: '/home' },
  { label: 'Personajes', icon: UsersRound, path: '/personajes' },
  { label: 'Campañas', icon: ScrollText, path: '/campanas' },
  { label: 'Biblioteca', icon: BookOpen, path: '/biblioteca' },
  { label: 'Inventario', icon: Backpack, path: '/inventario' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className="sidebar-header">
        {!collapsed && (
          <span className="sidebar-brand">CHRONICLE</span>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Menú principal">
        {menuItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
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
