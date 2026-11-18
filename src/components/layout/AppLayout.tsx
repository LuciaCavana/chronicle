
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
  /** Reemplaza la miga anterior a la página actual (texto y destino), por ejemplo para volver a la revisión. */
  migaAnterior?: { texto: string; ruta: string }
}

export default function AppLayout({
  children,
  title,
  subtitle,
  volverA,
  migaAnterior,
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="app-layout">
      {mobileMenuOpen && <button className="app-mobile-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />}
      <Sidebar mobileOpen={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="app-layout-main">
        <Header title={title} subtitle={subtitle} volverA={volverA} migaAnterior={migaAnterior} onOpenMenu={() => setMobileMenuOpen(true)} />

        <main className="app-layout-content">
          {children}
        </main>
      </div>
    </div>
  )
}
