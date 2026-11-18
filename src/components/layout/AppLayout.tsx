
import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import '../../styles/layout/AppLayout.css'

type AppLayoutProps = {
  children: ReactNode
  title: string
  subtitle?: string
  /** Destino del enlace de regreso de la cabecera, si debe ser distinto del de la ruta (por ejemplo, conservar una pestaña). */
  volverA?: string
}

export default function AppLayout({
  children,
  title,
  subtitle,
  volverA,
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="app-layout">
      {mobileMenuOpen && <button className="app-mobile-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar mobileOpen={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="app-layout-main">
        <Header title={title} subtitle={subtitle} volverA={volverA} onOpenMenu={() => setMobileMenuOpen(true)} />

        <main className="app-layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
