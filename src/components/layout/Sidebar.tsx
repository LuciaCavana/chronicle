
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../../styles/Sidebar.css'

const menuItems = [
  { label: 'Inicio', icon: '⌂', path: '/home' },
  { label: 'Personajes', icon: '♙', path: '/personajes' },
  { label: 'Campañas', icon: '⚑', path: '/campanas' },
  { label: 'Biblioteca', icon: '▤', path: '/biblioteca' },
  { label: 'Inventario', icon: '◇', path: '/inventario' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
    >
      <div className="sidebar-header">
        {!collapsed && (
          <span className="sidebar-brand">CHRONICLE</span>
        )}

        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={
            collapsed ? 'Expandir menú' : 'Contraer menú'
          }
          aria-expanded={!collapsed}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Menú principal">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-icon" aria-hidden="true">
              {item.icon}
            </span>

            {!collapsed && (
              <span className="sidebar-label">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
